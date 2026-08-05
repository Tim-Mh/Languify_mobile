/**
 * Tells the CLI where the bundled fonts live.
 *
 * `npx react-native-asset` reads this and copies the TTFs into
 * `android/app/src/main/assets/fonts` and into the Xcode project (adding them
 * to Info.plist's UIAppFonts). That is what replaces `expo-font` — the fonts
 * are part of the native app rather than loaded at runtime, which is also why
 * there is no longer a loading gate in App.jsx holding the first render.
 *
 * Only the six weights the app actually uses are in `assets/fonts`. The Expo
 * build imported them by exact file path for the same reason: a package-root
 * import of `@expo-google-fonts/poppins` reaches every weight's require() and
 * ships all eighteen.
 */
module.exports = {
  project: {
    ios: {},
    android: {},
  },
  assets: ['./assets/fonts'],
};
