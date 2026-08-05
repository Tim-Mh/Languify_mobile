/**
 * Tells the CLI which assets to link into the native projects.
 *
 * `npx react-native-asset` reads this and copies each folder to where the
 * platform expects it, then registers it in the Xcode project.
 *
 * **Fonts** land in `android/app/src/main/assets/fonts` and in Info.plist's
 * UIAppFonts. That is what replaces `expo-font` — the fonts are part of the
 * native app rather than loaded at runtime, which is why there is no loading
 * gate in App.jsx holding the first render. Only the six weights the app uses
 * are in `assets/fonts`; the Expo build imported them by exact file path for
 * the same reason, since a package-root import ships all eighteen.
 *
 * **Sounds** have to be native resources rather than Metro assets, because
 * `react-native-sound` takes a *filename*, not a `require()`. Handing it the
 * number that `require('...wav')` returns throws inside its constructor
 * (`filename.startsWith is not a function`), which is silently swallowed and
 * leaves the app completely mute. See `src/lib/sounds.js`.
 *
 * This entry exists **for iOS**, where it registers the files as bundle
 * resources so `Sound.MAIN_BUNDLE` can find them.
 *
 * It does **not** solve Android. `react-native-asset` copies non-font assets to
 * `assets/custom/`, but the library resolves Android playback through
 * `resources.getIdentifier(name, "raw", packageName)`, which only ever looks in
 * `res/raw`. So the same five files are also committed to
 * `android/app/src/main/res/raw/`, and that copy is the one Android actually
 * plays. Add a sound and it has to go to both places, or it will work on one
 * platform and be silent on the other.
 *
 * Android resource names must be lowercase and alphanumeric, which every file
 * in `assets/sounds` already satisfies. Renaming one to use a capital or a dash
 * would fail the Android build.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts', './assets/sounds'],
};
