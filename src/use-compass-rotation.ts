import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';
import { unwrapHeading } from './domain/heading';

/** Native transforms keep moving between sensor samples without per-frame React layouts. */
export function useCompassRotation(heading: number | null) {
  const rotation = useRef(new Animated.Value(0)).current;
  const target = useRef<number | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduceMotion(value); }).catch(() => undefined);
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; listener.remove(); };
  }, []);
  useEffect(() => {
    const previous = target.current;
    const next = heading === null ? null : previous === null ? heading : unwrapHeading(previous, heading);
    target.current = next;
    // Calibration/fixed fallback resets immediately; first valid reading does not spin from north.
    if (next === null || previous === null || reduceMotion) {
      rotation.stopAnimation();
      rotation.setValue(-(next ?? 0));
      return;
    }
    const animation = Animated.timing(rotation, {
      toValue: -next, duration: 120, easing: Easing.out(Easing.quad), useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [heading, reduceMotion, rotation]);
  return useMemo(() => ({
    clockwise: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['-360deg', '360deg'], extrapolate: 'extend' }),
    upright: rotation.interpolate({ inputRange: [-360, 360], outputRange: ['360deg', '-360deg'], extrapolate: 'extend' }),
  }), [rotation]);
}
