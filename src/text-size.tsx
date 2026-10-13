import { createContext, forwardRef, useContext } from 'react';
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput, type TextProps, type TextInputProps, type TextStyle } from 'react-native';

export const DEFAULT_TEXT_SIZE = 22;
export const MIN_TEXT_SIZE = 16;
export const MAX_TEXT_SIZE = 32;
export const TextSizeContext = createContext(1);
const InsideTextContext = createContext(false);
export const useTextScale = () => useContext(TextSizeContext);
export function textScaleForSize(size: number) {
  return (Number.isFinite(size) ? Math.max(MIN_TEXT_SIZE, Math.min(MAX_TEXT_SIZE, size)) : DEFAULT_TEXT_SIZE) / DEFAULT_TEXT_SIZE;
}

function scaledStyle(style: TextProps['style'], scale: number, nested = false): TextStyle {
  const base = StyleSheet.flatten(style) ?? {};
  // Nested text inherits its parent's already scaled size unless it supplies one.
  return {
    ...(base.fontSize !== undefined || !nested ? { fontSize: (base.fontSize ?? 14) * scale } : {}),
    ...(base.lineHeight !== undefined ? { lineHeight: base.lineHeight * scale } : {}),
    ...(base.letterSpacing !== undefined ? { letterSpacing: base.letterSpacing * scale } : {}),
  };
}

/** Shared app text; retains the platform's accessibility font scaling. */
export const Text = forwardRef<NativeText, TextProps>(function Text({ style, children, ...props }, ref) {
  const scale = useTextScale();
  const nested = useContext(InsideTextContext);
  return <NativeText {...props} ref={ref} style={[!nested && {flexShrink:1}, style, scaledStyle(style, scale, nested)]}>
    <InsideTextContext.Provider value={true}>{children}</InsideTextContext.Provider>
  </NativeText>;
});

export const TextInput = forwardRef<NativeTextInput, TextInputProps>(function TextInput({ style, ...props }, ref) {
  const scale = useTextScale();
  return <NativeTextInput {...props} ref={ref} style={[style, scaledStyle(style, scale)]}/>;
});
