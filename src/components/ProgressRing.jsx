import { StyleSheet, View } from 'react-native'
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg'

import { colors } from '../theme'

/**
 * A circular progress track with whatever you put inside it at the centre.
 *
 * The ring hugs its contents rather than framing them at a distance, so it
 * reads as a halo on the thing inside it and not as a donut chart.
 */
export default function ProgressRing({
  percent = 0,
  size = 100,
  thickness = 8,
  track = colors.secondary[100],
  children,
}) {
  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  // Any real progress gets a visible arc, but a course at exactly zero shows a
  // clean empty ring rather than a stray dot floating at twelve o'clock.
  const filled = percent > 0 ? Math.max(0.03, Math.min(1, percent / 100)) : 0

  return (
    <View style={[styles.host, { width: size, height: size }]}>
      <Svg width={size} height={size} style={styles.track}>
        <Defs>
          <LinearGradient id="ringFill" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor={colors.primary[400]} />
            <Stop offset="1" stopColor={colors.primary[600]} />
          </LinearGradient>
        </Defs>

        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={track}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringFill)"
          strokeWidth={thickness}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - filled)}
          // Starts the sweep at twelve o'clock instead of three.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {/* Absolutely positioned rather than laid out after the Svg: on web an
          in-flow sibling paints *below* a positioned one, so plain children
          would sit behind the ring and vanish.

          The offsets are written out rather than spread from
          `StyleSheet.absoluteFillObject`, and the host clips: children were
          escaping this box on Android and stacking *underneath* the ring
          instead of centring in it, which is what put the home hero's mascot
          below its own progress ring and half under the Keep going button.
          Explicit insets plus overflow:hidden make that impossible however the
          child is sized.

          `box-none`, not `none`: the wrapper itself must not swallow touches,
          but a pressable child still has to receive them. */}
      <View style={styles.centre} pointerEvents="box-none">
        {children}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  host: {
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  centre: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    // Clips the contents, not the host: the ring's stroke is centred on a
    // radius of (size - thickness) / 2, so its outer edge lands exactly on the
    // host's boundary and clipping there would shave a hairline off the ring.
    overflow: 'hidden',
  },
})
