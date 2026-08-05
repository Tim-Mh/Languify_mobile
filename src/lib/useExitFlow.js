import { useCallback } from 'react'
import { CommonActions, useNavigation } from '@react-navigation/native'
import { useRouter } from '@/navigation'

/**
 * Leaving a full-screen flow — a lesson, a trivia round — so that it is really
 * gone.
 *
 * Every screen in `src/screens/main` is a sibling in one bottom-tab navigator,
 * and that navigator runs with `backBehavior="history"` (see
 * `navigation/MainTabs.jsx`, and §4 of mobile.md). Its router keeps a `history`
 * array of visited route keys and pops the last one on back:
 *
 *     // @react-navigation/routers/src/TabRouter.tsx
 *     history = history.filter((it) => it.key !== currentRoute.key)
 *     history = history.concat({ type: 'route', key: route.key })
 *
 * `router.replace()` does not help here, because in a tab navigator there is no
 * stack entry to replace — it focuses another sibling and appends to that
 * history. So finishing a lesson left `[…, chapter, lesson, chapter]`, and one
 * press of the hardware back button went *back into the lesson*. Pressing back
 * again then hit the lesson's own "leave this lesson?" guard, which is exactly
 * what was reported.
 *
 * There is no `replace` that also means "and forget I was ever here", so this
 * removes the screen being left from the focus history first, and only then
 * navigates. Back from the destination goes wherever it went before the flow
 * started.
 *
 * Deliberately defensive: navigation state shapes move between versions, so if
 * anything is not as expected the history is left alone and the navigation
 * still happens. The worst case is the old behaviour, not a broken navigator.
 */
export function useExitFlow() {
  const navigation = useNavigation()
  const router = useRouter()

  return useCallback(
    (href) => {
      try {
        // Done while this screen is still focused and mounted, so the key we
        // are dropping is simply the current one — no need to guess it after
        // navigating away.
        navigation.dispatch((state) => {
          const leavingKey = state?.routes?.[state.index]?.key

          if (!leavingKey || !Array.isArray(state.history)) {
            // Nothing safe to rewrite. Reset to what is already there, which is
            // a no-op, rather than returning a falsy action.
            return CommonActions.reset(state)
          }

          return CommonActions.reset({
            ...state,
            history: state.history.filter((entry) => entry.key !== leavingKey),
          })
        })
      } catch {
        // Fall through: navigating still matters more than tidy history.
      }

      // Normal navigation, so route params (the chapter id) travel as usual.
      router.replace(href)
    },
    [navigation, router],
  )
}

export default useExitFlow
