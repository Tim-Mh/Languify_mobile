/**
 * The one place that knows how a path maps onto a React Navigation screen.
 *
 * The Expo build routed by file path (`/chapter/[id]`), and three things still
 * hand us paths in that shape: the screens themselves, `src/routes.js`, and the
 * backend, which puts a route path in every push payload's `data.url`. Rather
 * than rewrite 50 call sites and re-teach the backend a new vocabulary, the
 * paths stay the public interface and this module translates them.
 *
 * Two shapes arrive here and both have to work:
 *
 *   - a template plus params, as the screens write it:
 *     `{ pathname: '/chapter/[id]', params: { id: '42' } }`
 *   - a concrete path, as a push notification sends it: `/chapter/42`
 *
 * Tab screen names are deliberately the same strings the Expo build used
 * (`'home'`, `'chapter/[id]'`). `TabBar` compares `route.name` against the
 * `tabBarParent` option to decide which tab stays lit, so keeping the names
 * identical is what lets that component port over untouched.
 */

/** Root-level screens, outside the tab navigator. */
export const ROOT = {
  SPLASH: 'Splash',
  ONBOARDING: 'Onboarding',
  AUTH: 'Auth',
  SETUP: 'Setup',
  MAIN: 'Main',
}

/** Screens inside the auth stack. */
export const AUTH_SCREENS = {
  LOGIN: 'Login',
  REGISTER: 'Register',
  FORGOT_PASSWORD: 'ForgotPassword',
  RESET_PASSWORD: 'ResetPassword',
  VERIFY_OTP: 'VerifyOtp',
}

/**
 * Every tab-navigator screen, in the order they are declared.
 *
 * Order is the visual order in the bar, which is why `home` sits third of the
 * five visible ones — it is the raised centre button.
 */
export const TAB_SCREENS = [
  'leaderboard',
  'trivia',
  'home',
  'rewards',
  'profile',
  'shop',
  'avatar',
  'family',
  'chapter/[id]',
  'courses',
  'notifications',
  'add-course',
  'alphabet',
  'streak',
  'hearts',
  'legal',
  'contact',
  'lesson/[id]',
  'trivia/[topic]',
]

/** Paths with no parameters, mapped to `[rootScreen, nestedScreen]`. */
const STATIC_PATHS = {
  '/': [ROOT.SPLASH, null],
  '/onboarding': [ROOT.ONBOARDING, null],

  '/(auth)/login': [ROOT.AUTH, AUTH_SCREENS.LOGIN],
  '/(auth)/register': [ROOT.AUTH, AUTH_SCREENS.REGISTER],
  '/(auth)/forgot-password': [ROOT.AUTH, AUTH_SCREENS.FORGOT_PASSWORD],
  '/(auth)/reset-password': [ROOT.AUTH, AUTH_SCREENS.RESET_PASSWORD],
  '/(auth)/verify-otp': [ROOT.AUTH, AUTH_SCREENS.VERIFY_OTP],

  '/(setup)': [ROOT.SETUP, null],
}

/**
 * Dynamic segments, matched against a concrete path.
 *
 * `template` is what the screens navigate with; `key` names the single segment
 * so `/lesson/42` becomes `{ id: '42' }`. Only ever one segment deep, which is
 * all this app has.
 */
const DYNAMIC_PATHS = [
  { template: '/chapter/[id]', prefix: '/chapter/', screen: 'chapter/[id]', key: 'id' },
  { template: '/lesson/[id]', prefix: '/lesson/', screen: 'lesson/[id]', key: 'id' },
  { template: '/trivia/[topic]', prefix: '/trivia/', screen: 'trivia/[topic]', key: 'topic' },
]

/** Whether `name` is one of the tab navigator's screens. */
export function isTabScreen(name) {
  return TAB_SCREENS.includes(name)
}

/**
 * Normalises the two accepted call shapes into `{ pathname, params }`.
 *
 * `router.push('/home')` and `router.push({ pathname, params })` are both used
 * throughout the app, so every entry point funnels through here first.
 */
function normalise(href) {
  if (typeof href === 'string') return { pathname: href, params: {} }

  return {
    pathname: href?.pathname ?? '/',
    params: href?.params ?? {},
  }
}

/**
 * Resolves a path to `{ root, screen, params }`, or null when nothing matches.
 *
 * `root` is always a root-navigator screen name; `screen` is the nested screen
 * within it, or null when the root screen has no children. Returning null
 * rather than throwing keeps a bad path in a push payload from crashing the
 * app — the caller simply does not navigate.
 */
export function resolvePath(href) {
  const { pathname, params } = normalise(href)

  // Trailing slashes arrive from hand-written payloads; `/home/` is `/home`.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname

  const staticMatch = STATIC_PATHS[path]
  if (staticMatch) {
    return { root: staticMatch[0], screen: staticMatch[1], params }
  }

  // A template the screens wrote, e.g. `/chapter/[id]` with `params.id` set.
  const template = DYNAMIC_PATHS.find((entry) => entry.template === path)
  if (template) {
    return { root: ROOT.MAIN, screen: template.screen, params }
  }

  // A concrete path, e.g. `/chapter/42` from a push notification. The segment
  // becomes the param the screen expects, so both routes into a screen leave it
  // reading exactly the same `useLocalSearchParams()`.
  const dynamic = DYNAMIC_PATHS.find(
    (entry) => path.startsWith(entry.prefix) && path.length > entry.prefix.length,
  )
  if (dynamic) {
    return {
      root: ROOT.MAIN,
      screen: dynamic.screen,
      params: { ...params, [dynamic.key]: decodeURIComponent(path.slice(dynamic.prefix.length)) },
    }
  }

  // Anything else is a bare tab path: `/home`, `/profile`, `/add-course`.
  const tab = path.startsWith('/') ? path.slice(1) : path
  if (isTabScreen(tab)) {
    return { root: ROOT.MAIN, screen: tab, params }
  }

  return null
}
