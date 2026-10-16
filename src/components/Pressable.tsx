import { createContext, forwardRef, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, Pressable as NativePressable, type PressableProps, type View } from 'react-native';

const ReduceMotionContext = createContext(true);
const AnimatedPressable = Animated.createAnimatedComponent(NativePressable);

/** One accessibility subscription for all button feedback in the app. */
export function PressFeedbackProvider({ children }: { children: ReactNode }) {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let alive = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      setReduceMotion(value);
    });
    void AccessibilityInfo.isReduceMotionEnabled().then(value => {
      if (alive && !changed) setReduceMotion(value);
    }).catch(() => undefined);
    return () => { alive = false; listener.remove(); };
  }, []);
  return <ReduceMotionContext.Provider value={reduceMotion}>{children}</ReduceMotionContext.Provider>;
}

/** Small native-driver feedback; preserves layout, hit targets and press handlers. */
export const Pressable = forwardRef<View, PressableProps>(function Pressable({
  style, disabled, onPressIn, onPressOut, ...props
}, ref) {
  const reduceMotion = useContext(ReduceMotionContext);
  const progress = useRef(new Animated.Value(0)).current;
  const scale = useMemo(() => progress.interpolate({ inputRange: [0, 1], outputRange: [1, 0.97] }), [progress]);
  const [pressed, setPressed] = useState(false);
  useEffect(() => {
    if (disabled) setPressed(false);
    if (disabled || reduceMotion) {
      progress.stopAnimation();
      progress.setValue(0);
    }
    return () => progress.stopAnimation();
  }, [disabled, reduceMotion, progress]);
  const animate = (down: boolean) => {
    if (disabled || reduceMotion) return;
    Animated.timing(progress, {
      toValue: down ? 1 : 0, duration: down ? 75 : 130,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  };
  const resolvedStyle = typeof style === 'function' ? style({ pressed }) : style;
  const transform = StyleSheet.flatten(resolvedStyle)?.transform;
  return <AnimatedPressable {...props} ref={ref} disabled={disabled}
    style={[resolvedStyle, typeof transform !== 'string' && {
      transform: [...(Array.isArray(transform) ? transform : []), { scale }],
    }]}
    onPressIn={event => { setPressed(true); animate(true); onPressIn?.(event); }}
    onPressOut={event => { setPressed(false); animate(false); onPressOut?.(event); }}/>;
});
