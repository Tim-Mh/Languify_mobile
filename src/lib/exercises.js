/**
 * Helpers shared by every exercise type, ported from the web app's
 * components/exercises/exerciseHelpers.jsx so both grade identically.
 */

/** Options arrive either as plain strings or as `{ text, hint, new }` objects. */
export function optionLabel(option) {
  return typeof option === 'string' ? option : option?.text
}

/**
 * The native-language gloss. The API names this field `en` (it is localized
 * server-side to the learner's own language, the key just never got renamed),
 * which is what the web reads too.
 */
export function optionHint(option) {
  if (typeof option === 'string') return null

  const hint = option?.en ?? null
  // A gloss identical to the tile teaches nothing. Happens when a word is not
  // in the course dictionary and the API falls back to echoing it, and for
  // cognates (café -> café) where a bubble is just noise.
  if (!hint || hint.trim() === String(option?.text ?? '').trim()) return null

  return hint
}

/** Courses whose writing system does not put spaces between words. */
const UNSPACED_SCRIPTS = ['ja']

/**
 * Join word tiles into a written sentence the way that language writes it.
 * Japanese has no spaces, so "コーヒー を お願いします" is an artefact of the
 * tiles being an array, not something a learner would ever read.
 */
export function joinWords(words, languageCode) {
  return (words ?? []).join(UNSPACED_SCRIPTS.includes(languageCode) ? '' : ' ')
}

/**
 * Artwork path, e.g. `/images/exercises/coffee.svg`. Only `match_pairs` options
 * carry one; everything else returns null.
 */
export function optionImage(option) {
  return typeof option === 'string' ? null : (option?.image ?? null)
}

/** True while a word is still new to the learner, so its hint should show. */
export function optionIsNew(option) {
  return typeof option === 'string' ? false : option?.new !== false
}

/**
 * How close two answers are, as a Dice coefficient over their word sets.
 *
 * Only used by paragraph translation, which cannot be graded exactly. This is a
 * deliberately lenient heuristic, not real translation scoring: there is no NLP
 * service behind it, and the same 0.78 threshold is used on the web so a given
 * answer passes or fails the same way on both.
 */
export const SIMILARITY_THRESHOLD = 0.78

export function similarity(a, b) {
  const words = (text) =>
    new Set(
      String(text ?? '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, '')
        .split(/\s+/)
        .filter(Boolean),
    )

  const setA = words(a)
  const setB = words(b)
  if (setA.size === 0 || setB.size === 0) return 0

  let shared = 0
  for (const word of setA) if (setB.has(word)) shared += 1

  return (2 * shared) / (setA.size + setB.size)
}

/** Fisher-Yates, for shuffling tiles the server did not pre-shuffle. */
export function shuffle(items) {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

/**
 * Two lists hold the same words in the same order.
 * Used by the word-bank types, where the answer is an ordered sequence.
 */
export function sameOrder(attempt, correct) {
  return (
    attempt.length === correct.length && attempt.every((word, i) => word === correct[i])
  )
}
