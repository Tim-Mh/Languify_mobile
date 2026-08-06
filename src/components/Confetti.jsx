import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native'

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
 * A third version then waited for its own `onLayout` before starting, which
 * traded one silent failure for another: inside a modal, an absolutely
 * positioned view can report 0x0 or never lay out at all, so the burst simply
 * never began.
 *
 * What actually settles it is that the *caller* decides when this is visible —
 * `RewardModal` mounts it only once the modal window is up — so this no longer
 * has to infer that from a measurement. It takes its size from the window,
 * starts immediately, and is rendered as a sibling of the scrim rather than
 * inside it, clear of both the animated card's elevation and any Reanimated
 * parent.
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
  /**
   * Seeded from the window rather than waiting for `onLayout`.
   *
   * Waiting was the third way this failed to appear. The host is an absolutely
   * positioned view inside a Reanimated view inside a `Modal`, and in that
   * nesting `onLayout` can report 0x0 or never fire at all — leaving `size`
   * null, no pieces rendered, and nothing at all in the logs to say why.
   *
   * The reason it waited was to avoid starting before the burst could be seen.
   * That is already handled, and better, by the caller: `RewardModal` only
   * mounts this once the modal window is actually up. So the size no longer has
   * to carry that job, and the window is the right measurement anyway — the
   * host fills a full-screen scrim.
   *
   * `onLayout` still refines it if it arrives with something real, but nothing
   * depends on it now.
   */
  const [size, setSize] = useState(() => {
    const { width, height } = Dimensions.get('window')

    return width > 0 && height > 0 ? { width, height } : null
  })

  const clock = useRef(new Animated.Value(0)).current
  const pieces = useMemo(() => makePieces(count), [count])

  useEffect(() => {
    // Logged because this has now failed to appear three times, each time
    // silently: nothing throws when a burst never starts.
    if (__DEV__) {
      console.log(
        size ? `[confetti] starting ${size.width}x${size.height}` : '[confetti] no size, not starting',
      )
    }

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
        // Only once, and only if nothing has been measured yet. A re-layout
        // mid-burst would restart the animation and the pieces would jump back
        // to the corners.
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
    // No `overflow: hidden`. Every piece launches from just outside the frame
    // (`originX` is -12 or width + 12), so clipping to the host removed them at
    // exactly the moment they should have been arriving.
    //
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
