/* global jest */
// Reanimated and Worklets need their Jest environment set up before any component that
// animates is imported; gesture-handler ships its own mock setup.
require('react-native-gesture-handler/jestSetup');
require('react-native-reanimated').setUpTests();

// Native storage and the WebView have no JS fallbacks in Jest; keep them in memory.
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = new Map();
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
      setItem: jest.fn(async (key, value) => void store.set(key, value)),
      removeItem: jest.fn(async (key) => void store.delete(key)),
      clear: jest.fn(async () => store.clear()),
    },
  };
});
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => void store.set(key, value)),
    deleteItemAsync: jest.fn(async (key) => void store.delete(key)),
    isAvailableAsync: jest.fn(async () => true),
  };
});
jest.mock('react-native-webview', () => {
  const React = require('react');
  const { View } = require('react-native');
  const WebView = React.forwardRef((props, ref) => React.createElement(View, { ...props, ref, testID: props.testID ?? 'webview' }));
  WebView.displayName = 'WebView';
  return { __esModule: true, default: WebView, WebView };
});
