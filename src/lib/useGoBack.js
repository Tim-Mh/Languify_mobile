import { useCallback } from 'react'
import { useRouter } from '@/navigation'

/**
 * Leaving a pushed screen, correctly, from anywhere.
 *
 * Two different mistakes were in the app before this, and they are opposites:
 *
 * - Bare `router.back()`. Fine most of the time, but a screen opened by a deep
 *   link has nothing behind it, and a tab navigator with no history of its own
 *   falls through to its first tab — which is Leagues, and is why back used to
 *   land there from all over the app. (`backBehavior="history"` on the
 *   navigator fixes the common case; this fixes the empty-history one.)
 *
 * - A hardcoded `router.replace('/somewhere')`. Always correct, and always
 *   correct to the *same* place, which is wrong the moment a screen has two
 *   ways in. Family is reachable from both the Shop and Profile, so its back
 *   button sent half its visitors somewhere they had never been.
 *
 * So: go back if there is anywhere to go back to, and otherwise replace with
 * the screen this one conceptually belongs under.
 */
export function useGoBack(fallback = '/home') {
  const router = useRouter()

  return useCallback(() => {
    if (router.canGoBack()) {
      router.back()
      return
    }
    router.replace(fallback)
  }, [router, fallback])
}

export default useGoBack
