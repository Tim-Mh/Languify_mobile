const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

const defaultConfig = getDefaultConfig(__dirname);

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  resolver: {
    // The lesson sound effects are WAV files required straight from JS. Metro
    // only bundles the asset extensions it knows about and `wav` is not one of
    // them by default, so without this every `require('...click.wav')` fails to
    // resolve and the bundle will not build.
    assetExts: [...defaultConfig.resolver.assetExts, 'wav'],
  },
};

module.exports = mergeConfig(defaultConfig, config);
