// Expo inlines EXPO_PUBLIC_* variables while transforming code, so test values
// must be set here (before any file is transformed), not in a setup file.
process.env.EXPO_PUBLIC_API_URL = 'https://api.test/api';
process.env.EXPO_PUBLIC_WEB_URL = 'https://web.test';

module.exports = {
  "preset": "jest-expo",
  "setupFiles": [
    "./jest.setup.js"
  ],
  "transformIgnorePatterns": [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)"
  ],
  "testPathIgnorePatterns": [
    "/node_modules/"
  ]
};
