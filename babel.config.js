module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // `@/lib/i18n` rather than `../../lib/i18n`. The screens sit at three
    // different depths under src/screens, so a relative path to a shared module
    // was a different length in each one and broke on every file move.
    [
      'module-resolver',
      {
        root: ['./'],
        alias: {
          '@': './src',
          '@assets': './assets',
        },
        extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
      },
    ],
    // Must stay last. Reanimated 4 does its work through react-native-worklets,
    // whose plugin rewrites worklet functions, and it has to see the code after
    // every other transform has run.
    'react-native-worklets/plugin',
  ],
};
