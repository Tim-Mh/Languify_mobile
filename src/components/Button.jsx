import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated'

import { colors, fonts, radii } from '../theme'

const AnimatedPressable = Animated.createAnimatedComponent(Pressable)

/**
 * The chunky pressable button from the web app. The depth comes from a solid
 * darker slab underneath rather than a blurred shadow, and pressing collapses
 * that slab so the button physically sinks.
 */
const VARIANTS = {
  primary: { face: colors.primary[500], edge: colors.primary[700], label: colors.white },
  secondary: { face: colors.secondary[600], edge: colors.secondary[800], label: colors.white },
  outline: { face: colors.white, edge: colors.secondary[200], label: colors.secondary[700] },
  // The graded verdict in the lesson footer: the Continue button takes the
  // colour of the answer, so the result is readable from the button alone.
  success: { face: colors.success[500], edge: colors.success[700], label: colors.white },
  danger: { face: colors.danger[500], edge: colors.danger[700], label: colors.white },
  // Destructive, but not the thing you came to the screen to do: same weight as
  // `outline` so it sits beside Log out without shouting over it.
  dangerOutline: { face: colors.white, edge: colors.danger[300], label: colors.danger[600] },
}

const DEPTH = 4

export default function Button({
  label,
  onPress,
  variant = 'primary',
  style,
  accessibilityLabel,
  loading = false,
  disabled = false,
}) {
  const palette = VARIANTS[variant] ?? VARIANTS.primary
  const sink = useSharedValue(0)
  // A button mid-request must not fire twice, so loading blocks presses as
  // firmly as an explicit disabled does.
  const inert = disabled || loading

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: sink.value }],
  }))

  return (
    <View style={[styles.wrapper, style, inert && styles.inert]}>
      <View style={[styles.edge, { backgroundColor: palette.edge }]} />
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled: inert, busy: loading }}
        disabled={inert}
        onPress={onPress}
        onPressIn={() => {
          sink.value = withTiming(DEPTH, { duration: 60 })
        }}
        onPressOut={() => {
          sink.value = withTiming(0, { duration: 90 })
        }}
        style={[
          styles.face,
          faceStyle,
          {
            backgroundColor: palette.face,
            borderWidth: variant === 'outline' || variant === 'dangerOutline' ? 2 : 0,
            borderColor: palette.edge,
          },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={palette.label} />
        ) : (
          <Text style={[styles.label, { color: palette.label }]}>{label}</Text>
        )}
      </AnimatedPressable>
    </View>
  )
}

const styles = StyleSheet.create({
  wrapper: {
    // Room for the slab to show beneath the face.
    paddingBottom: DEPTH,
  },
  inert: {
    opacity: 0.55,
  },
  edge: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: DEPTH,
    bottom: 0,
    borderRadius: radii.lg,
  },
  face: {
    height: 56,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  label: {
    fontFamily: fonts.display,
    fontSize: 16,
    letterSpacing: 0.4,
  },
})
