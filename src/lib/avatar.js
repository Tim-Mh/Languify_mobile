import { createAvatar } from '@dicebear/core'
import * as adventurer from '@dicebear/adventurer'

/**
 * Builds the same DiceBear "adventurer" avatar the web app draws, from the same
 * saved config, so a learner's face is identical in both products.
 *
 * Ported from the web's `src/lib/avatarUrl.js`. The one difference is the
 * output: the web hands React an `img src` data URI, while here the SVG markup
 * goes straight into `react-native-svg`'s `SvgXml`. Generating it on device
 * rather than fetching from api.dicebear.com matters more on a phone than it
 * does on the web — a leaderboard would otherwise fire thirty image requests.
 */
export const DEFAULT_AVATAR_CONFIG = {
  skinColor: 'f2d3b1',
  hair: 'short16',
  hairColor: '6c4545',
  eyes: 'variant12',
  eyebrows: 'variant05',
  mouth: 'variant15',
  glasses: null,
  earrings: null,
  backgroundColor: 'b6e3f4',
}

/**
 * Drops null/undefined keys before merging, so an explicit `hair: null` (a saved
 * avatar that never customised that field) falls back to the default instead of
 * clobbering it. A plain spread lets the null win, which is what made the web's
 * profile render a bald avatar until it was fixed the same way.
 */
function withoutNullish(object) {
  return Object.fromEntries(
    Object.entries(object ?? {}).filter(([, value]) => value !== null && value !== undefined),
  )
}

/**
 * The avatar as SVG markup.
 *
 * `size` is not cosmetic. DiceBear emits a `viewBox` and no `width`/`height`,
 * and a decoder handed an SVG with no intrinsic dimensions has to guess: on
 * Android that is what left the avatar tiles rendering at the wrong size and
 * anchored to the top of their box rather than filling it. `react-native-svg`
 * does not care, because the caller gives it dimensions, but `expo-image` reads
 * them from the markup — so they have to be in the markup.
 */
export function avatarSvg(config, overrides = {}) {
  const merged = {
    ...DEFAULT_AVATAR_CONFIG,
    ...withoutNullish(config),
    ...withoutNullish(overrides),
  }

  const options = {
    seed: merged.seed ?? 'linguistpath',
    size: merged.size ?? 256,
    // DiceBear treats these as probabilities, not booleans: a feature the
    // learner did not pick must be 0, or it appears at random.
    hairProbability: merged.hair ? 100 : 0,
    glassesProbability: merged.glasses ? 100 : 0,
    earringsProbability: merged.earrings ? 100 : 0,
  }

  if (merged.skinColor) options.skinColor = [merged.skinColor]
  if (merged.backgroundColor) options.backgroundColor = [merged.backgroundColor]
  if (merged.hair) options.hair = [merged.hair]
  if (merged.hairColor) options.hairColor = [merged.hairColor]
  if (merged.eyes) options.eyes = [merged.eyes]
  if (merged.eyebrows) options.eyebrows = [merged.eyebrows]
  if (merged.mouth) options.mouth = [merged.mouth]
  if (merged.glasses) options.glasses = [merged.glasses]
  if (merged.earrings) options.earrings = [merged.earrings]

  try {
    return createAvatar(adventurer, options).toString()
  } catch {
    // A saved config naming an option this DiceBear version dropped should show
    // the default face, not crash the screen it is on.
    return null
  }
}
