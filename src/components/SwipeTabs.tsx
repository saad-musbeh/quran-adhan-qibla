import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { useReaderStyles } from '../quran-theme-context';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { neighborForSwipe, TABS, type Language, type Tab } from '../domain/navigation';
import { isRTL, localizeCopy } from '../i18n';

export type { Tab } from '../domain/navigation';

type Props = {
  hideNavigation?: boolean;
  onDockHeightChange?: (height: number) => void;
  language: Language;
  tab: Tab;
  onChange: (tab: Tab) => void;
  reading?: boolean;
  chromeVisible?: boolean;
  children: ReactNode;
};

const labels: { en: Record<Tab, string> & { show: string }; ar: Record<Tab, string> & { show: string } } = {
  en: { quran: 'Quran', adhan: 'Adhan', qibla: 'Qibla', adhkar: 'Adhkar & dua', show: 'Show navigation tabs' },
  ar: { quran: 'القرآن', adhan: 'الأذان', qibla: 'القبلة', adhkar: 'أذكار وأدعية', show: 'إظهار تبويبات التنقل' },
};

const HIDE_DELAY_MS = 4_000;

export function SwipeTabs({ hideNavigation = false, language, tab, onChange, children, reading = false, chromeVisible = false, onDockHeightChange }: Props) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const [dockVisible, setDockVisible] = useState(true);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const multiTouch = useRef(false);
  const touchSequence = useRef(false);
  const responderActive = useRef(false);
  const current = useRef({ language, tab, onChange });
  current.current = { language, tab, onChange };

  const clearHideTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const revealAndRestartTimer = useCallback(() => {
    setDockVisible(true);
    clearHideTimer();
    if (screenReaderEnabled) return;
    timer.current = setTimeout(() => {
      timer.current = null;
      setDockVisible(false);
    }, HIDE_DELAY_MS);
  }, [clearHideTimer, screenReaderEnabled]);

  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isScreenReaderEnabled().then(enabled => {
      if (mounted) setScreenReaderEnabled(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('screenReaderChanged', setScreenReaderEnabled);
    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (screenReaderEnabled) {
      setDockVisible(true);
      clearHideTimer();
      return clearHideTimer;
    }
    revealAndRestartTimer();
    return clearHideTimer;
  }, [language, tab, screenReaderEnabled, revealAndRestartTimer, clearHideTimer]);

  const responder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onStartShouldSetPanResponderCapture: (_event, state) => {
      if (state.numberActiveTouches > 1) multiTouch.current = true;
      return false;
    },
    onMoveShouldSetPanResponderCapture: (_event, state) => {
      if (state.numberActiveTouches > 1) multiTouch.current = true;
      return !multiTouch.current && neighborForSwipe(current.current.tab, state.dx, state.dy, current.current.language) !== null;
    },
    onPanResponderGrant: () => {
      responderActive.current = true;
      clearHideTimer();
      setDockVisible(true);
    },
    onPanResponderMove: (_event, state) => {
      if (state.numberActiveTouches > 1) multiTouch.current = true;
    },
    onPanResponderTerminationRequest: () => false,
    onPanResponderTerminate: () => {
      responderActive.current = false;
      multiTouch.current = false;
      revealAndRestartTimer();
    },
    onPanResponderRelease: (_event, state) => {
      const target = multiTouch.current ? null : neighborForSwipe(
        current.current.tab,
        state.dx,
        state.dy,
        current.current.language,
      );
      responderActive.current = false;
      multiTouch.current = false;
      if (target) current.current.onChange(target);
      revealAndRestartTimer();
    },
  }), [clearHideTimer, revealAndRestartTimer]);

  const onTouchStart = (event: GestureResponderEvent) => {
    const touches = event.nativeEvent.touches.length;
    if (!touchSequence.current) {
      touchSequence.current = true;
      if (!responderActive.current) multiTouch.current = false;
    }
    if (touches > 1) multiTouch.current = true;
    setDockVisible(true);
    clearHideTimer();
  };

  const onTouchEnd = (event: GestureResponderEvent) => {
    if (event.nativeEvent.touches.length === 0) {
      touchSequence.current = false;
      if (!responderActive.current) revealAndRestartTimer();
    } else if (event.nativeEvent.touches.length > 1) {
      multiTouch.current = true;
    }
  };

  const onTouchCancel = () => {
    touchSequence.current = false;
    multiTouch.current = false;
    if (!responderActive.current) revealAndRestartTimer();
  };

  const copy = localizeCopy(language, labels);
  const showDock = ((tab === 'quran' || tab === 'adhkar') && !reading) || (reading ? chromeVisible : dockVisible);
  const chooseTab = (next: Tab) => {
    revealAndRestartTimer();
    if (next !== current.current.tab) current.current.onChange(next);
  };

  return <View
    style={styles.root}
    {...(!reading ? responder.panHandlers : {})}
    onTouchStart={reading ? undefined : onTouchStart}
    onTouchEnd={reading ? undefined : onTouchEnd}
    onTouchCancel={reading ? undefined : onTouchCancel}
  >
    <View style={styles.content}>{children}</View>
    {hideNavigation ? null : showDock ? <View onLayout={event=>onDockHeightChange?.(Math.ceil(event.nativeEvent.layout.height)+12)} accessibilityRole="tablist" {...(reading ? responder.panHandlers : {})} style={[styles.dock, colors.mode === 'light' && { shadowOpacity: 0.08, elevation: 2 }, isRTL(language) && styles.dockRtl]}>
      {TABS.map(item => <Pressable
        key={item}
        testID={`tab-${item}`}
        accessibilityRole="tab"
        accessibilityLabel={copy[item]}
        accessibilityState={{ selected: tab === item }}
        onPress={() => chooseTab(item)}
        onPressIn={revealAndRestartTimer}
        style={[styles.tab, tab === item && { backgroundColor: colors.accent }]}
      >
        <Text style={[styles.tabLabel, tab === item && { color: colors.appAccentInk, fontWeight: '700' }]}>{copy[item]}</Text>
      </Pressable>)}
    </View> : !reading && <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.show}
      accessibilityState={{ expanded: false }}
      onPress={revealAndRestartTimer}
      style={styles.handleButton}
    >
      <View style={styles.handle} />
    </Pressable>}
  </View>;
}

const baseStyles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, zIndex: 0 },
  dock: {
    zIndex: 2,
    position: 'absolute',
    bottom: 6,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 520,
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DBAB68',
    backgroundColor: '#15342E',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 8,
  },
  dockRtl: { flexDirection: 'row-reverse' },
  tab: { flex: 1, minWidth: 44, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, paddingVertical: 5, borderRadius: 15 },
  tabLabel: { width: '100%', alignSelf: 'stretch', flexShrink: 0, lineHeight: 21, color: '#A8C1B8', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  handleButton: {
    zIndex: 2,
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
    width: 64,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: '#15342E',
    borderWidth: 1,
    borderColor: '#DBAB68',
    elevation: 5,
  },
  handle: { width: 28, height: 4, borderRadius: 2, backgroundColor: '#D6BA7A' },
});
