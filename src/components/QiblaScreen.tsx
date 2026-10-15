import { Pressable } from './Pressable';
import { Text } from '../text-size';
import { memo, useState } from 'react';
import { Animated, ActivityIndicator, ScrollView, StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { useLocation } from '../use-location';
import { isFacingTarget, relativeBearing } from '../domain/heading';
import { useHeading } from '../use-heading';
import { bilingual, isRTL, localeFor, localizeCopy, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import { qiblaSceneColors } from '../domain/qibla-scene';
import Ionicons from '@expo/vector-icons/Ionicons';
import { LocationControl } from './LocationControl';
import { useCompassRotation } from '../use-compass-rotation';

type Props = {
  language: Language;
  state: ReturnType<typeof useLocation>;
  bearing: number | null;
  calculationAvailable: boolean;
  calculationError: boolean;
  active?: boolean;
  mode?: 'live' | 'north';
  onModeChange?: (mode: 'live' | 'north') => void;
  onChangeLocation?: () => void;
};

const directions = {
  en: ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'],
  ar: ['شمال', 'شمال شرقي', 'شرق', 'جنوب شرقي', 'جنوب', 'جنوب غربي', 'غرب', 'شمال غربي'],
} as const;

function lineBetween(x1: number, y1: number, x2: number, y2: number, color: string, opacity = 1, thickness = 2): ViewStyle {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    position: 'absolute', left: (x1 + x2) / 2 - length / 2, top: (y1 + y2) / 2 - thickness / 2,
    width: length, height: thickness, borderRadius: thickness, backgroundColor: color, opacity,
    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
  };
}

function QiblaCompass({ trueBearing, language, heading }: { trueBearing: number; language: Language; heading: number | null }) {
  const { styles } = useReaderStyles(baseStyles);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const rotation = useCompassRotation(heading);
  const onLayout = (event: LayoutChangeEvent) => {
    const {width, height} = event.nativeEvent.layout;
    setSize(current => current.width === width && current.height === height ? current : {width, height});
  };
  const guidance = trueBearing.toLocaleString(localeFor(language), { maximumFractionDigits: 1 });
  const accessibilityLabel = heading !== null
    ? bilingual(language, 'دليل بوصلة حي، القبلة {guidance} درجة من الشمال الحقيقي', 'Live compass guide, Qibla {guidance} degrees from true north', { guidance })
    : bilingual(language, 'دليل ثابت للشمال، القبلة {guidance} درجة من الشمال الحقيقي', 'Fixed north guide, Qibla {guidance} degrees from true north', { guidance });
  return <View testID="qibla-compass" onLayout={onLayout} style={styles.frame} accessible accessibilityLabel={accessibilityLabel}>
    {size.width > 0 && size.height > 0 && <CompassArtwork width={size.width} height={size.height} bearing={trueBearing} language={language}
      clockwise={rotation.clockwise} upright={rotation.upright} />}
  </View>;
}

// Sensor updates change only two native animation nodes, not the tick/label geometry.
const CompassArtwork = memo(function CompassArtwork({width, height, bearing, language, clockwise, upright}: {
  width: number; height: number; bearing: number; language: Language;
} & ReturnType<typeof useCompassRotation>) {
  const { styles: scene, colors } = useReaderStyles(baseStyles);
  const palette = qiblaSceneColors(colors);
  const cx = width / 2, cy = height / 2;
  const dialRadius = Math.max(0, Math.min(width, height) / 2 - 12);
  const compassRadius = Math.max(0, dialRadius - 32);
  const radius = Math.max(30, Math.min(dialRadius * 0.52, compassRadius - 38));
  const radians = bearing * Math.PI / 180;
  const targetX = cx + Math.sin(radians) * radius, targetY = cy - Math.cos(radians) * radius;
  const arrowX = cx + Math.sin(radians) * radius * 0.55, arrowY = cy - Math.cos(radians) * radius * 0.55;
  const cardinal = localizeCopy(language, { en: ['North', 'East', 'South', 'West'], ar: ['شمال', 'شرق', 'جنوب', 'غرب'] });
  return <>
    <View pointerEvents="none" style={[scene.dial, {left: cx - dialRadius, top: cy - dialRadius, width: dialRadius * 2, height: dialRadius * 2, borderRadius: dialRadius, backgroundColor: palette.face}]} />
    <View pointerEvents="none" style={[scene.innerDial, {left: cx - dialRadius * 0.63, top: cy - dialRadius * 0.63, width: dialRadius * 1.26, height: dialRadius * 1.26, borderRadius: dialRadius, backgroundColor: palette.inner}]} />
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, {transform: [{rotate: clockwise}]}]}>
      {Array.from({length: 36}, (_, index) => {
        const angle = index * 10 * Math.PI / 180;
        const inner = dialRadius - (index % 9 === 0 ? 13 : index % 3 === 0 ? 9 : 5);
        return <View key={index} style={lineBetween(cx + Math.sin(angle) * inner, cy - Math.cos(angle) * inner,
          cx + Math.sin(angle) * (dialRadius - 2), cy - Math.cos(angle) * (dialRadius - 2),
          index === 0 ? palette.direction : palette.tick, index % 3 === 0 ? 0.8 : 0.35, index % 9 === 0 ? 2 : 1)} />;
      })}
      <View style={lineBetween(cx, cy, targetX, targetY, palette.direction, 1, 3)} />
      <View style={[scene.pathArrow, {borderBottomColor: palette.direction, left: arrowX - 8, top: arrowY - 7, transform: [{rotate: `${bearing}deg`}]}]} />
      <Animated.View style={[scene.kaabaMarker, {left: targetX - 16, top: targetY - 15, transform: [{rotate: upright}]}]}>
        <View style={scene.kaabaTop} /><View style={scene.kaabaSide} /><View style={scene.kaabaFront}>
          <View style={[scene.kaabaBelt, {backgroundColor: palette.gold}]} /><View style={scene.kaabaDoor} />
        </View>
      </Animated.View>
      {cardinal.map((text, index) => {
        const angle = index * Math.PI / 2;
        return <Animated.View key={index} style={[scene.compassWord, {left: cx + Math.sin(angle) * compassRadius - 30,
          top: cy - Math.cos(angle) * compassRadius - 11, transform: [{rotate: upright}]}]}>
          <Text numberOfLines={1} adjustsFontSizeToFit style={[scene.compassText, index === 0 && {color: palette.direction}]}>{text}</Text>
        </Animated.View>;
      })}
    </Animated.View>
    <View pointerEvents="none" style={[scene.youMarker, {backgroundColor: palette.marker, borderColor: palette.markerBorder, left: cx - 9, top: cy - 9}]} />
  </>;
});

export function QiblaScreen({ language, state, bearing, calculationAvailable, calculationError, active = true, mode = 'live', onModeChange, onChangeLocation }: Props) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const rtl = isRTL(language);
  const [viewport,setViewport]=useState({width:0,height:0});
  const landscape=viewport.width>=600&&viewport.width>viewport.height;
  const location = state.location;
  const headingState = useHeading(Boolean(active && mode === 'live' && location?.source === 'device' && bearing !== null && calculationAvailable && !calculationError), location?.source === 'device' ? location : undefined);
  const canUseLiveHeading = mode === 'live' && headingState.status === 'ready' && headingState.heading !== null;
  const turn = canUseLiveHeading && bearing !== null ? relativeBearing(bearing, headingState.heading!) : null;
  const facingQibla = turn !== null && isFacingTarget(turn);
  const localizedDirections = localizeCopy(language, directions);
  const direction = bearing === null ? '' : localizedDirections[Math.round(bearing / 45) % 8];
  const degrees = bearing === null ? '' : `${bearing.toLocaleString(localeFor(language), { maximumFractionDigits: 1 })}°`;
  const copies = { ar: {
    title: 'اتجاه القبلة', instruction: 'قف مواجهًا الشمال الحقيقي، ثم اتبع السهم. يظل الدليل ثابتًا.',
    liveFacing: 'أنت تواجه القبلة', turnLeft: 'انعطف يسارًا', turnRight: 'انعطف يمينًا',
    calibrating: 'جارٍ معايرة البوصلة. أبقِ الهاتف مسطحًا وحرّكه ببطء. يظهر دليل الشمال الثابت حتى تستقر القراءة.', headingTimeout: 'لم تصل قراءة البوصلة بعد. أبقِ الهاتف مسطحًا وحرّكه ببطء؛ يستمر البحث مع عرض دليل الشمال الثابت.', permission: 'يتطلب الاتجاه الحي إذن الموقع وموقع الجهاز. يظهر الآن دليل الشمال الثابت.',
    headingUnavailable: 'البوصلة غير متاحة الآن. يظهر دليل الشمال الثابت.', headingLoading: 'جارٍ تشغيل البوصلة. أبقِ الهاتف مسطحًا وحرّكه ببطء عند الحاجة؛ يظهر دليل الشمال الثابت.', paused: 'البوصلة متوقفة مؤقتًا. يظهر دليل الشمال الثابت.',
    device: 'موقع الجهاز', city: 'المدينة', map: 'الخريطة', manual: 'إحداثيات يدوية',
    useLocation: 'استخدام موقعي', locating: 'جارٍ تحديد الموقع…',
    locationHint: 'اعثر على اتجاه القبلة من موقعك الحالي.', locationError: 'تعذّر تحديد الموقع. حاول مجددًا أو اختر موقعًا آخر.',
    denied: 'لم يُسمح بالوصول إلى الموقع. حاول مجددًا أو اختر موقعًا آخر.', blocked: 'إذن الموقع متوقف. فعّله من إعدادات الجهاز أو اختر موقعًا آخر.',
    servicesDisabled: 'خدمة الموقع متوقفة. فعّلها أو اختر موقعًا آخر.', timeout: 'استغرق تحديد الموقع وقتًا طويلًا. حاول مجددًا أو اختر موقعًا آخر.',
    unavailable: 'حساب اتجاه القبلة غير متاح في هذا الإصدار.', calcError: 'تعذّر حساب اتجاه القبلة لهذا الموقع.',
  }, en: {
    title: 'Qibla direction', instruction: 'Face true north first, then follow the arrow. The guide stays fixed.',
    liveFacing: 'You’re facing Qibla', turnLeft: 'Turn left', turnRight: 'Turn right',
    calibrating: 'Calibrating compass. Hold the phone flat and turn it slowly. The fixed north guide stays visible until readings settle.', headingTimeout: 'No compass reading yet. Hold the phone flat and turn it slowly; the compass will keep listening while the fixed north guide stays visible.', permission: 'Live direction needs location permission and a device location. Showing the fixed north guide.',
    headingUnavailable: 'Compass unavailable. Showing the fixed north guide.', headingLoading: 'Starting compass. Hold the phone flat and turn it slowly if needed; the fixed north guide stays visible.', paused: 'Compass paused. Showing the fixed north guide.',
    device: 'Device location', city: 'City', map: 'Map', manual: 'Manual coordinates',
    useLocation: 'Use my location', locating: 'Finding your location…',
    locationHint: 'Find the Qibla direction from your current location.', locationError: 'Could not get your location. Try again or choose another location.',
    denied: 'Location access was denied. Try again or choose another location.', blocked: 'Location permission is off. Enable it in device settings or choose another location.',
    servicesDisabled: 'Location services are off. Turn them on or choose another location.', timeout: 'Getting your location took too long. Try again or choose another location.',
    unavailable: 'Qibla calculation is unavailable in this build.', calcError: 'Could not calculate the Qibla direction for this location.',
  }};
  const t = localizeCopy(language, copies);
  const align = rtl ? styles.rtl : styles.ltr;
  const errorCopy = state.error ? (state.error === 'locationError' ? t.locationError : t[state.error]) : null;
  const headingHint = !active ? t.paused
    : headingState.status === 'calibrating' ? t.calibrating
      : headingState.reason === 'timeout' ? t.headingTimeout
      : headingState.reason === 'permission' || (location?.source !== 'device' && mode === 'live') ? t.permission
        : headingState.status === 'loading' || headingState.status === 'idle' ? t.headingLoading : t.headingUnavailable;

  const modeChoices = [
    { value: 'live', icon: 'compass-outline', text: bilingual(language, 'بوصلة الهاتف', 'Phone compass') },
    { value: 'north', icon: 'navigate-outline', text: bilingual(language, 'دليل ثابت للشمال', 'Fixed north guide') },
  ] as const;
  const status = canUseLiveHeading
    ? bilingual(language, 'بوصلة مباشرة', 'Live compass')
    : bilingual(language, 'دليل ثابت للشمال', 'Fixed north guide');

  return <ScrollView testID="qibla-page" style={{ flex: 1 }} onLayout={event => setViewport(event.nativeEvent.layout)}
    contentContainerStyle={[styles.screen, landscape && styles.screenWide]}>
    <Text accessibilityRole="header" style={[styles.title, align]}>{t.title}</Text>
    {onChangeLocation && <LocationControl testID="qibla-location" language={language} state={state} onPress={onChangeLocation} />}
    {onModeChange && <View style={[styles.modeChoices, rtl && styles.rowRtl]}>
      {modeChoices.map(choice => <Pressable key={choice.value} testID={`qibla-mode-${choice.value}`}
        accessibilityRole="radio" accessibilityLabel={choice.text} accessibilityState={{ checked: mode === choice.value }} onPress={() => onModeChange(choice.value)}
        style={[styles.modeChoice, rtl && styles.rowRtl, mode === choice.value && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        <Ionicons name={choice.icon} size={19} color={mode === choice.value ? colors.appAccentInk : colors.appMuted} />
        <Text style={[styles.modeText, mode === choice.value && { color: colors.appAccentInk }]}>{choice.text}</Text>
      </Pressable>)}
    </View>}
    {location ? bearing !== null && calculationAvailable && !calculationError ? <View style={[styles.mainArea, landscape && styles.areaWide, landscape && rtl && styles.rowRtl]}>
      <View style={[styles.heroCard, landscape && styles.heroWide]}>
        <View style={styles.statusBadge}>
          <View style={[styles.statusDot, { backgroundColor: canUseLiveHeading ? qiblaSceneColors(colors).marker : colors.appMuted }]} />
          <Text testID="qibla-status" style={styles.statusText}>{status}</Text>
        </View>
        <Text testID="qibla-bearing" style={styles.degrees}>{degrees}</Text>
        <Text style={styles.direction}>{direction}</Text>
        <Text style={styles.reference}>{bilingual(language, 'باتجاه عقارب الساعة من الشمال الحقيقي', 'Clockwise from true north')}</Text>
        <View style={[styles.sceneArea, { height: landscape ? Math.max(200, Math.min(viewport.height - 165, 260)) : Math.max(200, Math.min(viewport.width - 64, viewport.height - 420, 240)) }]}>
          <QiblaCompass trueBearing={bearing} language={language} heading={canUseLiveHeading ? headingState.heading : null} />
        </View>
        <View style={[styles.legend, rtl && styles.rowRtl]}>
          <View style={[styles.legendDot, { backgroundColor: qiblaSceneColors(colors).marker }]} /><Text style={styles.legendText}>{bilingual(language, 'موقعك', 'Your location')}</Text>
          <Ionicons name="navigate" size={15} color={qiblaSceneColors(colors).direction} /><Text style={styles.legendText}>{bilingual(language, 'الكعبة', 'Kaaba')}</Text>
        </View>
      </View>
      <View style={[styles.guideArea, landscape && styles.guideWide]}>
        <View style={[styles.guidanceCard, rtl && styles.rowRtl]}>
          <Ionicons name={canUseLiveHeading && facingQibla ? 'checkmark-circle-outline' : canUseLiveHeading ? 'navigate-outline' : 'information-circle-outline'} size={22} color={colors.accent} />
          {canUseLiveHeading && turn !== null
            ? <Text accessibilityLiveRegion="polite" style={[styles.instruction, facingQibla ? styles.aligned : styles.turning, align]}>{facingQibla ? t.liveFacing : `${turn < 0 ? t.turnLeft : t.turnRight} ${Math.round(Math.abs(turn)).toLocaleString(localeFor(language))}°`}</Text>
            : <Text style={[styles.instruction, align]}>{mode === 'live' ? headingHint : t.instruction}</Text>}
        </View>
      </View>
    </View> : <>
      <View style={styles.errorPanel}>
        <Ionicons name="compass-outline" size={42} color={colors.appMuted} />
        <Text accessibilityRole="alert" style={[styles.error, align]}>{calculationError ? t.calcError : t.unavailable}</Text>
      </View>
    </> : <View style={styles.emptyCard}>
      <View style={styles.emptyIcon}><Ionicons name="compass-outline" size={52} color={colors.accent} /></View>
      <Text style={[styles.emptyTitle, align]}>{bilingual(language, 'اعرف اتجاه قبلتك', 'Find your direction')}</Text>
      <Text style={[styles.hint, align]}>{t.locationHint}</Text>
      {!calculationAvailable && <Text accessibilityRole="alert" style={[styles.error, align]}>{t.unavailable}</Text>}
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: state.loading, ...(state.loading ? { busy: true } : {}) }} disabled={state.loading} onPress={() => void state.locate()} style={[styles.primaryButton, rtl && styles.rowRtl, state.loading && styles.disabled]}>
        {state.loading ? <ActivityIndicator size="small" color={colors.appAccentInk} /> : <Ionicons name="locate-outline" size={22} color={colors.appAccentInk} />}
        <Text style={styles.primaryText}>{state.loading ? t.locating : t.useLocation}</Text>
      </Pressable>
      {onChangeLocation && <Pressable accessibilityRole="button" onPress={onChangeLocation} style={styles.secondaryButton}>
        <Text style={styles.secondaryText}>{bilingual(language, 'خيارات أخرى للموقع', 'Other location options')}</Text>
      </Pressable>}
      {errorCopy && <Text accessibilityRole="alert" style={[styles.error, align]}>{errorCopy}</Text>}
    </View>}
  </ScrollView>;
}

const baseStyles = StyleSheet.create({
  screen: { flexGrow: 1, gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, width: '100%', maxWidth: 620, alignSelf: 'center' },
  screenWide: { maxWidth: 1100 },
  title: { color: '#F4EFE4', fontSize: 22, fontWeight: '700' },
  modeChoices: { flexDirection: 'row', gap: 8 },
  modeChoice: { flex: 1, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, borderWidth: 1, borderColor: '#35564C', paddingHorizontal: 8, paddingVertical: 6 },
  modeText: { color: '#A8C1B8', fontSize: 12, lineHeight: 18, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  mainArea: { gap: 10 },
  areaWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  heroCard: { gap: 3, padding: 12, borderRadius: 20, backgroundColor: '#15342E', borderWidth: 1, borderColor: '#2B4B41', alignItems: 'center' },
  heroWide: { flex: 1.15 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20, backgroundColor: '#102A25', maxWidth: '100%' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#A8C1B8', fontSize: 11, fontWeight: '600', flexShrink: 1, textAlign: 'center' },
  degrees: { color: '#F4EFE4', fontSize: 34, lineHeight: 42, fontWeight: '700', fontVariant: ['tabular-nums'], textAlign: 'center', writingDirection: 'ltr', marginTop: 2 },
  direction: { color: '#D6BA7A', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  reference: { color: '#A8C1B8', fontSize: 11, textAlign: 'center', marginBottom: 2 },
  sceneArea: { width: '100%' },
  frame: { flex: 1, overflow: 'hidden', direction: 'ltr' },
  dial: { position: 'absolute', borderWidth: 1, borderColor: '#35564C' },
  innerDial: { position: 'absolute' },
  pathArrow: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 16, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  youMarker: { position: 'absolute', width: 18, height: 18, borderRadius: 9, borderWidth: 4 },
  kaabaMarker: { position: 'absolute', width: 32, height: 30 },
  kaabaTop: { position: 'absolute', top: 0, left: 8, width: 16, height: 10, backgroundColor: '#443B2A', transform: [{ rotate: '45deg' }] },
  kaabaFront: { position: 'absolute', top: 6, left: 4, width: 24, height: 22, backgroundColor: '#171512', borderWidth: 1, borderColor: '#9B8042' },
  kaabaSide: { position: 'absolute', top: 7, right: 0, width: 6, height: 20, backgroundColor: '#29241A', transform: [{ skewY: '-20deg' }] },
  kaabaBelt: { position: 'absolute', top: 5, left: 0, right: 0, height: 3 },
  kaabaDoor: { position: 'absolute', right: 4, bottom: 0, width: 5, height: 9, borderWidth: 1, borderColor: '#B99A52', backgroundColor: '#302516' },
  compassWord: { position: 'absolute', alignItems: 'center', justifyContent: 'center', width: 60, minHeight: 22 },
  compassText: { color: '#A8C1B8', fontSize: 11, fontWeight: '700' },
  legend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 8 },
  legendDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#A8C1B8' },
  legendText: { color: '#A8C1B8', fontSize: 11, marginEnd: 8 },
  guideArea: { gap: 10 },
  guideWide: { flex: 1, paddingTop: 4 },
  guidanceCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 10, borderRadius: 12, backgroundColor: '#15342E' },
  instruction: { flex: 1, color: '#C1D1CA', fontSize: 13, lineHeight: 20 },
  aligned: { color: '#A8D6A0', fontWeight: '700' },
  turning: { color: '#F4EFE4', fontWeight: '600' },
  emptyCard: { flexGrow: 1, justifyContent: 'center', alignItems: 'stretch', gap: 16, padding: 22, borderRadius: 24, backgroundColor: '#15342E', borderWidth: 1, borderColor: '#2B4B41' },
  emptyIcon: { width: 92, height: 92, borderRadius: 46, backgroundColor: '#102A25', alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 6 },
  emptyTitle: { color: '#F4EFE4', fontSize: 22, fontWeight: '600', textAlign: 'center' },
  hint: { color: '#A8C1B8', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  primaryButton: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, backgroundColor: '#D6BA7A' },
  primaryText: { color: '#102A25', fontSize: 15, fontWeight: '700', flexShrink: 1, textAlign: 'center' },
  secondaryButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', padding: 8 },
  secondaryText: { color: '#D6BA7A', fontSize: 14, textAlign: 'center' },
  disabled: { opacity: 0.45 },
  errorPanel: { minHeight: 220, justifyContent: 'center', alignItems: 'center', gap: 16, padding: 22, borderRadius: 24, backgroundColor: '#15342E' },
  error: { color: '#FFB3A8', fontSize: 14, lineHeight: 22, textAlign: 'center' },
  rowRtl: { flexDirection: 'row-reverse' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  ltr: { textAlign: 'left', writingDirection: 'ltr' },
});
