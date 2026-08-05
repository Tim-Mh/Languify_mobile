import { Image, StyleSheet, Text, View } from 'react-native'

import { MASCOTS } from '../lib/characters'
import { colors, fonts, radii, shadows, spacing } from '../theme'

/**
 * The line of encouragement above every exercise, same four rotating messages
 * the web shows and picked the same way, so a given exercise says the same thing
 * in both products.
 *
 * The web draws an owl emoji here. This uses the app's actual mascot instead:
 * emoji render inconsistently or not at all across Android versions, and an owl
 * is not the character this product uses anywhere else.
 */
const HINTS = [
  "You're doing great! Take your time.",
  'Trust your instincts, give it a try!',
  'Almost there, stay focused!',
  "Every answer helps you learn. Let's go!",
]

export default function MascotHint({ exerciseId = 0 }) {
  // Modulo twice: ids are positive in practice, but a negative would index off
  // the front of the array and render nothing at all.
  const index = ((exerciseId % HINTS.length) + HINTS.length) % HINTS.length

  return (
    <View style={styles.row}>
      <View style={styles.avatar}>
        <Image source={MASCOTS[0]} style={styles.art} resizeMode="contain" />
      </View>
      <Text style={styles.text} numberOfLines={2}>
        {HINTS[index]}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.pill,
    paddingLeft: 5,
    paddingRight: spacing.md,
    paddingVertical: 5,
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  art: {
    width: '100%',
    height: '100%',
  },
  text: {
    flex: 1,
    // No `fontStyle: 'italic'` even though the web italicises this: only the
    // regular, semibold and bold Nunito files are bundled, so Android would
    // synthesise the slant by falling back to a different typeface entirely.
    fontFamily: fonts.body,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.secondary[500],
  },
})
