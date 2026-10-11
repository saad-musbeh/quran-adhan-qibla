import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';
import type { useLocation } from '../use-location';

type Props = {
  language: 'ar' | 'en';
  state: ReturnType<typeof useLocation>;
  bearing: number | null;
  calculationAvailable: boolean;
  calculationError: boolean;
  onChangeLocation: () => void;
};

const directions = {
  en: ['North', 'Northeast', 'East', 'Southeast', 'South', 'Southwest', 'West', 'Northwest'],
  ar: ['شمال', 'شمال شرقي', 'شرق', 'جنوب شرقي', 'جنوب', 'جنوب غربي', 'غرب', 'شمال غربي'],
} as const;

function lineBetween(x1: number, y1: number, x2: number, y2: number, color: string, opacity = 1): ViewStyle {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const length = Math.sqrt(dx * dx + dy * dy);
  return {
    position: 'absolute', left: (x1 + x2) / 2 - length / 2, top: (y1 + y2) / 2 - 1,
    width: length, height: 2, borderRadius: 2, backgroundColor: color, opacity,
    transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
  };
}

function VirtualQiblaScene({ bearing, language }: { bearing: number; language: 'ar' | 'en' }) {
  const ar = language === 'ar';
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = (event: LayoutChangeEvent) => setSize({ width: event.nativeEvent.layout.width, height: event.nativeEvent.layout.height });
  const { width, height } = size;
  const floorHeight = height * 0.62;
  const cx = width / 2;
  const cy = height * 0.56;
  const radius = Math.max(0, Math.min(width * 0.39, height * 0.35, width / 2 - 40, cy - 60, height - cy - 40));
  const radians = bearing * Math.PI / 180;
  const targetX = cx + Math.sin(radians) * radius;
  const targetY = cy - Math.cos(radians) * radius;
  const arrowX = cx + Math.sin(radians) * radius * 0.61;
  const arrowY = cy - Math.cos(radians) * radius * 0.61;
  const cardinal = ar ? { n: 'شمال', e: 'شرق', s: 'جنوب', w: 'غرب' } : { n: 'N', e: 'E', s: 'S', w: 'W' };
  const guidance = bearing.toLocaleString(ar ? 'ar-SA-u-nu-latn' : 'en', { maximumFractionDigits: 1 });

  return <View onLayout={onLayout} style={scene.frame} accessible accessibilityLabel={ar ? `مشهد توضيحي افتراضي باتجاه الشمال، القبلة ${guidance} درجة` : `Illustrated virtual north-facing view, Qibla at ${guidance} degrees`}>
    <View pointerEvents="none" style={scene.sky}>
      <View style={scene.skyGlow} />
      <View style={[scene.mountain, scene.mountainLeft]} />
      <View style={[scene.mountain, scene.mountainRight]} />
    </View>
    <View pointerEvents="none" style={scene.floor}>
      <View style={scene.horizon} />
      {[0.49, 0.58, 0.69, 0.82, 0.98].map(level => <View key={level} style={[scene.floorLine, { top: `${level * 100}%` }]} />)}
      {[-0.28, 0, 0.28, 0.56, 0.84, 1.12, 1.4].map((end, index) => {
        const startX = width * (0.5 + (end - 0.5) * 0.1);
        return <View key={index} style={lineBetween(startX, 0, width * end, floorHeight, '#4A7267', 0.42)} />;
      })}
    </View>
    <View pointerEvents="none" style={scene.label}>
      <View style={scene.northBadge}><Text style={scene.northArrow}>↑</Text><Text style={scene.northText}>{ar ? 'الشمال الحقيقي' : 'TRUE NORTH'}</Text></View>
      <Text style={scene.virtualTag}>{ar ? 'مشهد توضيحي افتراضي' : 'ILLUSTRATED VIEW'}</Text>
    </View>
    {width > 0 && height > 0 && <>
      <View pointerEvents="none" style={lineBetween(cx, cy, targetX, targetY, '#49C9C0', 0.72)} />
      <View pointerEvents="none" style={[scene.pathLine, lineBetween(cx, cy, targetX, targetY, '#E6C774', 1)]} />
      <View pointerEvents="none" style={[scene.pathArrow, { left: arrowX - 9, top: arrowY - 10, transform: [{ rotate: `${bearing}deg` }] }]} />
      <View pointerEvents="none" style={[scene.youMarker, { left: cx - 8, top: cy - 8 }]}><View style={scene.youDot} /></View>
      <View pointerEvents="none" style={[scene.kaabaMarker, { left: targetX - 27, top: targetY - 43 }]}>
        <View style={scene.kaabaTop} /><View style={scene.kaabaSide} /><View style={scene.kaabaFront}>
          <View style={scene.kaabaBelt} /><View style={scene.kaabaDoor} />
        </View>
      </View>
      <View pointerEvents="none" style={[scene.kaabaLabel, { left: Math.max(5, Math.min(width - 109, targetX - 52)), top: Math.min(height - 21, targetY + 21) }]}>
        <Text style={scene.kaabaLabelText}>{ar ? 'الكعبة' : 'Kaaba'}</Text>
      </View>
    </>}
    <View pointerEvents="none" style={[scene.compassWord, scene.compassN]}><Text style={scene.compassText}>{cardinal.n}</Text></View>
    <View pointerEvents="none" style={[scene.compassWord, scene.compassE]}><Text style={scene.compassText}>{cardinal.e}</Text></View>
    <View pointerEvents="none" style={[scene.compassWord, scene.compassS]}><Text style={scene.compassText}>{cardinal.s}</Text></View>
    <View pointerEvents="none" style={[scene.compassWord, scene.compassW]}><Text style={scene.compassText}>{cardinal.w}</Text></View>
  </View>;
}

export function QiblaScreen({ language, state, bearing, calculationAvailable, calculationError, onChangeLocation }: Props) {
  const ar = language === 'ar';
  const location = state.location;
  const direction = bearing === null ? '' : directions[language][Math.round(bearing / 45) % 8];
  const degrees = bearing === null ? '' : `${bearing.toLocaleString(ar ? 'ar-SA-u-nu-latn' : 'en', { maximumFractionDigits: 1 })}°`;
  const t = ar ? {
    title: 'اتجاه القبلة', instruction: 'قف مواجهًا الشمال الحقيقي، ثم اتبع السهم. يظل الدليل ثابتًا.',
    device: 'موقع الجهاز', city: 'المدينة', map: 'الخريطة', manual: 'إحداثيات يدوية',
    useLocation: 'استخدام موقعي', locating: 'جارٍ تحديد الموقع…', changeLocation: 'تغيير الموقع', otherOptions: 'خيارات موقع أخرى',
    locationHint: 'اعثر على اتجاه القبلة من موقعك الحالي.', locationError: 'تعذّر تحديد الموقع. حاول مجددًا أو اختر موقعًا آخر.',
    denied: 'لم يُسمح بالوصول إلى الموقع. حاول مجددًا أو اختر موقعًا آخر.', blocked: 'إذن الموقع متوقف. فعّله من إعدادات الجهاز أو اختر موقعًا آخر.',
    servicesDisabled: 'خدمة الموقع متوقفة. فعّلها أو اختر موقعًا آخر.', timeout: 'استغرق تحديد الموقع وقتًا طويلًا. حاول مجددًا أو اختر موقعًا آخر.',
    unavailable: 'حساب اتجاه القبلة غير متاح في هذا الإصدار.', calcError: 'تعذّر حساب اتجاه القبلة لهذا الموقع.',
  } : {
    title: 'Qibla direction', instruction: 'Face true north first, then follow the arrow. The guide stays fixed.',
    device: 'Device location', city: 'City', map: 'Map', manual: 'Manual coordinates',
    useLocation: 'Use my location', locating: 'Finding your location…', changeLocation: 'Change location', otherOptions: 'Other location options',
    locationHint: 'Find the Qibla direction from your current location.', locationError: 'Could not get your location. Try again or choose another location.',
    denied: 'Location access was denied. Try again or choose another location.', blocked: 'Location permission is off. Enable it in device settings or choose another location.',
    servicesDisabled: 'Location services are off. Turn them on or choose another location.', timeout: 'Getting your location took too long. Try again or choose another location.',
    unavailable: 'Qibla calculation is unavailable in this build.', calcError: 'Could not calculate the Qibla direction for this location.',
  };
  const align = ar ? styles.rtl : styles.ltr;
  const errorCopy = state.error ? (state.error === 'locationError' ? t.locationError : t[state.error]) : null;
  const sourceCopy = location ? t[location.source] : '';

  return <View style={styles.screen}>
    <Text style={[styles.eyebrow, align]}>{t.title}</Text>
    {location ? <>
      {bearing !== null && calculationAvailable && !calculationError ? <View style={styles.mainArea}>
        <VirtualQiblaScene bearing={bearing} language={language} />
        <View style={[styles.readout, ar && styles.readoutRtl]}>
          <Text style={[styles.direction, align]}>{direction}</Text>
          <Text style={styles.degrees}>{degrees}</Text>
        </View>
        <Text style={[styles.instruction, align]}>{t.instruction}</Text>
      </View> : <View style={[styles.errorPanel, styles.mainArea]}>
        <Text style={[styles.errorHeading, align]}>{t.title}</Text>
        <Text accessibilityRole="alert" style={[styles.error, align]}>{calculationError ? t.calcError : t.unavailable}</Text>
      </View>}
      <View style={[styles.locationRow, ar && styles.rowRtl]}>
        <View style={styles.locationDetails}>
          <Text numberOfLines={1} style={[styles.locationSource, align]}>{location.source === 'city' && location.label ? location.label : sourceCopy}</Text>
          <Text style={styles.coordinates}>{location.latitude.toFixed(3)}, {location.longitude.toFixed(3)}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel={t.changeLocation} disabled={state.loading} onPress={onChangeLocation} style={[styles.changeButton, state.loading && styles.disabled]}>
          <Text style={styles.changeText}>{t.changeLocation}</Text>
        </Pressable>
      </View>
    </> : <View style={styles.emptyCard}>
      <Text style={[styles.emptyTitle, align]}>{t.title}</Text>
      <Text style={[styles.hint, align]}>{calculationAvailable ? t.locationHint : t.unavailable}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: state.loading, ...(state.loading ? { busy: true } : {}) }} disabled={state.loading} onPress={() => void state.locate()} style={[styles.primaryButton, state.loading && styles.disabled]}>
        {state.loading && <ActivityIndicator size="small" color="#102A25" />}
        <Text style={styles.primaryText}>{state.loading ? t.locating : t.useLocation}</Text>
      </Pressable>
      {errorCopy && <Text accessibilityRole="alert" style={[styles.error, align]}>{errorCopy}</Text>}
      <Pressable accessibilityRole="button" disabled={state.loading} onPress={onChangeLocation} style={styles.secondaryButton}>
        <Text style={[styles.secondaryText, align]}>{t.otherOptions}</Text>
      </Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, minHeight: 0, gap: 8, paddingHorizontal: 14, paddingVertical: 8, width: '100%', maxWidth: 620, alignSelf: 'center' },
  eyebrow: { color: '#D6BA7A', fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },
  mainArea: { flex: 1, minHeight: 0 },
  frame: { flex: 1, minHeight: 180, overflow: 'hidden', borderRadius: 20, borderWidth: 1, borderColor: '#35564C', backgroundColor: '#102A25' },
  sky: { position: 'absolute', left: 0, right: 0, top: 0, height: '43%', overflow: 'hidden', backgroundColor: '#193D36' }, skyGlow: { position: 'absolute', width: '80%', height: '150%', left: '10%', top: '12%', borderRadius: 300, backgroundColor: '#285146', opacity: 0.45 },
  mountain: { position: 'absolute', bottom: 0, width: 0, height: 0, borderLeftWidth: 85, borderRightWidth: 85, borderBottomWidth: 55, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#28483E' }, mountainLeft: { left: -20 }, mountainRight: { right: -28, borderLeftWidth: 115, borderRightWidth: 115, borderBottomWidth: 74, borderBottomColor: '#23443B' },
  floor: { position: 'absolute', top: '38%', left: 0, right: 0, bottom: 0, backgroundColor: '#102A25' }, horizon: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: '#5E8276', opacity: 0.7 }, floorLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: '#4A7267', opacity: 0.42 },
  label: { position: 'absolute', top: 10, left: 10, right: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }, northBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 15, backgroundColor: '#0B211DCC' }, northArrow: { color: '#D6BA7A', fontSize: 16, fontWeight: '800' }, northText: { color: '#F4EFE4', fontSize: 10, fontWeight: '700' }, virtualTag: { color: '#BDD4CB', fontSize: 9, fontWeight: '700', letterSpacing: 0.8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 12, backgroundColor: '#0B211D99' },
  pathLine: { opacity: 0.85 }, pathArrow: { position: 'absolute', width: 0, height: 0, borderLeftWidth: 8, borderRightWidth: 8, borderBottomWidth: 14, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: '#F4E1A4' },
  youMarker: { position: 'absolute', width: 16, height: 16, borderRadius: 8, backgroundColor: '#49C9C0', borderWidth: 3, borderColor: '#D8F6EF', alignItems: 'center', justifyContent: 'center' }, youDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#102A25' },
  kaabaMarker: { position: 'absolute', width: 54, height: 48, alignItems: 'center' }, kaabaTop: { position: 'absolute', top: 0, width: 22, height: 14, backgroundColor: '#443B2A', transform: [{ rotate: '45deg' }] }, kaabaFront: { position: 'absolute', top: 9, left: 11, width: 33, height: 30, backgroundColor: '#171512', borderWidth: 1, borderColor: '#9B8042' }, kaabaSide: { position: 'absolute', top: 10, right: 2, width: 12, height: 28, backgroundColor: '#29241A', transform: [{ skewY: '-20deg' }] }, kaabaBelt: { position: 'absolute', top: 7, left: 0, right: 0, height: 4, backgroundColor: '#D6BA7A' }, kaabaDoor: { position: 'absolute', right: 5, bottom: 0, width: 7, height: 12, borderWidth: 1, borderColor: '#B99A52', backgroundColor: '#302516' },
  kaabaLabel: { position: 'absolute', width: 104, alignItems: 'center', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: '#0B211DD9' }, kaabaLabelText: { color: '#F4EFE4', fontSize: 10, fontWeight: '700' },
  compassWord: { position: 'absolute', alignItems: 'center', justifyContent: 'center', minWidth: 24, minHeight: 22, borderRadius: 11, backgroundColor: '#0B211D99' }, compassN: { top: '35%', left: '50%', marginLeft: -12 }, compassE: { right: 5, top: '56%' }, compassS: { bottom: 3, left: '50%', marginLeft: -12 }, compassW: { left: 5, top: '56%' }, compassText: { color: '#A8C1B8', fontSize: 9, fontWeight: '700' },
  readout: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, readoutRtl: { flexDirection: 'row-reverse' }, direction: { color: '#F4EFE4', fontSize: 16, fontWeight: '700' }, degrees: { color: '#D6BA7A', fontSize: 15, fontVariant: ['tabular-nums'] }, instruction: { color: '#C1D1CA', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  locationRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 11, paddingVertical: 7, borderRadius: 14, backgroundColor: '#15342E', borderWidth: 1, borderColor: '#2B4B41' }, rowRtl: { flexDirection: 'row-reverse' }, locationDetails: { flex: 1, gap: 2 }, locationSource: { color: '#F4EFE4', fontSize: 13, fontWeight: '600' }, coordinates: { color: '#A8C1B8', fontSize: 11, fontVariant: ['tabular-nums'], textAlign: 'left', writingDirection: 'ltr' }, changeButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 11, borderRadius: 12, borderWidth: 1, borderColor: '#547265' }, changeText: { color: '#D6BA7A', fontSize: 12, fontWeight: '700' },
  emptyCard: { flex: 1, minHeight: 0, justifyContent: 'center', gap: 13, padding: 18, borderRadius: 22, backgroundColor: '#15342E', borderWidth: 1, borderColor: '#2B4B41' }, emptyTitle: { color: '#F4EFE4', fontSize: 22, fontWeight: '600' }, hint: { color: '#A8C1B8', fontSize: 14, lineHeight: 22 }, primaryButton: { minHeight: 50, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, paddingHorizontal: 16, borderRadius: 14, backgroundColor: '#D6BA7A' }, primaryText: { color: '#102A25', fontSize: 16, fontWeight: '700' }, secondaryButton: { minHeight: 44, justifyContent: 'center', alignItems: 'center', paddingVertical: 8 }, secondaryText: { color: '#D6BA7A', fontSize: 14, textDecorationLine: 'underline' }, disabled: { opacity: 0.45 },
  errorPanel: { justifyContent: 'center', alignItems: 'center', gap: 12, padding: 20, borderRadius: 20, backgroundColor: '#15342E' }, errorHeading: { color: '#F4EFE4', fontSize: 20, fontWeight: '700' }, error: { color: '#FFB3A8', fontSize: 14, lineHeight: 20, textAlign: 'center' }, rtl: { textAlign: 'right', writingDirection: 'rtl' }, ltr: { textAlign: 'left', writingDirection: 'ltr' },
});

const scene = styles;
