import { Pressable } from './Pressable';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Text } from '../text-size';
import { formatLocationLabel } from '../domain/cities';
import { prayerLocationLabel } from '../city-database';
import { bilingual, isRTL, translations, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';
import type { useLocation } from '../use-location';

/** One entry point for device refresh, city search, map and manual coordinates. */
export function LocationControl({ language, state, onPress, testID }: {
  language: Language; state: ReturnType<typeof useLocation>; onPress: () => void; testID: string;
}) {
  const { styles, colors } = useReaderStyles(baseStyles);
  const rtl = isRTL(language), t = translations[language];
  const [resolved,setResolved]=useState<{location:typeof state.location;language:Language;label:string}|null>(null);
  const label=resolved?.location===state.location&&resolved.language===language?resolved.label:state.location?formatLocationLabel(state.location,language,null):t.useLocation;
  useEffect(()=>{
    let alive=true;const location=state.location;
    if(location)void prayerLocationLabel(location,language).then(label=>{if(alive)setResolved({location,language,label});}).catch(()=>{/* Coordinates remain usable if catalogue access fails. */});
    return()=>{alive=false;};
  },[state.location,language]);
  return <Pressable testID={testID} accessibilityRole="button"
    accessibilityLabel={`${bilingual(language, 'تغيير الموقع', 'Change location')}: ${label}`} onPress={onPress}
    style={[styles.strip, rtl && styles.reverse]}>
    <Ionicons name="location-outline" color={colors.accent} size={21} />
    <Text numberOfLines={1} style={[styles.label, rtl && styles.rtl]}>{label}</Text>
    {state.loading ? <ActivityIndicator color={colors.accent} size="small" />
      : <Ionicons name={rtl ? 'chevron-back' : 'chevron-forward'} color={colors.appMuted} size={16} />}
  </Pressable>;
}
const baseStyles = StyleSheet.create({
  strip: { minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#193A32', flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { flex: 1, color: '#F4EFE4', fontSize: 15, fontWeight: '600' },
  reverse: { flexDirection: 'row-reverse' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
});
