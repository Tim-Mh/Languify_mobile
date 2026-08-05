# Languify Mobile

The Languify learner app: a bare **React Native 0.85** project, ported from the
Expo SDK 56 build in `Linguispath-Mobile`. Third repo in the LinguisPath project
alongside `Linguispath-web` (React SPA) and `Linguispath-backend` (Laravel API).

There is no Expo here. No `expo` package, no Expo Go, no EAS, no config plugins,
no prebuild. `android/` and `ios/` are checked in and are the source of truth for
native configuration.

Read `CLAUDE.md` before changing navigation, fonts, push or the avatar editor. It
documents the decisions that are not obvious from the code.

## Prerequisites

| | |
| --- | --- |
| Node | 22.11 or newer |
| JDK | 17 |
| Android SDK | compileSdk 36, build-tools 36.0.0, NDK 27.1.12297006 |
| Xcode | iOS only, macOS only |

`ANDROID_HOME` must point at your SDK. Android Studio sets that up for you.

## Setup

```bash
npm install
cp .env.example .env
```

That is enough to build against the production API. Two things worth knowing:

- **`npm install` runs `patch-package` automatically.** `react-native-tts` ships
  a `build.gradle` that calls `jcenter()`, pins AGP 1.3.1 from 2015, declares no
  `namespace`, and uses the legacy manifest `package` attribute. Gradle 9 and
  AGP 8 reject all of that. `patches/react-native-tts+4.1.1.patch` fixes it and
  the Android build fails without it, so never install with `--ignore-scripts`.
- **`google-services.json` is committed**, deliberately. The Firebase Gradle
  plugin fails without it, and its contents ship inside every APK anyway, so it
  is not a secret. `.env` is *not* committed.

Leave every value in `.env` blank for a production build. Setting `API_URL` to a
loopback address points the app at a local backend, and `src/api/client.js`
rewrites `localhost` to whatever host Metro is served from, so an emulator and a
physical device both reach your machine without editing anything.

## Run it in development

```bash
npm start          # Metro, in its own terminal
npm run android    # build, install and launch
```

## Build an APK

```bash
cd android
./gradlew assembleRelease
```

Output lands at `android/app/build/outputs/apk/release/app-release.apk`.

For a debug APK with the dev menu and Metro reload:

```bash
./gradlew assembleDebug
# android/app/build/outputs/apk/debug/app-debug.apk
```

**Expect the first build to take 10 minutes or more.** It compiles native code
for four architectures. While iterating, build just one:

```bash
./gradlew assembleRelease -PreactNativeArchitectures=arm64-v8a
```

That covers every modern phone. Ship all four.

> **Release signing still uses the debug keystore**, as the React Native template
> ships it. Fine for internal testing and side-loading, not for Play. Generate a
> real keystore and wire it into `android/app/build.gradle` before any store
> submission.

## Build for iOS

Requires macOS.

```bash
cd ios && pod install && cd ..
npm run ios
```

iOS has never been compiled. Everything is authored — bundle id, entitlements for
Sign in with Apple and push, the URL scheme, an `AppDelegate` wired for Firebase
and the splash handoff — but expect to work through CocoaPods and Firebase
linkage on the first run. iOS push additionally needs a Firebase iOS app, which
does not exist yet: `google-services.json` has zero iOS clients, so there is no
`GoogleService-Info.plist`, and `FirebaseApp.configure()` will trap on launch
without one.

## Checking a change quickly

Bundling catches every import and syntax error in seconds and needs no device:

```bash
npm run bundle:android
```

It will not catch a wrong native module version, a missing permission or a Gradle
incompatibility. Only a real build does that.

## Push notifications

The app registers an **FCM** token and posts it to `/device-tokens` with
`provider: 'fcm'`. The backend still accepts Expo-shaped tokens from the old
builds alongside these and routes each to the service that understands it.

Enrolment is deliberately fire and forget, so a broken push setup looks like
silence rather than an error. Two ways that happens:

- A registration sent **without** `provider` is defaulted to `expo` server-side
  and then validated against `ExponentPushToken[...]`, so a raw FCM token 422s
  and the device never appears in `device_tokens`.
- Emulators are never issued a push token. Test on a physical device.

If a device is not receiving push, check the `device_tokens` table on the server
first. No row means registration failed, and the app will not have told you.
