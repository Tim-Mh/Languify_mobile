import { deleteSecureItem, getSecureItem, setSecureItem } from './lib/secureStorage'

const TOKEN_KEY = 'languify.auth.token'

/**
 * The Sanctum token lives in the device keychain (Keychain on iOS,
 * EncryptedSharedPreferences on Android) rather than AsyncStorage, because
 * AsyncStorage is plain text on disk.
 */

/**
 * Read once at startup and kept here so every API call does not have to await a
 * keychain round trip. `null` means signed out; `undefined` means not yet read.
 */
let cachedToken

export async function getToken() {
  if (cachedToken !== undefined) return cachedToken

  // A corrupt or unreadable keychain entry should sign the user out rather than
  // crash the app on launch, which is what the store's null fallback gives us.
  cachedToken = await getSecureItem(TOKEN_KEY)

  return cachedToken
}

export async function setToken(token) {
  // Cached before the write, so the current session still works even if the
  // write failed; they will just have to log in again next launch.
  cachedToken = token

  await setSecureItem(TOKEN_KEY, token)
}

export async function clearToken() {
  cachedToken = null

  await deleteSecureItem(TOKEN_KEY)
}
