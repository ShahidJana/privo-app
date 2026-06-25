/**
 * Jest setup — mocks native modules that have no JS implementation in the test
 * environment. Required for any test that renders the app tree.
 */
require('react-native-gesture-handler/jestSetup');

// Reanimated ships a Jest mock; wire it up and silence its worklet warnings.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// Vector icons render a native font; stub to a host component in tests.
jest.mock('react-native-vector-icons/MaterialIcons', () => 'MaterialIcons');
