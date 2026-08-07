import { useEffect, useRef } from 'react'
import { StyleSheet, View } from 'react-native'
import { useRouter } from '@/navigation'
import BootSplash from 'react-native-bootsplash'

import { useAuth } from '@/auth/AuthContext'
import { routeAfterAuth } from '@/auth/setupState'
import { SPLASH_BACKGROUND } from '@/theme'

/**
 * Decides where the app opens, and nothing else.
 *
 * This screen used to draw its own animated logo: the native splash was hidden
 * the moment it mounted, revealing a second, larger logo that sat for 1.7
 * seconds before routing. Two logo screens at two different sizes, which is
 * exactly what it looked like — the native mark is capped at 134dp by Android's
 * splash spec while this one was drawn at ~220, so the handoff read as a jump
 * rather than as a continuation.
 *
 * Now the native splash simply stays up until there is somewhere to go. One
 * splash, and the app opens sooner for losing the artificial delay: the wait is
 * however long auth takes rather than 1.7 seconds on top of it.
 *
 * The view underneath is the brand background rather than nothing, so the
 * single frame between the splash hiding and the next screen drawing is the
 * same colour as both, not white.
 */
export default function Splash() {
  const router = useRouter()
  const { ready, isSignedIn, user } = useAuth()

  /** Routing happens once. A second pass would fight the navigator. */
  const routed = useRef(false)

  useEffect(() => {
    // This screen renders nothing but the brand background, so when it fails to
    // route the app looks blank rather than broken. Worth saying out loud.
    if (__DEV__) console.log(`[splash] ready=${ready} signedIn=${isSignedIn} routed=${routed.current}`)

    if (!ready || routed.current) return

    routed.current = true

    // Hiding is a CALLBACK rather than the next statement. A navigation asked
    // for before the container is ready gets queued and applied later, so
    // hiding here would tear the native splash down while this screen — which
    // draws nothing but a background colour — is still the one on top. That is
    // the blank screen after the logo. Now the splash stays up until the first
    // real route is actually on screen, however long that takes.
    router.replace(isSignedIn ? routeAfterAuth(user) : '/onboarding', () => {
      BootSplash.hide({ fade: true }).catch(() => {
        // Already hidden, or no native splash in this build. Either way the
        // screen underneath is the one being shown.
      })
    })
  }, [isSignedIn, ready, router, user])

  return <View style={styles.screen} />
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: SPLASH_BACKGROUND,
  },
})
