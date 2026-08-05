import * as Keychain from 'react-native-keychain'

/**
 * A small key/value store backed by the device keychain.
 *
 * This stands in for `expo-secure-store`, which had exactly this shape.
 * `react-native-keychain` instead models everything as a credential pair, so a
 * single value is stored as the password half and the key becomes the
 * `service` — that is what keeps two different keys from overwriting each
 * other, since every entry would otherwise land on the app's default service.
 *
 * Backed by the Keychain on iOS and by EncryptedSharedPreferences (via the
 * Android Keystore) on Android, which is the same guarantee the Expo build had:
 * encrypted at rest, rather than AsyncStorage's plain text on disk.
 *
 * Every method swallows its own failures. A keychain can be unreadable after a
 * restore from backup or when the device is locked, and none of the callers
 * have anything better to do about it than carry on without the value.
 */

/** The username half is unused; the keychain simply requires one. */
const ACCOUNT = 'languify'

export async function getSecureItem(key) {
  try {
    const entry = await Keychain.getGenericPassword({ service: key })

    // `false` is what this returns for "nothing stored", not an empty object.
    return entry ? entry.password : null
  } catch {
    return null
  }
}

export async function setSecureItem(key, value) {
  try {
    await Keychain.setGenericPassword(ACCOUNT, String(value), { service: key })
    return true
  } catch {
    return false
  }
}

export async function deleteSecureItem(key) {
  try {
    await Keychain.resetGenericPassword({ service: key })
    return true
  } catch {
    return false
  }
}
