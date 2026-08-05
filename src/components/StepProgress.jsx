import { useEffect } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated'
import Svg, { Path } from 'react-native-svg'

import { colors, fonts, radii, spacing } from '../theme'

function BackChevron({ color }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24">
      <Path
        d="M15 5 L8 12 L15 19"
        stroke={color}
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  )
}

/**
 * Back button plus a single continuous progress bar that fills as steps
 * complete. One growing bar rather than separate segments, so the movement
 * tracks the slide underneath it instead of snapping.
 */
export default function StepProgress({ step, totalSteps, onBack, canGoBack }) {
  const fill = useSharedValue(step / totalSteps)

  useEffect(() => {
    fill.value = withTiming(step / totalSteps, {
      // Slightly longer than the slide so the bar settles just after the page
      // does, which reads as the bar responding to the move.
      duration: 380,
      easing: Easing.out(Easing.cubic),
    })
  }, [fill, step, totalSteps])

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(4, fill.value * 100)}%`,
  }))

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        accessibilityState={{ disabled: !canGoBack }}
        onPress={onBack}
        disabled={!canGoBack}
        hitSlop={12}
        style={({ pressed }) => [styles.back, pressed && styles.backPressed]}
      >
        <BackChevron color={canGoBack ? colors.secondary[500] : colors.secondary[200]} />
      </Pressable>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, fillStyle]} />
      </View>

      <Text style={styles.count}>
        {step}/{totalSteps}
      </Text>
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  back: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backPressed: {
    opacity: 0.5,
  },
  track: {
    flex: 1,
    height: 10,
    borderRadius: radii.pill,
    backgroundColor: colors.secondary[100],
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary[500],
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    color: colors.secondary[400],
    minWidth: 30,
    textAlign: 'right',
  },
})
