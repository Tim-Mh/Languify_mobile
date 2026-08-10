import { forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'
import Volume2 from 'lucide-react-native/icons/volume-2'

import { useTranslate } from '../../lib/i18n'
import HintBubble, { useHintTarget } from '../HintBubble'
import OptionTile, { GlossWord, PictureTile, WordTile } from './OptionTile'
import {
  joinWords,
  optionHint,
  optionImage,
  optionIsNew,
  optionLabel,
  sameOrder,
  shuffle,
  similarity,
  SIMILARITY_THRESHOLD,
} from '../../lib/exercises'
import { sounds } from '../../lib/sounds'
import { speak } from '../../lib/speak'
import { colors, fonts, radii, spacing } from '../../theme'

/**
 * Every exercise exposes the same handle to the player:
 *
 *   check()  -> grade the current answer, call onResult(correct)
 *   reset()  -> clear it, for a retry
 *
 * and reports through `onReadyChange` whether there is enough of an answer to
 * grade. The player owns the Check button, so the exercises never draw one.
 *
 * Every type also takes `forceHints`. The backend flags each word as new until
 * it has appeared before, so hints fade away word by word as they are learned;
 * `forceHints` brings them all back for an exercise the learner has already got
 * wrong this round, turning the mistake into a teaching moment. Same rule as the
 * web's ExercisePlayer.
 */

/* ── shared pieces ──────────────────────────────────────────────────────── */

/**
 * A word's native-language gloss, if the lesson carries one.
 *
 * The web gates this on the backend's `new` flag, because there the hint
 * appears on *hover* — an accident of moving the mouse — so showing it for
 * every known word would bury the sentence in tooltips. On a phone the gloss is
 * revealed by a deliberate tap and nothing is shown until then, so there is no
 * noise to protect against: any word that has a meaning can offer it. Gating it
 * here instead meant a returning learner (whose words are all `new: false`) got
 * no hints anywhere, which reads as broken rather than as learned.
 */
function hintFor(option) {
  return optionHint(option)
}

/**
 * Whether to *mark* the word as worth tapping, with the dashed underline.
 *
 * This is what keeps the `new` flag meaningful: every glossed word can be
 * tapped, but only the ones still being taught — or the ones just got wrong —
 * advertise themselves.
 */
function marked(option, forceHints) {
  return Boolean(optionHint(option)) && (forceHints || optionIsNew(option))
}

/**
 * The line being asked about. `onPress` makes it speakable, mirroring the web,
 * where hovering the sentence or the prompt word reads it aloud.
 *
 * `hint` floats above the line on tap (a single word's meaning, as the web does
 * on hover); `translation` sits underneath it permanently, which is what a whole
 * sentence needs since it is context rather than a gloss.
 */
function Prompt({ text, translation, hint, marked: isMarked, onPress }) {
  const t = useTranslate()
  const { open, toggle } = useHintTarget(hint)

  if (!text) return null

  const body = (
    <>
      <HintBubble text={hint} visible={open} />
      <Text style={[styles.promptText, isMarked && styles.promptHinted]}>{text}</Text>
      {translation ? <Text style={styles.promptTranslation}>{translation}</Text> : null}
    </>
  )

  if (!onPress && !hint) return <View style={styles.prompt}>{body}</View>

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? t('m_ex_hear_hint', { text, hint }) : t('m_ex_hear', { text })}
      onPress={() => {
        onPress?.()
        toggle()
      }}
      style={({ pressed }) => [styles.prompt, pressed && styles.promptPressed]}
    >
      {body}
    </Pressable>
  )
}

/** The four types that are "pick one option" differ only in their prompt. */
function useChoice(correctAnswer, onResult, onReadyChange) {
  const [selected, setSelected] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    onReadyChange?.(selected !== null)
  }, [selected, onReadyChange])

  return {
    selected,
    checked,
    pick: (label) => !checked && setSelected(label),
    handle: {
      check() {
        setChecked(true)
        onResult(selected === correctAnswer)
      },
      reset() {
        setSelected(null)
        setChecked(false)
      },
    },
  }
}

function ChoiceList({ options, correctAnswer, selected, checked, onPick, learningCode, forceHints }) {
  return options.map((option, index) => {
    const label = optionLabel(option)
    return (
      <OptionTile
        key={`${label}-${index}`}
        label={label}
        hint={hintFor(option)}
        marked={marked(option, forceHints)}
        selected={selected === label}
        checked={checked}
        isCorrect={label === correctAnswer}
        onPress={() => {
          // Hearing the word is half the point of picking it, so tapping does
          // both, exactly as the web does.
          sounds.select()
          speak(label, learningCode)
          onPick(label)
        }}
      />
    )
  })
}

/* ── 1. multiple choice ─────────────────────────────────────────────────── */

const ChoiceExercise = forwardRef(function ChoiceExercise(
  { exercise, onResult, onReadyChange, learningCode, forceHints },
  ref,
) {
  const {
    word,
    word_translation: wordTranslation,
    word_is_new: wordIsNew,
    options = [],
    correct_answer: correctAnswer,
  } = exercise.data

  const { selected, checked, pick, handle } = useChoice(correctAnswer, onResult, onReadyChange)
  useImperativeHandle(ref, () => handle)

  return (
    <>
      {/* The word being asked about: tap to hear it and to float what it means,
          which is the web's hover tooltip on this same prompt. */}
      <Prompt
        text={word}
        hint={wordTranslation}
        marked={Boolean(wordTranslation) && (forceHints || wordIsNew !== false)}
        onPress={() => speak(word, learningCode)}
      />
      <ChoiceList
        options={options}
        correctAnswer={correctAnswer}
        selected={selected}
        checked={checked}
        onPick={pick}
        learningCode={learningCode}
        forceHints={forceHints}
      />
    </>
  )
})

/* ── 2. match pairs: the picture one ────────────────────────────────────── */

const PictureChoiceExercise = forwardRef(function PictureChoiceExercise(
  { exercise, onResult, onReadyChange, learningCode, forceHints },
  ref,
) {
  const {
    word,
    word_translation: wordTranslation,
    word_is_new: wordIsNew,
    options = [],
    correct_answer: correctAnswer,
  } = exercise.data

  const { selected, checked, pick, handle } = useChoice(correctAnswer, onResult, onReadyChange)
  useImperativeHandle(ref, () => handle)

  return (
    <>
      <Prompt
        text={word}
        hint={wordTranslation}
        marked={Boolean(wordTranslation) && (forceHints || wordIsNew !== false)}
        onPress={() => speak(word, learningCode)}
      />

      {/* Two columns of picture cards. This is the only type with artwork, and
          the artwork is the answer, so it gets the room. */}
      <View style={styles.pictureGrid}>
        {options.map((option, index) => {
          const label = optionLabel(option)

          return (
            <PictureTile
              key={`${label}-${index}`}
              label={label}
              image={optionImage(option)}
              selected={selected === label}
              checked={checked}
              isCorrect={label === correctAnswer}
              onPress={() => {
                sounds.select()
                speak(label, learningCode)
                pick(label)
              }}
            />
          )
        })}
      </View>
    </>
  )
})

/* ── 3. fill in the blank ───────────────────────────────────────────────── */

const FillBlankExercise = forwardRef(function FillBlankExercise(
  { exercise, onResult, onReadyChange, learningCode, forceHints },
  ref,
) {
  const {
    sentence,
    sentence_translation: sentenceTranslation,
    options = [],
    correct_answer: correctAnswer,
  } = exercise.data

  const { selected, checked, pick, handle } = useChoice(correctAnswer, onResult, onReadyChange)
  useImperativeHandle(ref, () => handle)

  // Show the chosen word inside the gap so the sentence reads as a whole.
  const filled = selected ? String(sentence ?? '').replace(/_{2,}/, selected) : sentence

  return (
    <>
      {/* Reads the sentence with whatever is currently in the blank, so the
          learner can hear whether their pick sounds right before committing. */}
      <Prompt
        text={filled}
        translation={sentenceTranslation}
        onPress={() => speak(String(filled ?? '').replace(/_{2,}/, ' '), learningCode)}
      />
      <ChoiceList
        options={options}
        correctAnswer={correctAnswer}
        selected={selected}
        checked={checked}
        onPick={pick}
        learningCode={learningCode}
        forceHints={forceHints}
      />
    </>
  )
})

/* ── 4. listen and select ───────────────────────────────────────────────── */

const ListenSelectExercise = forwardRef(function ListenSelectExercise(
  { exercise, onResult, onReadyChange, learningCode, forceHints },
  ref,
) {
  const t = useTranslate()
  const { audio_text: audioText, options = [], correct_answer: correctAnswer } = exercise.data
  const { selected, checked, pick, handle } = useChoice(correctAnswer, onResult, onReadyChange)
  useImperativeHandle(ref, () => handle)

  // Speak it once on arrival: the exercise is "what did you just hear", so
  // making the learner hunt for a button first defeats it.
  useEffect(() => {
    speak(audioText, learningCode)
  }, [audioText, learningCode])

  return (
    <>
      {/* The phrase itself is deliberately NOT shown: reading it would answer
          the question. Tap to hear it again. */}
      <View style={styles.speakerWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play the audio again"
          onPress={() => speak(audioText, learningCode)}
          style={({ pressed }) => [styles.speaker, pressed && styles.speakerPressed]}
        >
          <Volume2 size={34} color={colors.white} strokeWidth={2.2} />
        </Pressable>
        <Text style={styles.speakerHint}>{t('m_ex_hear_again')}</Text>
      </View>

      <ChoiceList
        options={options}
        correctAnswer={correctAnswer}
        selected={selected}
        checked={checked}
        onPick={pick}
        learningCode={learningCode}
        forceHints={forceHints}
      />
    </>
  )
})

/* ── 5. translate, 6. tap the words ─────────────────────────────────────── */

/**
 * Both build an ordered sentence from a word bank. Translate shows the prompt
 * words above; tap-word shows only the translation.
 */
const OrderExercise = forwardRef(function OrderExercise(
  { exercise, onResult, onReadyChange, variant, learningCode, nativeCode, forceHints },
  ref,
) {
  const t = useTranslate()
  const data = exercise.data
  const isTranslate = variant === 'translate'

  const bank = isTranslate ? (data.word_bank ?? []) : (data.words ?? [])
  const correct = isTranslate ? (data.correct ?? []) : (data.correct_order ?? [])
  const promptWords = data.prompt_words ?? []
  const translation = data.sentence_translation

  // Indices, not labels: a bank can legitimately contain the same word twice,
  // and tracking labels would remove both tiles at once.
  const [placed, setPlaced] = useState([])
  const [checked, setChecked] = useState(false)

  const shuffled = useMemo(() => shuffle(bank.map((word, index) => ({ word, index }))), [bank])

  useEffect(() => {
    onReadyChange?.(placed.length > 0)
  }, [placed, onReadyChange])

  useImperativeHandle(ref, () => ({
    check() {
      setChecked(true)
      onResult(sameOrder(placed.map((i) => optionLabel(bank[i])), correct))
    },
    reset() {
      setPlaced([])
      setChecked(false)
    },
  }))

  const answerCorrect = checked && sameOrder(placed.map((i) => optionLabel(bank[i])), correct)

  return (
    <>
      {/* The phrase to translate, one tappable word at a time. Tapping speaks
          the word in the language being learned and reveals what it means,
          which is the whole way in for a word you have never seen. */}
      {isTranslate && promptWords.length > 0 ? (
        <View style={styles.promptWords}>
          {promptWords.map((word, index) => (
            <GlossWord
              key={`${optionLabel(word)}-${index}`}
              label={optionLabel(word)}
              gloss={hintFor(word)}
              marked={marked(word, forceHints)}
              onPress={() => speak(optionLabel(word), learningCode)}
            />
          ))}
        </View>
      ) : null}

      {!isTranslate && translation ? <Prompt text={translation} /> : null}

      {/* The answer being built. */}
      <View style={[styles.answerRow, checked && (answerCorrect ? styles.answerOk : styles.answerBad)]}>
        {placed.length === 0 ? (
          <Text style={styles.answerPlaceholder}>{t('m_ex_tap_words')}</Text>
        ) : (
          placed.map((bankIndex, position) => (
            <WordTile
              key={`${bankIndex}-${position}`}
              label={optionLabel(bank[bankIndex])}
              // A word keeps its gloss once placed, so the sentence being built
              // stays readable rather than turning back into a puzzle.
              hint={hintFor(bank[bankIndex])}
              marked={marked(bank[bankIndex], forceHints)}
              onPress={() => {
                sounds.select()
                setPlaced((current) => current.filter((_, i) => i !== position))
              }}
              disabled={checked}
              tone="placed"
            />
          ))
        )}
      </View>

      {checked && !answerCorrect ? (
        <Text style={styles.correction}>
          Correct: {joinWords(correct, isTranslate ? nativeCode : learningCode)}
        </Text>
      ) : null}

      {/* The bank. A placed tile is hidden rather than removed, so the bank
          does not reflow every time a word is tapped. */}
      <View style={styles.bank}>
        {shuffled.map(({ word, index }) => {
          const used = placed.includes(index)
          return used ? (
            <View key={index} style={styles.bankGap} />
          ) : (
            <WordTile
              key={index}
              label={optionLabel(word)}
              hint={hintFor(word)}
              marked={marked(word, forceHints)}
              onPress={() => {
                sounds.select()
                // Translate's bank holds the learner's OWN language, so it is
                // read in that voice; tap-word's bank is the course language.
                speak(optionLabel(word), isTranslate ? nativeCode : learningCode)
                setPlaced((current) => [...current, index])
              }}
              disabled={checked}
            />
          )
        })}
      </View>
    </>
  )
})

/* ── 7. paragraph translation ───────────────────────────────────────────── */

const ParagraphTranslationExercise = forwardRef(function ParagraphTranslationExercise(
  { exercise, onResult, onReadyChange, nativeCode = 'en' },
  ref,
) {
  const t = useTranslate()
  const {
    source_text: sourceText,
    reference_translation: referenceTranslation,
    accepted_translations: acceptedTranslations,
  } = exercise.data

  const paragraph = sourceText?.[nativeCode] ?? sourceText?.en ?? ''
  // The reference is always acceptable; older exercises carry no alternatives.
  const accepted = [referenceTranslation, ...(acceptedTranslations ?? [])].filter(Boolean)

  const [answer, setAnswer] = useState('')
  const [checked, setChecked] = useState(false)
  const [passed, setPassed] = useState(false)

  useEffect(() => {
    onReadyChange?.(answer.trim().length >= 10)
  }, [answer, onReadyChange])

  useImperativeHandle(ref, () => ({
    check() {
      const best = accepted.reduce((max, candidate) => Math.max(max, similarity(answer, candidate)), 0)
      const ok = best >= SIMILARITY_THRESHOLD
      setChecked(true)
      setPassed(ok)
      onResult(ok)
    },
    reset() {
      setAnswer('')
      setChecked(false)
      setPassed(false)
    },
  }))

  return (
    <>
      <Prompt text={paragraph} />

      <TextInput
        value={answer}
        onChangeText={setAnswer}
        editable={!checked}
        multiline
        placeholder={t('m_ex_write')}
        placeholderTextColor={colors.secondary[300]}
        style={[
          styles.paragraphInput,
          checked && (passed ? styles.answerOk : styles.answerBad),
        ]}
      />

      {checked && !passed ? (
        <Text style={styles.correction}>Reference: {referenceTranslation}</Text>
      ) : null}
    </>
  )
})

/* ── registry ───────────────────────────────────────────────────────────── */

const Translate = forwardRef((props, ref) => <OrderExercise {...props} ref={ref} variant="translate" />)
const TapWord = forwardRef((props, ref) => <OrderExercise {...props} ref={ref} variant="tap_word" />)

/** Keyed by the backend's ExerciseType enum values. */
export const EXERCISE_COMPONENTS = {
  multiple_choice: ChoiceExercise,
  match_pairs: PictureChoiceExercise,
  fill_blank: FillBlankExercise,
  listen_select: ListenSelectExercise,
  translate: Translate,
  tap_word: TapWord,
  paragraph_translation: ParagraphTranslationExercise,
}

const styles = StyleSheet.create({
  pictureGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  speakerWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  speaker: {
    width: 92,
    height: 92,
    borderRadius: radii.pill,
    backgroundColor: colors.accent[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  speakerPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.96 }],
  },
  speakerHint: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.secondary[400],
    marginTop: spacing.sm,
    writingDirection: 'auto',
  },
  promptWords: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'flex-end',
    marginBottom: spacing.lg,
  },
  prompt: {
    marginBottom: spacing.lg,
  },
  promptPressed: {
    opacity: 0.6,
  },
  /**
   * Course text can read either way.
   *
   * `writingDirection: 'auto'` lets the platform pick the direction from the
   * string itself, so an Arabic sentence lays out right to left even while the
   * rest of the app is left to right — which is exactly the case for an English
   * speaker taking the Arabic course. It is a no-op for the eight languages
   * that already read left to right, so it is safe on every shared style.
   */
  promptText: {
    fontFamily: fonts.display,
    fontSize: 22,
    lineHeight: 31,
    color: colors.secondary[900],
    writingDirection: 'auto',
  },
  /** Same dashed underline the tappable prompt words use, for the same reason. */
  promptHinted: {
    alignSelf: 'flex-start',
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderBottomColor: colors.secondary[300],
  },
  promptTranslation: {
    fontFamily: fonts.body,
    fontSize: 15,
    color: colors.secondary[400],
    marginTop: 6,
    writingDirection: 'auto',
  },
  answerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    minHeight: 62,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.secondary[200],
    paddingBottom: spacing.sm,
    marginBottom: spacing.lg,
  },
  answerOk: {
    borderBottomColor: colors.success[500],
    borderColor: colors.success[500],
  },
  answerBad: {
    borderBottomColor: colors.danger[500],
    borderColor: colors.danger[500],
  },
  answerPlaceholder: {
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.secondary[300],
  },
  bank: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  // Keeps the bank's layout stable when a tile is taken.
  bankGap: {
    height: 40,
    width: 0,
  },
  correction: {
    fontFamily: fonts.bodySemi,
    fontSize: 14,
    color: colors.danger[600],
    marginTop: -spacing.sm,
    marginBottom: spacing.md,
  },
  paragraphInput: {
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    padding: spacing.md,
    minHeight: 130,
    textAlignVertical: 'top',
    fontFamily: fonts.body,
    fontSize: 16,
    lineHeight: 23,
    color: colors.secondary[900],
  },
})
