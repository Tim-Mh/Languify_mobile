import { createNavigationContainerRef } from '@react-navigation/native'

/**
 * The navigator, reachable from outside React.
 *
 * Most navigation happens from a screen and could use `useNavigation()`, but not
 * all of it: a tapped push notification is handled by a module that has no
 * component behind it, and the session-expiry handler fires from an API
 * interceptor. One ref keeps every path through the app going the same way,
 * which also means `useRouter()` behaves identically wherever it is called.
 */
export const navigationRef = createNavigationContainerRef()

/**
 * Whether the navigator is mounted and ready to take an action.
 *
 * Navigation attempted before the container has mounted is silently dropped by
 * React Navigation, so callers check this rather than queueing — everything that
 * navigates this early (the splash's redirect, a cold-start push) already waits
 * on its own condition before firing.
 */
export function isNavigationReady() {
  return navigationRef.isReady()
}
