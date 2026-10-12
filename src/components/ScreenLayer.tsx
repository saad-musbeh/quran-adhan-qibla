import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

/** Retain native layout between tabs; display:none makes Android redraw a blank
 * surface when a retained WebView/ScrollView returns. Hidden screens cannot
 * receive touches or accessibility focus. */
export function ScreenLayer({active, background, top = 0, bottom = 0, testID, children}: {
  active: boolean; background: string; top?: number; bottom?: number; testID?: string; children: ReactNode;
}) {
  return <View testID={testID} pointerEvents={active ? 'auto' : 'none'}
    accessibilityElementsHidden={!active} importantForAccessibility={active ? 'auto' : 'no-hide-descendants'}
    style={[StyleSheet.absoluteFill, {backgroundColor:background, paddingTop:top, bottom, opacity:active ? 1 : 0, zIndex:active ? 1 : 0}]}>
    {children}
  </View>;
}
