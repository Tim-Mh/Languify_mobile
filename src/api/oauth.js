import { Linking, Platform } from 'react-native'
import { appleAuth } from '@invertase/react-native-apple-authentication'
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin'
import InAppBrowser from 'react-native-inappbrowser-reborn'

import api, { API_URL, ApiError } from './client'
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../lib/env'
import { deviceTimezone } from '../lib/timezone'

/**
 * Google and Apple sign-in, through the platform SDKs.
 *
 * Both providers run their own native consent sheet on the device and hand back
 * a signed identity token, which goes to `POST /auth/{provider}/native` to be
 * verified and exchanged for a Sanctum token. That is better than a browser
 * round trip in every way that matters: no browser chrome, the account already
 * signed in on the device is offered without a password, and Apple's sheet is
 * the only presentation its guidelines accept.
 *
 * **The browser flow is still here, and still used**, for two cases the native
 * sheets do not cover:
 *
 *   - Apple sign-in on Android, which has no native sheet at all.
 *   - Google when no client id is configured, so a build without OAuth
 *     credentials still signs people in rather than failing at the tap.
 *
 * The Expo build also needed it because the Google SDK is a native module and
 * could not load in Expo Go. That reason is gone — every native module is
 * linked into this app — but the two above are not.
 *
 * Every path returns null when the learner backs out, which is a cancellation
 * rather than an error and must not be shown as one.
 */

/** In a standalone build this is the app's own scheme, registered natively. */
const REDIRECT_URI = 'languify://oauth'

let googleConfigured = false

function configureGoogle() {
  if (googleConfigured) return

  GoogleSignin.configure({
    // The *web* client ID, even on a phone. Google issues the id_token against
    // this one when it is passed as the web client, which is what the backend
    // checks the audience against.
    webClientId: GOOGLE_WEB_CLIENT_ID ?? undefined,
    iosClientId: GOOGLE_IOS_CLIENT_ID ?? undefined,
    // Without this the SDK returns a user but no id_token, and there is nothing
    // for the backend to verify.
    offlineAccess: false,
  })

  googleConfigured = true
}

/** Hands a verified identity token to the backend and returns the Sanctum token. */
async function exchange(provider, identityToken, extra = {}) {
  const data = await api.post(
    `/auth/${provider}/native`,
    {
      identityToken,
      timezone: deviceTimezone() ?? undefined,
      ...extra,
    },
    { auth: false },
  )

  if (!data?.token) {
    throw new ApiError('Sign-in finished but no session was returned.', { status: 0 })
  }

  return String(data.token)
}

async function signInWithGoogleNative() {
  configureGoogle()

  try {
    // Android only, and cheap: surfaces "no Play Services" as a real message
    // rather than an opaque failure deep inside the sign-in call.
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true })
    }

    // Clears the SDK's own cached session so the account chooser is always
    // shown. Without it, Google silently reuses whichever account signed in
    // last and there is no way to pick a different one — on a shared phone, or
    // for anyone with a personal and a work account, that is a dead end with no
    // visible cause. This only signs out of the Google SDK; it does not touch
    // our session.
    try {
      await GoogleSignin.signOut()
    } catch {
      // Nothing was signed in. Nothing to clear.
    }

    const result = await GoogleSignin.signIn()

    // v13+ returns { type, data }; older builds return the user object flat.
    if (result?.type === 'cancelled') return null

    const idToken = result?.data?.idToken ?? result?.idToken
    if (!idToken) {
      throw new ApiError('Google did not return an identity token.', { status: 0 })
    }

    return exchange('google', idToken)
  } catch (error) {
    if (
      error?.code === statusCodes?.SIGN_IN_CANCELLED ||
      error?.code === statusCodes?.IN_PROGRESS
    ) {
      return null
    }
    throw error
  }
}

async function signInWithAppleNative() {
  // Apple's SDK exists only on iOS. Everywhere else this is not an option at
  // all, and the caller falls back to the browser.
  if (Platform.OS !== 'ios') return undefined
  if (!appleAuth.isSupported) return undefined

  try {
    const credential = await appleAuth.performRequest({
      requestedOperation: appleAuth.Operation.LOGIN,
      requestedScopes: [appleAuth.Scope.FULL_NAME, appleAuth.Scope.EMAIL],
    })

    if (!credential?.identityToken) {
      throw new ApiError('Apple did not return an identity token.', { status: 0 })
    }

    // Apple sends the name once, on the very first authorization ever, and only
    // to the app — it is never in the token and never sent again. If it is not
    // captured here it is gone for good, so it travels with the exchange.
    const fullName = [credential.fullName?.givenName, credential.fullName?.familyName]
      .filter(Boolean)
      .join(' ')
      .trim()

    return exchange('apple', credential.identityToken, fullName ? { fullName } : {})
  } catch (error) {
    // The learner dismissed the sheet.
    if (error?.code === appleAuth.Error.CANCELED) return null
    throw error
  }
}

/**
 * The query string of a redirect URL, as a plain object.
 *
 * Hand-parsed rather than through `new URL()`: React Native's URL polyfill does
 * not implement `searchParams`, so reading them off it returns undefined and the
 * token silently goes missing. A custom scheme like `languify://oauth?token=…`
 * is also not something every URL parser agrees how to handle, whereas the query
 * string after the first `?` is unambiguous.
 */
function queryParams(url) {
  const query = String(url ?? '').split('?')[1]

  if (!query) return {}

  return query.split('&').reduce((params, pair) => {
    if (!pair) return params

    const [key, value = ''] = pair.split('=')

    params[decodeURIComponent(key)] = decodeURIComponent(value.replace(/\+/g, ' '))

    return params
  }, {})
}

/**
 * The browser round trip, for Apple on Android and for a build with no Google
 * client id.
 *
 * The consent screen has to open in a real browser rather than a webview:
 * Google blocks OAuth in embedded webviews outright, and it is also what lets
 * an already-signed-in system account skip the password step.
 *
 * `openAuth` is the Custom Tab / `ASWebAuthenticationSession` flow, which is the
 * one that closes itself when the page redirects to our scheme and hands the URL
 * back. A device with no browser that supports it falls back to handing the URL
 * to the system, where the redirect still reaches the app through the registered
 * scheme — the promise here simply cannot observe it, so that path reports a
 * cancellation rather than inventing a result.
 */
async function signInWithBrowser(provider) {
  const timezone = deviceTimezone()
  const query = [
    `appRedirect=${encodeURIComponent(REDIRECT_URI)}`,
    // Neither provider returns a timezone, and it drives every streak and
    // daily-reset boundary, so send the device's along for new accounts.
    timezone ? `timezone=${encodeURIComponent(timezone)}` : null,
  ]
    .filter(Boolean)
    .join('&')

  const url = `${API_URL}/auth/${provider}/redirect?${query}`

  let result

  if (await InAppBrowser.isAvailable()) {
    result = await InAppBrowser.openAuth(url, REDIRECT_URI, {
      // Dismiss as soon as the redirect lands rather than leaving the browser
      // sitting over the app while the token is exchanged.
      ephemeralWebSession: false,
      showTitle: false,
      enableUrlBarHiding: true,
      enableDefaultShare: false,
    })
  } else {
    await Linking.openURL(url)
    return null
  }

  if (result.type !== 'success' || !result.url) return null

  const params = queryParams(result.url)

  if (params.error) {
    throw new ApiError(
      provider === 'apple'
        ? 'Apple sign-in did not complete. Please try again.'
        : 'Google sign-in did not complete. Please try again.',
      { status: 0, payload: params },
    )
  }

  const token = params.token

  if (!token) {
    // The redirect came back without a token, which means the backend is not
    // running the mobile-aware callback yet.
    throw new ApiError('Sign-in finished but no session was returned.', { status: 0 })
  }

  return String(token)
}

/**
 * Signs in and returns the Sanctum token, or null if the learner backed out.
 *
 * Native first, browser second. The fallback is decided at call time rather
 * than at import because whether Google is configured is a property of the
 * build, not of the code.
 */
export async function signInWithProvider(provider) {
  if (provider === 'apple') {
    const token = await signInWithAppleNative()
    // `undefined` means there is no native sheet on this platform, as opposed
    // to `null`, which means there was one and it was dismissed.
    if (token !== undefined) return token

    return signInWithBrowser('apple')
  }

  if (GOOGLE_WEB_CLIENT_ID) return signInWithGoogleNative()

  return signInWithBrowser('google')
}
