// Keeps inputs (chat box, form fields) above the on-screen keyboard.
//
// Expo SDK 58 always draws Android apps edge-to-edge, so Android no longer shrinks
// the window when the keyboard opens ("adjustResize" has no effect). The old pattern —
// `behavior={Platform.OS === 'ios' ? 'padding' : undefined}` — therefore left inputs
// hidden behind the keyboard on Android. Padding works on both platforms; the offset
// is the navigation header's height, since the view starts below it.
import React, { useContext } from 'react';
import { KeyboardAvoidingView, type StyleProp, type ViewStyle } from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';

export function KeyboardScreen({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  // Context (not useHeaderHeight) so screens also render outside a navigator, e.g. in tests.
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  return (
    <KeyboardAvoidingView style={[{ flex: 1 }, style]} behavior="padding" keyboardVerticalOffset={headerHeight}>
      {children}
    </KeyboardAvoidingView>
  );
}
