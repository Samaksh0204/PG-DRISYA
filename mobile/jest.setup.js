// AsyncStorage has an official in-memory mock for tests.
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

// Icon fonts can't load in Jest; render icons as a plain Text with their name.
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  const Icon = ({ name }) => React.createElement(Text, { accessibilityElementsHidden: true }, name);
  return { Ionicons: Icon };
});
