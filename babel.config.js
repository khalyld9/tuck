module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxImportSource: 'react' }]],
    plugins: [
      // react-native-worklets/plugin powers Reanimated 4 worklets.
      // It must remain the last plugin in this list.
      'react-native-worklets/plugin',
    ],
  };
};
