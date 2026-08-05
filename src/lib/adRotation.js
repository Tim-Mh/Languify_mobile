import { getSecureItem, setSecureItem } from './secureStorage'

/**
 * Which creative the next lesson-complete interstitial should show.
 *
 * The pool is stepped through in order rather than sampled at random, so the
 * first lesson you finish shows creative #1, the second shows #2, and so on,
 * wrapping at the end — same rule as the web's `lp_ad_interstitial_index`. An
 * advertiser who bought a slot gets shown; random picking would let one creative
 * repeat three times while another never appeared.
 *
 * Kept in the same store as the auth token because it is the only persistent
 * key/value store this project has (there is no AsyncStorage dependency, and
 * adding one for a counter is not worth the install). The value is not a secret;
 * it just happens to live somewhere secure.
 */
const INDEX_KEY = 'languify.ads.interstitialIndex'

/** Mirrors session.js: avoids a store round trip on every read after the first. */
let cached

async function read() {
  if (cached !== undefined) return cached

  const raw = await getSecureItem(INDEX_KEY)
  cached = Number.parseInt(raw ?? '0', 10) || 0

  return cached
}

async function write(value) {
  // A failed write only costs this device its place in the rotation, so the
  // store swallowing it is the behaviour we want here.
  cached = value

  await setSecureItem(INDEX_KEY, String(value))
}

/**
 * The next creative from `pool`, advancing the stored position.
 *
 * Returns null for an empty pool, which is the normal state until an admin
 * assigns something to the lessonComplete placement.
 */
export async function nextAd(pool) {
  if (!pool?.length) return null

  const stored = await read()
  // Modulo twice: the pool can shrink between sessions, and a stored index that
  // is now out of range must still land somewhere real.
  const index = ((stored % pool.length) + pool.length) % pool.length

  await write((index + 1) % pool.length)

  return pool[index]
}
