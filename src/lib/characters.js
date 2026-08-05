/**
 * The illustrated characters that dot the lesson path, mirroring the web app's
 * lib/characters.js.
 *
 * A curated subset rather than the web's full ~44: at the size these render on a
 * phone the rest would be bundle weight nobody can see. Each is pre-scaled to
 * 160px wide (see scratchpad/chars.py), which is why the whole set is under
 * 500KB instead of several megabytes.
 *
 * Metro needs literal `require` paths, so these cannot be built from a string
 * pattern the way the web does it.
 */

/**
 * The pink elephant brand mascot, first so index 0 is always on-brand.
 *
 * Exported because these are all roughly square (0.82–1.00), while the kids are
 * tall and narrow (~0.45). Anywhere a character has to sit inside a fixed round
 * frame, use this pool: `contain` would otherwise render a kid as a thin sliver
 * and the framing would change from one chapter to the next.
 */
export const MASCOTS = [
  require('../../assets/characters/main_char_2.png'),
  require('../../assets/characters/main_char_5.png'),
  require('../../assets/characters/main_char_7.png'),
  require('../../assets/characters/main_char_9.png'),
  require('../../assets/characters/main_char_11.png'),
  require('../../assets/characters/main_char_13.png'),
]

/** Friendly human accents. */
const KIDS = [
  require('../../assets/characters/boy_char_2.png'),
  require('../../assets/characters/boy_char_6.png'),
  require('../../assets/characters/girl_char_3.png'),
  require('../../assets/characters/bgirl_char_4.png'),
  require('../../assets/characters/kid_char_2.png'),
]

export const ALL_CHARACTERS = [...MASCOTS, ...KIDS]

/**
 * Deterministic pick, so a given slot always shows the same character across
 * re-renders. Randomising inline would make the images flicker as the list
 * re-renders while lessons load in.
 */
export function characterAt(index, pool = ALL_CHARACTERS) {
  return pool[((index % pool.length) + pool.length) % pool.length]
}
