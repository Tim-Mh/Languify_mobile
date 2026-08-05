import Config from 'react-native-config'

/**
 * Build-time configuration, read from `.env`.
 *
 * This replaces Expo's `process.env.EXPO_PUBLIC_*`, which Metro inlined at
 * bundle time. `react-native-config` does the same job for a bare project, but
 * it goes further than the JS bundle: Gradle and the Xcode build script both
 * read the same file, so the Google sign-in client id can also be dropped into
 * the native manifests from one place.
 *
 * The `EXPO_PUBLIC_` prefix is gone from the names — it only ever meant "safe
 * to inline into the bundle", which is now the plain fact of every value here.
 * None of these are secrets: they ship inside the app and can be read out of
 * it, which is why the backend verifies identity tokens itself rather than
 * trusting anything the client claims.
 *
 * Every value is optional. Unset means production for the API, and means "fall
 * back to the browser redirect flow" for the Google ids.
 */

/** Where the backend lives. Unset in a release build, which is the point. */
export const API_URL_OVERRIDE = Config.API_URL || null

/** The web app's origin, which Stripe checkout returns to. */
export const WEB_URL_OVERRIDE = Config.WEB_URL || null

/**
 * The *web* OAuth client ID, even on a phone: that is the audience Google
 * stamps into the id_token, and it is what the backend verifies against.
 */
export const GOOGLE_WEB_CLIENT_ID = Config.GOOGLE_WEB_CLIENT_ID || null

export const GOOGLE_IOS_CLIENT_ID = Config.GOOGLE_IOS_CLIENT_ID || null
