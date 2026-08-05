import { Pressable, StyleSheet, Text, View } from 'react-native'
import Check from 'lucide-react-native/icons/check'

import { colors, fonts, radii, spacing } from '../theme'

/**
 * A selectable option row used across the setup steps. Selection is shown by
 * both the border and a tick, not colour alone, so it reads for colour-blind
 * users too.
 */
export default function ChoiceCard({ title, subtitle, leading, selected, onPress, disabled }) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled: Boolean(disabled) }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
        pressed && !disabled && styles.cardPressed,
      ]}
    >
      {leading ? <View style={styles.leading}>{leading}</View> : null}

      <View style={styles.copy}>
        <Text style={[styles.title, selected && styles.titleSelected]}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={[styles.tick, selected && styles.tickOn]}>
        {selected ? <Check size={14} color={colors.white} strokeWidth={3} /> : null}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  cardPressed: {
    opacity: 0.75,
  },
  cardDisabled: {
    opacity: 0.4,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  title: {
    fontFamily: fonts.display,
    fontSize: 16,
    color: colors.secondary[900],
  },
  titleSelected: {
    color: colors.primary[700],
  },
  subtitle: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
    color: colors.secondary[400],
    marginTop: 2,
  },
  tick: {
    width: 24,
    height: 24,
    borderRadius: radii.pill,
    borderWidth: 2,
    borderColor: colors.secondary[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickOn: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
})
