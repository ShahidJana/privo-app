module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['<rootDir>/jest.setup.js'],
  // RN community libraries ship untranspiled ESM and must be transformed.
  // Everything else in node_modules stays ignored for speed.
  transformIgnorePatterns: [
    'node_modules/(?!(?:jest-)?(?:react-native|@react-native|@react-native-community|react-native-.*|@react-navigation|@op-engineering|@notifee)/)',
  ],
};
