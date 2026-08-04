module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    /*
     * The worklets plugin MUST be last. Reanimated 4 moved its worklet
     * transform into `react-native-worklets`; listing anything after it means
     * those transforms run on already-rewritten code and animations silently
     * fall back to the JS thread.
     */
    plugins: ["react-native-worklets/plugin"],
  };
};
