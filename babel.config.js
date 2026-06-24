module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module-resolver',
      {
        root: ['./src'],
        extensions: ['.ts', '.tsx', '.js', '.jsx', '.json'],
        alias: {
          '@': './src',
          '@core': './src/core',
          '@features': './src/features',
          '@ui': './src/ui',
          '@lib': './src/lib',
          '@store': './src/store',
        },
      },
    ],
    // Reanimated v4 uses the worklets plugin. MUST be last.
    'react-native-worklets/plugin',
  ],
};
