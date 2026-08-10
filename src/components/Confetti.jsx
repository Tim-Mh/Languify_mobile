import { useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Dimensions, Easing, StyleSheet, View } from 'react-native'

import { colors } from '../theme'

/**
 * The celebration burst: lesson finished, chest opened, quest collected, badge
 * claimed, purchase made.
 *
 * ---
 *
 * WHY IT IS BUILT THIS WAY (three earlier attempts failed, each silently):
 *
 * - A Reanimated version never started at all. This almost always renders
 *   inside a `Modal`, which is its own native window, and a Reanimated
 *   animation mounted around the moment that window attaches can silently never
 *   run, with nothing in the logs.
 * - `react-native-confetti-cannon` fired, but measured with
 *   `Dimensions.get('window')` and started in `componentDidMount`. Inside a
 *   modal that meant a three-second animation against guessed geometry, begun
 *   before there was anything on screen — over before it could be seen.
 * - A third version waited for its own `onLayout`, which traded one silent
 *   failure for another: inside a modal an absolutely positioned view can
 *   report 0x0 or never lay out, so the burst simply never began.
 *
 * What settles it is that the CALLER decides when this is visible —
 * `RewardModal` mounts it only once the modal window is up — so this does not
 * have to infer that from a measurement.
 *
 * ---
 *
 * HOW THE MOTION IS BUILT
 *
 * Every piece follows a real projectile path, sampled into the interpolation
 * rather than described by keyframes. The previous version used three points
 * (origin, apex, floor) on a linear clock, which had four visible problems:
 * the arc was two straight segments rather than a curve, the rise and fall took
 * equal time so nothing accelerated, every piece landed on exactly the bottom
 * edge and vanished there in a row, and the only rotation was flat spin — so
 * they read as propellers rather than paper.
 *
 * Now each piece gets `x = vx·t` and `y = vy·t − ½g·t²` sampled at SAMPLES
 * points. That is a genuine parabola: fast off the launcher, slow at the apex,
 * accelerating on the way down. Pieces fall PAST the bottom and leave the
 * screen instead of piling on it, and each has its own lifetime so they do not
 * all finish on the same frame.
 *
 * Flutter is the other half of looking like paper: `scaleX` swings through zero
 * so a piece turns edge-on and briefly disappears, the way a real scrap does.
 * It is a transform, so it still runs on the native driver.
 *
 * One shared `Animated.Value` drives everything through interpolation, so the
 * whole burst is a single native-driven animation rather than seventy.
 */
const PALETTE = [
  colors.primary[300],
  colors.primary[500],
  colors.secondary[400],
  colors.accent[400],
  colors.warning[400],
  colors.success[400],
]

/** How long the burst lasts, end to end. */
const DURATION_MS = 3000

/**
 * Points sampled along each piece's path.
 *
 * `interpolate` joins samples with straight lines, so the count has to be high
 * enough that the fastest part of the path — the tail, where gravity has been
 * accelerating the piece the longest — still reads as a curve.
 *
 * Measured as the worst gap between the straight chord and the true parabola,
 * on an 800px-tall screen:
 *
 *     3 samples   up to 309px off      <- what the old version drew
 *    12 samples   up to  10px off
 *    18 samples   up to   4px off
 *    26 samples   up to   2px off
 *
 * Eighteen is where it stops being visible; twenty-six buys two pixels for a
 * third more work. Seventy pieces of eighteen floats is nothing to build.
 */
const SAMPLES = 18

function random(min, max) {
  return min + Math.random() * (max - min)
}

/**
 * One piece, decided once: its launch, its path and its flutter, all
 * precomputed. Everything animated is derived from these plus the shared clock,
 * so a re-render never reshuffles the burst.
 */
function makePiece(index) {
  // Alternating sides, so the two streams cross in the middle rather than one
  // corner emptying itself across the screen.
  const fromLeft = index % 2 === 0
  const direction = fromLeft ? 1 : -1

  // Launch angle and speed, in fractions of the host per unit of the piece's
  // own life. Steep and fast: a cannon, not a lob.
  const vx = random(0.55, 1.5) * direction
  const vy = random(2.6, 4.2)

  // Gravity chosen so the apex lands about a third of the way through, which is
  // what makes the fall longer than the rise — the thing that reads as weight.
  const gravity = vy / 0.34

  const xs = []
  const ys = []
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1)
    xs.push(vx * t)
    // Negative is up: the host is anchored at the bottom.
    ys.push(-(vy * t - 0.5 * gravity * t * t))
  }

  // Flutter: |cos| so the piece squashes to edge-on and opens out again. The
  // floor stops it vanishing completely on a frame it should still be seen.
  const spins = random(1.5, 3.5)
  const phase = random(0, Math.PI * 2)
  const flutter = []
  for (let i = 0; i < SAMPLES; i++) {
    const t = i / (SAMPLES - 1)
    flutter.push(Math.max(0.12, Math.abs(Math.cos(spins * Math.PI * t + phase))))
  }

  return {
    key: index,
    fromLeft,
    xs,
    ys,
    flutter,
    /** When it launches, as a fraction of the burst. Never 0: the opacity
     *  ramp needs a gap between `start` and the frame after it. */
    delay: random(0.01, 0.22),
    /** How much of the burst it is alive for. */
    life: random(0.7, 1),
    spin: random(1.5, 4) * (Math.random() < 0.5 ? -1 : 1),
    width: random(7, 13),
    height: random(9, 16),
    rounded: Math.random() < 0.35,
    color: PALETTE[index % PALETTE.length],
  }
}

export default function Confetti({ count = 70 }) {
  /**
   * Seeded from the window rather than waiting for `onLayout`.
   *
   * Waiting was the third way this failed to appear: in this nesting —
   * absolutely positioned view, inside a Reanimated view, inside a `Modal` —
   * `onLayout` can report 0x0 or never fire, leaving no pieces and nothing in
   * the logs to say why. The window is the right measurement anyway, since the
   * host fills a full-screen scrim.
   */
  const [size, setSize] = useState(() => {
    const { width, height } = Dimensions.get('window')

    return width > 0 && height > 0 ? { width, height } : null
  })

  const clock = useRef(new Animated.Value(0)).current
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => makePiece(i)), [count])

  useEffect(() => {
    if (!size) return undefined

    const animation = Animated.timing(clock, {
      toValue: 1,
      duration: DURATION_MS,
      // The clock stays linear on purpose. The shape of the motion lives in the
      // sampled parabola, not in the easing — putting a curve here as well
      // would bend the physics out of true.
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
      {size ? pieces.map((piece) => <Piece key={piece.key} piece={piece} clock={clock} size={size} />) : null}
    </View>
  )
}

function Piece({ piece, clock, size }) {
  const { width, height } = size

  const start = piece.delay
  const end = Math.min(1, start + piece.life)

  // The piece's own 0→1 life, expressed on the shared clock. The leading 0 entry
  // holds it at the launcher until its turn comes.
  const input = [0]
  for (let i = 0; i < SAMPLES; i++) {
    input.push(start + (end - start) * (i / (SAMPLES - 1)))
  }

  const originX = piece.fromLeft ? -14 : width + 14

  const translateX = clock.interpolate({
    inputRange: input,
    outputRange: [originX, ...piece.xs.map((x) => originX + x * width)],
    extrapolate: 'clamp',
  })

  const translateY = clock.interpolate({
    inputRange: input,
    // Anchored at the bottom of the host, so 0 is the floor and negative is up.
    // The tail of the parabola goes well past 0, which is what carries the
    // pieces off the bottom of the screen rather than stacking them on it.
    outputRange: [0, ...piece.ys.map((y) => y * height)],
    extrapolate: 'clamp',
  })

  const scaleX = clock.interpolate({
    inputRange: input,
    outputRange: [1, ...piece.flutter],
    extrapolate: 'clamp',
  })

  const rotate = clock.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', `${piece.spin * 360}deg`],
  })

  // Visible the instant it launches, and faded over the last stretch of its own
  // life rather than on a shared schedule — so they thin out instead of the
  // whole burst blinking off together.
  const opacity = clock.interpolate({
    inputRange: [0, start, start + 0.008, end - (end - start) * 0.25, end],
    outputRange: [0, 0, 1, 1, 0],
    extrapolate: 'clamp',
  })

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.piece, { opacity, transform: [{ translateX }, { translateY }] }]}
    >
      <Animated.View
        style={{
          width: piece.width,
          height: piece.height,
          borderRadius: piece.rounded ? piece.width : 2,
          backgroundColor: piece.color,
          transform: [{ rotate }, { scaleX }],
        }}
      />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  host: {
    ...StyleSheet.absoluteFillObject,
    // No `overflow: hidden`. Every piece launches from just outside the frame
    // (`originX` is -14 or width + 14), so clipping to the host removed them at
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
