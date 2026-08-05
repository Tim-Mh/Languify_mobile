import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SvgXml } from 'react-native-svg'
import ImageOff from 'lucide-react-native/icons/image-off'

import HintBubble, { useHintTarget } from '../HintBubble'
import { exerciseImage } from '../../lib/exerciseImages'
import { colors, fonts, radii, shadows, spacing } from '../../theme'

/**
 * One answer choice. After checking, the correct option always turns green even
 * if it was not the one picked, so a wrong answer teaches rather than just
 * scolding.
 *
 * The native-language hint is a floating bubble revealed by tapping, mirroring
 * the web's hover tooltip, rather than a second line of text baked into every
 * tile. A dashed underline marks which words have one, because a phone gives no
 * other clue that there is anything to reveal.
 */
export default function OptionTile({ label, hint, marked, selected, checked, isCorrect, onPress }) {
  const { open, toggle } = useHintTarget(hint)

  const state = !checked
    ? selected
      ? 'selected'
      : 'idle'
    : isCorrect
      ? 'correct'
      : selected
        ? 'wrong'
        : 'idle'

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: checked }}
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={() => {
        // Picking a word and reading what it means are the same gesture here,
        // exactly as hovering and clicking are on the web.
        toggle()
        onPress()
      }}
      disabled={checked}
      style={({ pressed }) => [
        styles.tile,
        styles[state],
        pressed && !checked && styles.pressed,
      ]}
    >
      <HintBubble text={hint} visible={open} />
      <Text style={[styles.label, styles[`${state}Label`], marked && styles.hinted]}>{label}</Text>
    </Pressable>
  )
}

/**
 * A picture answer: artwork above, the word below, in a two-column grid.
 *
 * Only `match_pairs` carries images, and the whole point of that exercise is
 * matching a word to a thing, so the picture is the answer and gets the space.
 * Some seeded content asks for files that were never drawn, so a missing image
 * degrades to a placeholder instead of an empty card.
 */
export function PictureTile({ label, image, selected, checked, isCorrect, onPress }) {
  const state = !checked
    ? selected
      ? 'selected'
      : 'idle'
    : isCorrect
      ? 'correct'
      : selected
        ? 'wrong'
        : 'idle'

  const xml = exerciseImage(image)

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: checked }}
      accessibilityLabel={label}
      onPress={onPress}
      disabled={checked}
      style={({ pressed }) => [
        styles.picture,
        styles[state],
        pressed && !checked && styles.pressed,
      ]}
    >
      <View style={styles.pictureArt}>
        {xml ? (
          <SvgXml xml={xml} width="100%" height="100%" />
        ) : (
          <ImageOff size={30} color={colors.secondary[200]} strokeWidth={1.8} />
        )}
      </View>

      <Text style={[styles.pictureLabel, styles[`${state}Label`]]} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  )
}

/** A word tile in a bank or answer row, for the ordering exercises. */
export function WordTile({ label, hint, marked, onPress, disabled, tone = 'idle' }) {
  const { open, toggle } = useHintTarget(hint)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}, ${hint}` : label}
      onPress={() => {
        toggle()
        onPress?.()
      }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.word,
        tone === 'placed' && styles.wordPlaced,
        tone === 'correct' && styles.correct,
        tone === 'wrong' && styles.wrong,
        pressed && !disabled && styles.pressed,
      ]}
    >
      <HintBubble text={hint} visible={open} />
      <Text
        style={[
          styles.wordLabel,
          tone === 'correct' && styles.correctLabel,
          tone === 'wrong' && styles.wrongLabel,
          marked && styles.hinted,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  )
}

/**
 * A word in a prompt that you can tap to hear and to read.
 *
 * Tapping does both jobs: it speaks the word and floats its translation above,
 * which is the mobile stand-in for the web's hover. A dashed underline marks
 * which words have one, so the learner knows what is worth tapping rather than
 * having to probe every word.
 */
export function GlossWord({ label, gloss, marked, onPress }) {
  const { open, toggle } = useHintTarget(gloss)

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={gloss ? `${label}, means ${gloss}` : label}
      onPress={() => {
        onPress?.()
        toggle()
      }}
      style={({ pressed }) => [styles.gloss, pressed && styles.pressed]}
    >
      <HintBubble text={gloss} visible={open} />
      <Text style={[styles.glossWord, marked && styles.glossWordHinted]}>{label}</Text>
    </Pressable>
  )
}

/** Empty slot shown where a word has not been placed yet. */
export function WordSlot() {
  return <View style={styles.slot} />
}

const styles = StyleSheet.create({
  tile: {
    borderWidth: 2,
    borderRadius: radii.lg,
    backgroundColor: colors.white,
    borderColor: colors.secondary[200],
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.sm,
  },
  idle: {},
  selected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  correct: {
    borderColor: colors.success[500],
    backgroundColor: colors.success[50],
  },
  wrong: {
    borderColor: colors.danger[500],
    backgroundColor: colors.danger[50],
  },
  pressed: {
    opacity: 0.75,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.secondary[900],
  },
  idleLabel: {},
  selectedLabel: {
    color: colors.primary[700],
  },
  correctLabel: {
    color: colors.success[700],
  },
  wrongLabel: {
    color: colors.danger[700],
  },
  /** Marks a word that has something to reveal. */
  hinted: {
    alignSelf: 'flex-start',
    borderBottomWidth: 1.5,
    borderStyle: 'dashed',
    borderBottomColor: colors.secondary[300],
  },
  picture: {
    width: '48%',
    borderWidth: 2,
    borderRadius: radii.xl,
    backgroundColor: colors.white,
    borderColor: colors.secondary[200],
    padding: spacing.sm,
    marginBottom: spacing.md,
    alignItems: 'center',
    ...shadows.card,
  },
  pictureArt: {
    width: '100%',
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  pictureLabel: {
    fontFamily: fonts.bodySemi,
    fontSize: 15,
    color: colors.secondary[700],
    textAlign: 'center',
  },
  word: {
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.md,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 9,
    alignItems: 'center',
  },
  wordPlaced: {
    borderColor: colors.primary[300],
    backgroundColor: colors.primary[50],
  },
  wordLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.secondary[900],
  },
  gloss: {
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: 4,
  },
  glossWord: {
    fontFamily: fonts.display,
    fontSize: 24,
    lineHeight: 33,
    color: colors.secondary[900],
  },
  glossWordHinted: {
    borderBottomWidth: 2,
    borderStyle: 'dashed',
    borderBottomColor: colors.secondary[300],
  },
  slot: {
    height: 40,
    minWidth: 56,
    borderRadius: radii.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.secondary[200],
  },
})
