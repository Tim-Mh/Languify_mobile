import { Image } from 'react-native'

/**
 * Which ad the next lesson-complete interstitial shows, and which images to
 * download ahead of time.
 *
 * The server sends the ads already in play order: products alternate and the
 * order is reshuffled on every request, so there is nothing to persist on the
 * device. The app plays the list from the top for as long as it has it, one
 * ad per finished lesson, and a fresh launch fetches a freshly shuffled list.
 * Same rule as the website's `lib/adPlayback.js`.
 */

/** How many ads after the current one to download ahead of time. */
const PRELOAD_AHEAD = 3

/** Where each placement has got to in its play order, for this launch. */
const pointers = new Map()

/** URLs already handed to the native image cache. */
const prefetched = new Set()

/** The next ad from `pool`, never the same one twice in a row. */
export function takeNext(placement, pool) {
  if (!pool?.length) return null

  const { index = 0, lastId = null } = pointers.get(placement) ?? {}
  let next = index % pool.length

  if (pool.length > 1 && pool[next].id === lastId) next = (next + 1) % pool.length

  pointers.set(placement, { index: next + 1, lastId: pool[next].id })

  return pool[next]
}

/**
 * Pulls the ad at `index` and the few after it into the native image cache,
 * so the interstitial renders from disk. Never the whole list: a session only
 * downloads the handful of images it will actually show. A failed prefetch
 * only costs a slower ad, so it is ignored.
 */
export function preloadFrom(pool, index) {
  if (!pool?.length) return

  for (let offset = 0; offset <= PRELOAD_AHEAD; offset++) {
    const url = pool[(index + offset) % pool.length]?.url

    if (url && !prefetched.has(url)) {
      prefetched.add(url)
      Image.prefetch(url).catch(() => prefetched.delete(url))
    }
  }
}

/** Where the next `takeNext()` call for this placement will start. */
export function peekIndex(placement, pool) {
  if (!pool?.length) return 0

  return (pointers.get(placement)?.index ?? 0) % pool.length
}

/** Only http and https links are ever opened from an ad. */
export function safeAdUrl(url) {
  return typeof url === 'string' && /^https?:\/\//i.test(url) ? url : null
}
