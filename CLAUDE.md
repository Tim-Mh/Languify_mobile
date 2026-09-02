# Languify Mobile (React Native CLI)

A bare React Native 0.85 app, ported from the Expo SDK 56 build in
`Linguispath-Mobile`. Third repo in the LinguisPath project alongside
`Linguispath-web` (React SPA) and `Linguispath-backend` (Laravel API).

**There is no Expo in this project.** No `expo` package, no Expo Go, no EAS, no
config plugins, no prebuild. The `android/` and `ios/` folders are checked in
and are the source of truth for native configuration — editing `app.json`
changes nothing but the registered component name.

- **JavaScript, not TypeScript**, matching the other two repos.
- **Design tokens in `src/theme.js`** are copied verbatim from the web app's
  `src/index.css`. Change a brand colour in both or the products drift.
  `src/styles/` composes those tokens into shared type and layout styles.

## What replaced what

| Expo | Here | Notes |
| --- | --- | --- |
| `expo-router` | `@react-navigation/*` + `src/navigation/` | See below |
| `expo-secure-store` | `react-native-keychain` | via `src/lib/secureStorage.js` |
| `expo-notifications` | `@notifee/react-native` + `@react-native-firebase/messaging` | **backend change needed**, see below |
| `expo-speech` | `react-native-tts` | |
| `expo-audio` | `react-native-sound` | |
| `expo-image` | RN `Image` / `react-native-svg` | no SVG rasteriser exists, see below |
| `expo-linear-gradient` | `react-native-linear-gradient` | same props, import path only |
| `expo-splash-screen` | `react-native-bootsplash` | |
| `expo-web-browser` | `react-native-inappbrowser-reborn` | via `src/lib/browser.js` |
| `expo-auth-session` | hardcoded `languify://oauth` | the scheme is registered natively now |
| `expo-apple-authentication` | `@invertase/react-native-apple-authentication` | |
| `expo-device` | `react-native-device-info` | |
| `expo-constants` / `EXPO_PUBLIC_*` | `react-native-config` + `src/lib/env.js` | |
| `expo-font` | `react-native.config.js` + `assets/fonts` | fonts are bundled, not loaded |
| `expo-status-bar` | RN `StatusBar` | |

## Navigation

`src/navigation/router.js` exposes `useRouter`, `router`,
`useLocalSearchParams`, `Link`, `Redirect` and `useFocusEffect` with the same
signatures Expo Router had, implemented on React Navigation. Screens import
them from `@/navigation` and are otherwise unchanged — that is deliberate, and
it is why 50 call sites did not have to be rewritten.

- **Paths are still the public interface.** `router.push('/home')` and
  `router.replace({ pathname: '/chapter/[id]', params })` both work, and so does
  a concrete path like `/lesson/42`. `src/navigation/routeMap.js` is the only
  place that knows how a path maps to a screen. The backend also speaks this
  vocabulary — it puts a route path in every push payload's `data.url` — so
  changing it is a cross-repo change.
- **Tab screen names are the old file names** (`'home'`, `'chapter/[id]'`).
  `TabBar` compares `route.name` against the `tabBarParent` option to decide
  which tab stays lit, so renaming a tab screen breaks the bar.
- **`replace` means three different things** depending on the navigator, and
  `router.js` handles each: a plain navigate inside the tabs (which is what Expo
  Router did, and what `useExitFlow` is built on), a real stack replace inside
  the auth stack, and a root reset when crossing between them.
- **Never hand `CommonActions.reset` a partial nested state.** It becomes
  authoritative, so the tab navigator comes back holding only that one route and
  `TabBar` renders a single tab. Reset to the root screen and navigate to the
  nested one in a second step, as `resetTo` does.
- **The tab navigator keeps `backBehavior="history"`.** The default sends back
  to the first tab declared, which is Leagues, and that is why back used to land
  there from all over the app.

## Fonts

`src/theme.js` names fonts by their **PostScript name** (`Poppins-Bold`), and
the files in `assets/fonts` are named to match. Both halves matter: a bundled
font is resolved by filename on Android and by PostScript name on iOS, so the
Expo names (`Poppins_700Bold`) would render on Android and silently fall back to
the system font on iOS. If you add a weight, check the name inside the file
rather than trusting the filename.

## Push notifications

The Expo build issued an *Expo* push token and the backend posted it to
`exp.host`, which fanned out to FCM and APNs and held both sets of credentials.
There is no Expo push service in a bare app, so `src/lib/push.js` issues the
underlying **FCM registration token** instead, registered with
`provider: 'fcm'`.

The backend (`languify_backend_Tim`) accepts both token kinds:
`DeviceTokenController` validates each against its own pattern, the
`device_tokens` table carries a `provider` column, and `ExpoChannel` routes
each token to its service — Expo-wrapped ones through `ExpoPushService`,
raw FCM ones through `FcmPushService` (FCM HTTP v1). The FCM path needs
`FIREBASE_CREDENTIALS` in the backend `.env` pointing at a Firebase service
account key file; without it FCM sends are skipped with a log line.

**iOS push also needs Firebase setup that does not exist yet**: the Firebase
project has no iOS app, so `ios/LinguispathNative/GoogleService-Info.plist` is
a clearly-marked placeholder (real project values, fake app id) that only
exists so `FirebaseApp.configure()` can succeed. When the iOS app is
registered in the Firebase console, replace it with the downloaded file and
upload the APNs key (`Languify_Keys/AuthKey_UX7BRA85KJ.p8`) to Firebase.

## Avatars

The avatar editor draws up to forty-five DiceBear faces at once. The Expo build
wrapped each as an SVG data URI and let `expo-image` decode it to a cached
bitmap. **Nothing in a bare project rasterises SVG** — not RN's `Image`, not
FastImage — so `SvgXml` is the only option and the tiles build native view trees
again. Memoising the tiles is what keeps it usable. Generating the faces is not
the cost: that measures 0.2ms each.

## Carried over from the Expo build

These are properties of the app rather than of Expo, and still hold:

- **Reads use `useQuery`, writes use `useMutation`** (TanStack Query), never
  hand-rolled `busy` state, and never a bare `await someApi()` in a component.
- **Launch sequence is splash → onboarding → register, every launch until
  signed in.** There is no persisted "seen the intro" flag on purpose.
- **Anything that loads goes through `QueryState`**, never a bare spinner. It
  orders offline → loading → slow → error → empty, and offline deliberately wins
  because it is the only actionable one.
- **Pass `QueryState` children as a function whenever they read `query.data`:**
  `{(data) => ...}`. JSX children are built by the parent *before* QueryState
  decides what to render.
- **Non-loading states render through `StateView`**, so they stay one family.
- **"Are you sure?" goes through `ConfirmDialog`, never `Alert.alert`.**
- **In-app messages drop from the top** (`useNotify` / `NotificationProvider`),
  never the bottom, so they cannot cover the tab bar or the primary button.
  That is for the app's own toasts — a saved profile, a failed purchase.
  **Remote push no longer uses it**: an arriving push goes to the system tray
  even when the app is open, so it survives until the learner deals with it.
  A toast that vanishes after two seconds loses the notification for good.
- **No haptics anywhere.** Vibration was removed on request; do not reintroduce
  it. The notification channels are created with vibration off, and Android
  bakes that in at creation time — changing it later needs a new channel id.
- **Icons are Lucide, imported one file at a time**:
  `import Flame from 'lucide-react-native/icons/flame'`. A package-root import
  pulls every icon and adds ~2MB, because Metro does not tree-shake. Never use
  emoji for anything that carries meaning.
- **Responsive widths**: `contentWidth` for a container that owns its padding,
  `column` for a column nested inside a padded parent.
- **`Button` fires its own press-in feedback.** Do not add a second one.
- A 401 on a token-bearing request is reported to `sessionEvents` and handled
  once in `AuthProvider`. Do not add per-screen 401 handling.
- Setup progress is derived from the API profile (`src/auth/setupState.js`),
  never a local flag, so a half-finished signup resumes on any device.
- **Stripe checkout return URLs must not carry `session_id`.** The backend
  appends Stripe's own placeholder. `CheckoutProvider` watches for the web app's
  origin, closes the sheet, and the session id is read off that URL and verified
  through `/subscription/verify` before anything is unlocked.
- **`/subscription/auto-renew` takes `{ enabled }`**, not `{ autoRenew }`.

## Verifying a change

Bundling is the cheap check and catches every import and syntax error:

```
npx react-native bundle --platform android --dev false \
  --entry-file index.js --bundle-output /tmp/out.bundle
```

It does not catch a wrong native module version or a missing permission, so a
real build (`npm run android`) is what confirms those. iOS cannot be built from
Windows; `pod install` and a build on macOS are still outstanding for this port.

## Payments

Two billing providers, decided by platform:

- **Android (and the web app): Stripe.** Checkout opens in the in-app sheet,
  the session is verified through `/subscription/verify` / `/shop/gems/verify`.
- **iOS: Apple In-App Purchase**, via `react-native-iap` (StoreKit 2) —
  App Review rejected Stripe checkout under guideline 3.1.1, so on iOS Apple
  bills. `src/lib/iap.js` owns the connection; the purchase hooks in
  `src/hooks/useShop.js` branch on `APPLE_IAP`.

The product-id scheme is a three-way contract between the app, the backend,
and App Store Connect: `us.languify.app.sub.{plan_key}` and
`us.languify.app.gems.{pack_key}`, where the suffix is the catalog row's key
(`monthly`/`yearly`/`family`, `basic`/`adventure`/`vault`).

Rules the flow depends on:

- **A signed transaction goes to `POST /shop/apple/verify` BEFORE
  `finishTransaction`.** The backend credit is the source of truth; finishing
  first would lose the purchase if the network died in between. Unfinished
  transactions are redelivered by StoreKit on the next launch and recovered by
  the orphan handler `useApplePrices` registers.
- **On iOS a product without an Apple price is not offered.** The shop and
  PlanManager filter against the `loadApplePrices` map, so a product missing
  from App Store Connect disappears rather than erroring at purchase time.
- **Prices shown on iOS are Apple's localized `displayPrice`**, never
  `amountCents` — the two catalogs can drift by design (Apple price tiers).
- An Apple-billed subscription is managed in the App Store
  (`showManageSubscriptionsIOS`); the Stripe controls stay hidden because
  `manageable` is false for it. The backend's `provider` field says which.
- Apple requires the **Restore Purchases** control (shop, iOS only).
