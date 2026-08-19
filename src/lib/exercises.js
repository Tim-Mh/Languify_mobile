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

/**
 * Accented letters folded onto their base letter.
 *
 * Learners type "Gunaydin" for "Günaydın" — a phone keyboard set to English has
 * no ü or ı — and counting those as different words scored a perfectly correct
 * Turkish paragraph at 0.54 against the 0.78 threshold. German, French and
 * Spanish have the same problem in a smaller way. `ı` and `ß` are listed
 * explicitly because they are letters in their own right rather than a base
 * letter carrying an accent.
 *
 * Keep in step with the web's ParagraphTranslationExercise.
 */
const FOLD = {
  á: 'a', à: 'a', â: 'a', ä: 'a', ã: 'a', å: 'a', æ: 'ae',
  ç: 'c',
  é: 'e', è: 'e', ê: 'e', ë: 'e',
  ğ: 'g',
  í: 'i', ì: 'i', î: 'i', ï: 'i', ı: 'i',
  ñ: 'n',
  ó: 'o', ò: 'o', ô: 'o', ö: 'o', õ: 'o', œ: 'oe',
  ş: 's', ß: 'ss',
  ú: 'u', ù: 'u', û: 'u', ü: 'u',
  ý: 'y', ÿ: 'y',
  // Russian keyboards put ё off in the corner and Russians habitually type е
  // for it, in print as well as online. Treating the two as different letters
  // would fail an answer over a key almost nobody presses.
  ё: 'е',
}

function normalize(text) {
  return String(text ?? '')
    .toLowerCase()
    // Turkish İ lowercases to i + U+0307 rather than to a plain i.
    .replace(/̇/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .replace(/./gu, (character) => FOLD[character] ?? character)
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Words where the script writes them separately, character bigrams where it
 * does not. Japanese and Korean answers are one unbroken run, so splitting on
 * whitespace gave a single token and turned this into an exact-match test: an
 * answer the web scored at 0.91 scored 0 here, and the learner failed the Final
 * Test on mobile for something they would have passed on the web.
 */
function tokenize(text) {
  if (/\s/.test(text)) {
    return text.split(' ').filter(Boolean)
  }
  const characters = Array.from(text)
  if (characters.length < 2) return characters

  const bigrams = []
  for (let i = 0; i < characters.length - 1; i += 1) {
    bigrams.push(characters[i] + characters[i + 1])
  }
  return bigrams
}

export function similarity(a, b) {
  const setA = new Set(tokenize(normalize(a)))
  const setB = new Set(tokenize(normalize(b)))
  if (setA.size === 0 || setB.size === 0) return 0

  let shared = 0
  for (const token of setA) if (setB.has(token)) shared += 1

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

/**
 * Every string in an exercise that the learner can tap to hear.
 *
 * Used to warm the pronunciation cache when a lesson opens, so the first tap is
 * as quick as the tenth. It lists fields explicitly rather than walking the
 * whole payload, because the payload also carries native-language glosses
 * (`sentence_translation`, an option's `en`) and rendering those in the voice of
 * the language being learned would be both wrong and wasted work.
 *
 * Kept beside `optionLabel` so the two stay in step: if an exercise type starts
 * speaking a new field, it gets added here in the same edit.
 */
export function speakableTexts(exercise) {
  const data = exercise?.data ?? {}

  const fromOptions = (list) => (Array.isArray(list) ? list.map(optionLabel) : [])

  return [
    data.word,
    data.audio_text,
    ...fromOptions(data.options),
    ...fromOptions(data.word_bank),
    ...fromOptions(data.words),
  ].filter((text) => typeof text === 'string' && text.trim() !== '')
}
