import { cloneElement, isValidElement, useEffect, useMemo } from 'react'
import { Pressable } from 'react-native'
import {
  CommonActions,
  StackActions,
  useFocusEffect as useNavigationFocusEffect,
  useNavigation as useReactNavigation,
  useRoute,
} from '@react-navigation/native'

import { navigationRef } from './navigationRef'
import { ROOT, resolvePath } from './routeMap'

/**
 * A router with the same surface the screens were written against.
 *
 * The Expo build navigated with `router.push('/home')` and
 * `router.replace({ pathname: '/chapter/[id]', params })`. That API is small,
 * it reads well, and 50 call sites use it, so it is kept and implemented on top
 * of React Navigation here rather than rewritten screen by screen. The screens
 * are unchanged apart from which module they import it from.
 */

/**
 * A navigation asked for before the container was ready, held until it is.
 *
 * React runs a child's effects before its parent's, so a screen that navigates
 * from its own mount effect — which the splash does, as soon as auth resolves —
 * runs *before* `NavigationContainer` has marked its ref ready. These calls used
 * to be dropped on the floor, silently: the splash asked to leave, nothing
 * happened, and because it only asks once the app sat on an empty screen
 * forever. A 1.7 second delay used to hide this by accident.
 *
 * Only the most recent is kept. Two navigations queued before the app has even
 * drawn means the second one is the answer; replaying both would just flash
 * through the first.
 */
let pendingNavigation = null

/**
 * Runs whatever was asked for too early. Called from `RootNavigator`'s
 * `onReady`, which is the moment the ref becomes usable.
 */
export function flushPendingNavigation() {
  const next = pendingNavigation
  pendingNavigation = null

  if (next) next()
}

/** The root-navigator screen currently showing, or null before it mounts. */
function currentRootName() {
  if (!navigationRef.isReady()) return null

  const state = navigationRef.getRootState()

  return state?.routes?.[state.index]?.name ?? null
}

/**
 * Focuses `screen` inside `root`, letting React Navigation build the nested
 * action. `screen` is null for a root screen that has no children.
 */
function navigateTo({ root, screen, params }) {
  if (screen) {
    navigationRef.dispatch(
      CommonActions.navigate({ name: root, params: { screen, params } }),
    )
    return
  }

  navigationRef.dispatch(CommonActions.navigate({ name: root, params }))
}

/**
 * Goes to `target` without leaving the current screen behind to go back to.
 *
 * Crossing between root screens — splash to onboarding, login to home — resets
 * the root rather than pushing, because none of those should be reachable with
 * the back button afterwards.
 *
 * The reset deliberately names only the destination root and then navigates to
 * the nested screen in a second step. Handing `reset` a partial nested state
 * would make that state authoritative, and the tab navigator would come back
 * with only the one route in it — `TabBar` maps over `state.routes` to draw the
 * bar, so it would render a single tab. Letting the navigator initialise itself
 * keeps all seventeen routes present, and the navigate then focuses the right
 * one.
 */
function resetTo(target) {
  navigationRef.dispatch(
    CommonActions.reset({ index: 0, routes: [{ name: target.root }] }),
  )

  if (target.screen) navigateTo(target)
}

function push(href) {
  const target = resolvePath(href)
  if (!target) return

  // Held rather than dropped. See `pendingNavigation`.
  if (!navigationRef.isReady()) {
    pendingNavigation = () => navigateTo(target)

    return
  }

  navigateTo(target)
}

/**
 * Replaces the current screen with `href`.
 *
 * Three cases, because "replace" means something different in each navigator:
 *
 * - Inside the tabs, there is no stack entry to replace. Expo Router's tab
 *   router focused the sibling and appended to its focus history, so a plain
 *   navigate is the faithful translation — and `useExitFlow` is built on that
 *   exact behaviour, rewriting the history itself before it calls this.
 * - Inside the auth stack, a real stack replace is what stops the back button
 *   returning to a screen the learner has already finished with.
 * - Between roots, reset, so the whole flow that led here is gone.
 */
function replace(href) {
  const target = resolvePath(href)
  if (!target) return

  // Held rather than dropped. This is the one that stranded the app on a blank
  // screen: the splash replaces itself with the first real route the moment
  // auth resolves, which can be before the container is ready.
  if (!navigationRef.isReady()) {
    pendingNavigation = () => replace(href)

    return
  }

  const from = currentRootName()

  if (from !== target.root) {
    resetTo(target)
    return
  }

  if (target.root === ROOT.MAIN) {
    navigateTo(target)
    return
  }

  if (target.screen) {
    navigationRef.dispatch(StackActions.replace(target.screen, target.params))
    return
  }

  navigateTo(target)
}

function back() {
  if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack()
}

function canGoBack() {
  return navigationRef.isReady() && navigationRef.canGoBack()
}

/**
 * The module-level router, for code with no component behind it.
 *
 * `navigate` is an alias of `push` because a tab navigator treats them the
 * same, and keeping it means a call site that reaches for the more familiar
 * name still works.
 */
export const router = {
  push,
  replace,
  back,
  canGoBack,
  navigate: push,
}

export function useRouter() {
  return router
}

/**
 * This screen's route params.
 *
 * Named for the Expo Router hook it stands in for. Always an object, never
 * undefined: screens destructure straight off it (`const { id } = ...`), so a
 * screen reached with no params must not throw.
 */
export function useLocalSearchParams() {
  const route = useRoute()

  return route?.params ?? EMPTY_PARAMS
}

/** Shared so a screen with no params gets a stable identity across renders. */
const EMPTY_PARAMS = Object.freeze({})

/** Re-exported unchanged; React Navigation owns both of these already. */
export const useFocusEffect = useNavigationFocusEffect
export const useNavigation = useReactNavigation

/**
 * Sends the learner somewhere else as soon as it renders.
 *
 * Used by the auth and setup guards, which decide during render that this is
 * not the right screen. The navigation happens in an effect rather than inline
 * because dispatching while React is still rendering warns and can be dropped.
 */
export function Redirect({ href }) {
  useEffect(() => {
    replace(href)
    // A path is either a string or a small object rebuilt on each render, so it
    // is compared by value. Without this the effect re-fires every render and
    // the app navigates in a loop.
  }, [JSON.stringify(href)]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}

/**
 * A tappable that navigates, mirroring Expo Router's `<Link>`.
 *
 * Only the `asChild` form is used in this app: the child is already a styled
 * `Pressable`, so the link hands it an `onPress` rather than wrapping it in
 * anything that would change the layout. Without `asChild` it falls back to its
 * own Pressable so the component is still complete.
 */
export function Link({ href, asChild, children, onPress, ...rest }) {
  const handlePress = useMemo(
    () => (event) => {
      onPress?.(event)
      if (!event?.defaultPrevented) push(href)
    },
    [href, onPress],
  )

  if (asChild && isValidElement(children)) {
    return cloneElement(children, { onPress: handlePress })
  }

  return (
    <Pressable accessibilityRole="link" onPress={handlePress} {...rest}>
      {children}
    </Pressable>
  )
}
