/**
 * The navigation surface the screens import.
 *
 * Everything a screen used to get from `expo-router` comes from here instead,
 * with the same names and the same behaviour, so a screen's only change is the
 * import path. See `router.js` for how each piece maps onto React Navigation.
 */
export {
  Link,
  Redirect,
  router,
  useFocusEffect,
  useLocalSearchParams,
  useNavigation,
  useRouter,
} from './router'

export { navigationRef, isNavigationReady } from './navigationRef'
export { ROOT, AUTH_SCREENS, TAB_SCREENS, resolvePath, isTabScreen } from './routeMap'
export { default as RootNavigator } from './RootNavigator'
