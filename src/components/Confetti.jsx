import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Easing, StyleSheet, View } from 'react-native'

import { colors } from '../theme'

/**
 * The celebration burst: lesson finished, chest opened, quest collected, badge
 * claimed, purchase made.
 *
 * Hand-written on React Native's core `Animated`, deliberately, after two
 * previous attempts failed for opposite reasons:
 *
 * - A Reanimated version never started at all. This almost always renders
 *   inside a `Modal`, which is its own native window, and a Reanimated
 *   animation mounted around the moment that window attaches can silently never
 *   run, with nothing in the logs.
 * - `react-native-confetti-cannon` fired, but measured the screen with
 *   `Dimensions.get('window')` and started in `componentDidMount`. Inside a
 *   modal that meant a three-second animation against geometry it had guessed,
 *   begun before there was anything on screen — so it was effectively over
 *   before it could be seen.
 *
 * Both problems come from the same place: not knowing when the thing is
 * actually visible and how big it is. So this waits for its own `onLayout`
 * before starting, and takes every dimension from that layout rather than from
 * the window. It cannot begin against a detached view, and it cannot animate to
 * the wrong place. Callers still gate the mount on the modal being shown, which
 * is belt and braces.
 *
 * One shared `Animated.Value` drives every piece through interpolation, so the
 * whole burst is a single native-driven animation rather than sixty of them.
 */
const PALETTE = [
  colors.primary[300],
  colors.primary[500],
  colors.secondary[400],
  colors.accent[400],
  colors.warning[400],
  colors.success[400],
]

/** How long the pieces stay in the air. */
const DURATION_MS = 2600

function random(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * The fixed facts about one piece, decided once. Everything animated is derived
 * from these plus the shared clock, so a re-render never reshuffles the burst.
 */
function makePieces(count) {
  return Array.from({ length: count }, (_, index) => {
    // Alternating sides, so the two streams cross in the middle rather than one
    // corner emptying itself across the screen.
    const fromLeft = index % 2 === 0

    return {
      key: index,
      fromLeft,
      /** Where it lands, as a fraction of the width. */
      landing: fromLeft ? random(0.15, 1.05) : random(-0.05, 0.85),
      /** Peak height of the arc, as a fraction of the height. */
      peak: random(0.55, 1),
      /** When it launches, as a fraction of the total. */
      delay: random(0, 0.25),
      /** How far it drifts sideways on the way down. */
      swing: random(10, 34) * (fromLeft ? 1 : -1),
      spin: random(2, 6) * (Math.random() < 0.5 ? -1 : 1),
      width: random(7, 13),
      height: random(9, 16),
      rounded: Math.random() < 0.4,
      color: PALETTE[index % PALETTE.length],
    }
  })
}

export default function Confetti({ count = 70 }) {
  const [size, setSize] = useState(null)
  const clock = useRef(new Animated.Value(0)).current
  const pieces = useMemo(() => makePieces(count), [count])

  // Started from the layout callback, not from mount: this is the first moment
  // the view provably exists at a known size, which is exactly what the two
  // previous versions were missing.
  useEffect(() => {
    if (!size) return undefined

    const animation = Animated.timing(clock, {
      toValue: 1,
      duration: DURATION_MS,
      easing: Easing.linear,
      useNativeDriver: true,
    })

    animation.start()
    return () => animation.stop()
  }, [size, clock])

  return (
    <View
      pointerEvents="none"
      style={styles.host}
      onLayout={(event) => {
        const { width, height } = event.nativeEvent.layout
        // Only once. A re-layout mid-burst would restart the animation and the
        // pieces would jump back to the corners.
        if (width > 0 && height > 0) setSize((current) => current ?? { width, height })
      }}
    >
      {size
        ? pieces.map((piece) => (
            <Piece key={piece.key} piece={piece} clock={clock} size={size} />
          ))
        : null}
    </View>
  )
}

function Piece({ piece, clock, size }) {
  const { width, height } = size
  // Everything is expressed on the shared 0→1 clock, offset by this piece's
  // launch delay so they do not all leave the cannon on the same frame.
  const start = piece.delay
  const apex = start + (1 - start) * 0.32

  const originX = piece.fromLeft ? -12 : width + 12
  const landingX = piece.landing * width

  const translateX = clock.interpolate({
    inputRange: [0, start, apex, 1],
    outputRange: [originX, originX, landingX - piece.swing, landingX + piece.swing],
    extrapolate: 'clamp',
  })

  // Anchored at the bottom of the host, so 0 is the floor and negative is up.
  const translateY = clock.interpolate({
    inputRange: [0, start, apex, 1],
    outputRange: [0, 0, -piece.peak * height, 0],
    extrapolate: 'clamp',
  })

  const rotate = clock.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${piece.spin * 360}deg`],
  })

  // Invisible until it launches, and gone before it piles up on the floor.
  const opacity = clock.interpolate({
    inputRange: [0, start, start + 0.01, 0.82, 1],
    outputRange: [0, 0, 1, 1, 0],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.piece, { transform: [{ translateX }, { translateY }] }, { opacity }]}
    >
      <Animated.View
        style={{
          width: piece.width,
          height: piece.height,
          borderRadius: piece.rounded ? piece.width : 2,
          backgroundColor: piece.color,
          transform: [{ rotate }],
        }}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    // Drawn over the card it celebrates. Android orders overlapping siblings by
    // elevation before document order, so zIndex alone would not lift it there.
    zIndex: 10,
    elevation: 10,
  },
  piece: {
    position: 'absolute',
    left: 0,
    bottom: 0,
  },
})
