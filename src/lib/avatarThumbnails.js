import { avatarSvg } from './avatar'

/**
 * Avatar option thumbnails, as SVG markup for `react-native-svg`.
 *
 * The obvious assumption — that generating the faces is what makes the avatar
 * editor slow — is wrong, and it is worth writing down because it sent an
 * earlier version of this file down a much more complicated road. Measured,
 * DiceBear renders a full adventurer face in **0.2ms**; all forty-five hair
 * options take 7ms together. Generation is free.
 *
 * What costs is drawing them. Each face is ~7KB of SVG with a few hundred
 * nodes, and handing that to `react-native-svg` builds a native view tree per
 * tile. Forty-five of those on one screen is the stall.
 *
 * The Expo build sidestepped that by wrapping the markup in a data URI and
 * letting `expo-image` decode it natively to a cached bitmap. **That option is
 * gone here**: neither React Native's own `Image` nor any of the community
 * image libraries decodes SVG, so there is no rasteriser to hand it to, and the
 * data URI had no consumer left. Encoding one only to `decodeURIComponent` it
 * back on the other side was pure overhead, so this now hands back the markup
 * directly and the tiles render it with `SvgXml`.
 *
 * The tiles are memoised on their value, which is what keeps a tap from
 * re-reconciling the whole grid — that, plus generation being free, is what
 * keeps this usable. Caching the strings is not the lever: a previous version
 * persisted them to AsyncStorage, which meant reading and parsing ~2MB of JSON
 * at startup to save 7ms of work, a net loss. The Map below is only to avoid
 * re-rendering the same face within a session.
 */
const memory = new Map()

/** Bounded so a long editing session cannot grow this without limit. */
const MAX_ENTRIES = 400

/**
 * What a thumbnail depends on: the attribute being previewed, the value being
 * previewed, every *other* attribute of the face around it, and the seed. Two
 * faces differing only in the attribute this tile overrides produce the same
 * picture, so they share an entry — which is why choosing a different mouth
 * does not invalidate a single mouth thumbnail.
 */
export function thumbnailKey(attribute, value, config, seed) {
  const rest = Object.keys(config ?? {})
    .filter((key) => key !== attribute && key !== 'seed')
    .sort()
    .map((key) => `${key}=${config[key] ?? ''}`)
    .join('&')

  return `${attribute}:${value}|${rest}|${seed ?? ''}`
}

/** The thumbnail for one tile, as SVG markup, or null if it could not build. */
export function thumbnailSvg({ attribute, value, config, seed }) {
  const key = thumbnailKey(attribute, value, config, seed)
  const cached = memory.get(key)
  if (cached) return cached

  const svg = avatarSvg(config, {
    [attribute]: value,
    seed: seed ? String(seed) : undefined,
  })

  if (!svg) return null

  if (memory.size >= MAX_ENTRIES) {
    // Drop the oldest half in one go, so this runs rarely rather than on every
    // insert once the cap is reached.
    const keep = [...memory.entries()].slice(-Math.floor(MAX_ENTRIES / 2))
    memory.clear()
    for (const [k, v] of keep) memory.set(k, v)
  }

  memory.set(key, svg)
  return svg
}
