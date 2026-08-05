import { forwardRef, useState } from 'react'
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native'

import { colors, fonts, radii, spacing } from '../theme'

/**
 * Labelled text input with inline error text. The border colour carries the
 * state (focused / error) so a mistake is visible without reading the message.
 */
const TextField = forwardRef(function TextField(
  { label, error, secureToggle = false, style, inputStyle, ...props },
  ref,
) {
  const [focused, setFocused] = useState(false)
  const [hidden, setHidden] = useState(secureToggle)

  const borderColor = error
    ? colors.danger[500]
    : focused
      ? colors.primary[500]
      : colors.secondary[200]

  return (
    <View style={[styles.wrapper, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      {/* `alignItems` is only relaxed for a multiline field: a single-line
          input has to stay vertically centred in its row, while a textarea has
          to fill it from the top or the first line floats in the middle. */}
      <View style={[styles.inputRow, props.multiline && styles.inputRowMultiline, { borderColor }]}>
        <TextInput
          ref={ref}
          // `inputStyle` last so a caller can override the fixed height, which
          // is what a multiline field needs — without it the row stays 52pt
          // tall however many lines are typed.
          style={[styles.input, inputStyle]}
          placeholderTextColor={colors.secondary[300]}
          secureTextEntry={hidden}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />

        {secureToggle ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
            onPress={() => setHidden((value) => !value)}
            hitSlop={10}
            style={styles.reveal}
          >
            <Text style={styles.revealLabel}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  label: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    color: colors.secondary[700],
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderWidth: 2,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
  },
  inputRowMultiline: {
    alignItems: 'stretch',
  },
  input: {
    flex: 1,
    height: 52,
    fontFamily: fonts.body,
    fontSize: 16,
    color: colors.secondary[900],
  },
  reveal: {
    paddingLeft: spacing.sm,
  },
  revealLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.primary[600],
  },
  error: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.danger[600],
    marginTop: 6,
  },
})

export default TextField
