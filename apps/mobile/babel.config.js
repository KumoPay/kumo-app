module.exports = function (api) {
  api.cache(true)
  return {
    presets: ["babel-preset-expo"],
    // react-native-reanimated/plugin must be the LAST babel plugin, per RN docs.
    plugins: ["react-native-reanimated/plugin"],
  }
}
