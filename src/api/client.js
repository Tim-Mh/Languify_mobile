import { NativeModules } from 'react-native'

import { API_URL_OVERRIDE } from '../lib/env'
import { reportSessionExpired } from '../lib/sessionEvents'
import { getToken } from '../session'

/**
 * Where the API lives. Set API_URL in `.env` to point a dev build at a local
 * backend; without it we fall back to production, which is what a release build
 * should always use.
 *
 * `localhost` is the device itself on Android, so a bare localhost URL in dev
 * silently fails there. The Android emulator reaches the host machine on
 * 10.0.2.2, and a physical device needs the machine's LAN IP — which is exactly
 * the address Metro is already being served from, so it can be read back off
 * the bundle URL.
 */
function resolveBaseUrl() {
  if (!API_URL_OVERRIDE) return 'https://api.languify.us/api'

  return reachableUrl(API_URL_OVERRIDE)
}

/**
 * The port the local backend is on, read from the configured API URL. Null in
 * production, where the API is on the default port and there is nothing to fix.
 */
function devApiPort() {
  const match = /^https?:\/\/[^/:]+:(\d+)/.exec(API_URL_OVERRIDE ?? '')
  return match ? match[1] : null
}

/**
 * The host serving the JS bundle, or null in a release build.
 *
 * The Expo build read this from `Constants.expoConfig.hostUri`. There is no
 * manifest here, but there is something better: React Native hands the native
 * side the URL it loaded the bundle from, and in development that is Metro on
 * the development machine — the LAN IP for a physical device, `10.0.2.2` for
 * the Android emulator, `localhost` for the iOS simulator. Each of those is
 * already the right answer for that device.
 *
 * A release build has a `file://` scriptURL with no host, which is what makes
 * this return null and leaves production URLs untouched.
 */
function devServerHost() {
  const scriptURL = NativeModules.SourceCode?.getConstants?.().scriptURL

  if (typeof scriptURL !== 'string') return null

  const match = /^https?:\/\/([^/:]+)/.exec(scriptURL)

  return match ? match[1] : null
}

/**
 * The same URL, with a loopback host swapped for one the device can actually
 * reach.
 *
 * `localhost` is the phone itself, so any absolute URL the backend builds from a
 * development `APP_URL` — uploaded images, most visibly — points at nothing.
 *
 * A loopback URL with no port gets the backend's port too. `APP_URL=http://localhost`
 * is the natural thing to have in a local `.env`, and it yields asset URLs on
 * port 80 while the backend is on 8123, so the host fix alone still leaves every
 * uploaded image broken on the device. Scoped to URLs we already decided were
 * loopback, so a production URL is never touched.
 *
 * Exported because the backend hands back absolute URLs in payloads too, not
 * just in the API base, and every one of them has this problem.
 */
export function reachableUrl(url) {
  if (!url) return url

  const loopback = /^(https?:\/\/)(localhost|127\.0\.0\.1)(:(\d+))?(?=[/?#]|$)/.exec(url)
  if (!loopback) return url

  const host = devServerHost()
  if (!host) return url

  const [matched, scheme, , , port] = loopback
  const resolvedPort = port ?? devApiPort()

  return url.replace(matched, `${scheme}${host}${resolvedPort ? `:${resolvedPort}` : ''}`)
}

export const API_URL = resolveBaseUrl()

/** Thrown for any non-2xx response, carrying enough for a screen to react. */
export class ApiError extends Error {
  constructor(message, { status, errors, payload } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    /** Laravel's field-keyed validation bag, e.g. { email: ['...'] }. */
    this.errors = errors ?? null
    this.payload = payload ?? null
  }
}

async function request(path, { method = 'GET', body, auth = true, signal } = {}) {
  /** Whether this request carried a token, so a 401 means "expired", not "anonymous". */
  let sentToken = false

  const headers = {
    Accept: 'application/json',
    // Tells the backend to hand back the Sanctum token in the response body.
    // Browsers never send this, so the web app keeps its httpOnly cookie.
    'X-Client-Type': 'mobile',
  }

  if (body !== undefined) headers['Content-Type'] = 'application/json'

  if (auth) {
    const token = await getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
      sentToken = true
    }
  }

  let response
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (cause) {
    // fetch only rejects for transport failures, so this is always "no network"
    // rather than an error the server chose to send.
    throw new ApiError('Cannot reach Languify. Check your connection and try again.', {
      status: 0,
      payload: { cause: String(cause) },
    })
  }

  // 204s and empty bodies are legitimate; do not let JSON.parse decide the fate
  // of an otherwise successful request.
  const text = await response.text()
  let payload = null
  if (text) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = null
    }
  }

  if (!response.ok) {
    // A 401 on a request that carried a token means the token is no longer good:
    // expired, or revoked server-side by a password reset. Reported once here so
    // the whole app reacts consistently instead of each screen showing its own
    // dead end. A 401 with no token is just an anonymous request being refused.
    if (response.status === 401 && sentToken) {
      reportSessionExpired()
    }

    throw new ApiError(payload?.message ?? `Request failed (${response.status})`, {
      status: response.status,
      errors: payload?.errors,
      payload,
    })
  }

  return payload
}

export const api = {
  get: (path, options) => request(path, { ...options, method: 'GET' }),
  post: (path, body, options) => request(path, { ...options, method: 'POST', body }),
  patch: (path, body, options) => request(path, { ...options, method: 'PATCH', body }),
  put: (path, body, options) => request(path, { ...options, method: 'PUT', body }),
  delete: (path, options) => request(path, { ...options, method: 'DELETE' }),
}

export default api
