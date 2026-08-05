import { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from '@/navigation'
import BootSplash from 'react-native-bootsplash'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'


import { useAuth } from '@/auth/AuthContext'
import { routeAfterAuth } from '@/auth/setupState'
import { useLayout } from '@/lib/responsive'
import { colors, radii, SPLASH_BACKGROUND } from '@/theme'

const MIN_VISIBLE_MS = 1700

function LoadingDot({ index }) {
  const lift = useSharedValue(0)

  useEffect(() => {
    lift.value = withDelay(
      700 + index * 140,
      withRepeat(
        withSequence(
          withTiming(-7, { duration: 320, easing: Easing.out(Easing.quad) }),
          withTiming(0, { duration: 320, easing: Easing.in(Easing.quad) }),
        ),
        -1,
        false,
      ),
    )
  }, [index, lift])

  const style = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }))

  return <Animated.View style={[styles.dot, style]} />
}

export default function Splash() {
  const router = useRouter()
  const { ready, isSignedIn, user } = useAuth()
  const { width, height } = useLayout()

  // Sized from the screen so it never crowds a small phone or look lost on a
  // tablet.
  const logoSize = Math.round(Math.min(width * 0.56, height * 0.28))

  const lift = useSharedValue(0)
  const scale = useSharedValue(0.92)
  const opacity = useSharedValue(0)

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 420 })
    scale.value = withSequence(
      withTiming(1.04, { duration: 380, easing: Easing.out(Easing.quad) }),
      withSpring(1, { damping: 12, stiffness: 140 }),
    )
    lift.value = withDelay(240, withSpring(-14, { damping: 15, stiffness: 120 }))
  }, [lift, opacity, scale])


  // Handed over once this screen has actually painted, so the native splash
  // gives way to the animated one rather than to a blank frame. The fade is
  // what makes the two read as a single screen — they draw the same logo on the
  // same background, so nothing should visibly change at the swap.
  useEffect(() => {
    const timer = setTimeout(() => {
      BootSplash.hide({ fade: true }).catch(() => {
        // Already hidden, or no native splash in this build. Either way the
        // screen underneath is the one being shown.
      })
    }, 0)

    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {

    if (!ready) return undefined

    let cancelled = false

    const timer = setTimeout(() => {
      if (cancelled) return
      router.replace(isSignedIn ? routeAfterAuth(user) : '/onboarding')
    }, MIN_VISIBLE_MS)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [isSignedIn, ready, router, user])

  const logoStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: lift.value }, { scale: scale.value }],
  }))

  return (
    <View style={styles.screen}>
      {/* Soft brand blobs, kept well behind the logo. */}
      <View style={[styles.blob, styles.blobTop]} />
      <View style={[styles.blob, styles.blobBottom]} />

      {/* The logo already carries the wordmark and the tagline, so there is no
          separate text to animate in underneath it. */}
      <Animated.Image
        source={require('@assets/logo.png')}
        style={[{ width: logoSize, height: logoSize }, logoStyle]}
        resizeMode="contain"
      />

      <View style={styles.dots}>
        {[0, 1, 2].map((i) => (
          <LoadingDot key={i} index={i} />
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  blob: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  blobTop: {
    width: 320,
    height: 320,
    top: -110,
    right: -90,
    backgroundColor: colors.primary[100],
  },
  blobBottom: {
    width: 380,
    height: 380,
    bottom: -150,
    left: -120,
    backgroundColor: colors.secondary[100],
  },
  dots: {
    position: 'absolute',
    bottom: 72,
    flexDirection: 'row',
    gap: 10,
  },
  dot: {
    width: 9,
    height: 9,
    borderRadius: radii.pill,
    backgroundColor: colors.primary[400],
  },
})
