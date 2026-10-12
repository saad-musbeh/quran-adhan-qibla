import { useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { cities, countries, searchCities, cityLabel, countryLabel } from '../domain/cities';
import { parseCoordinate } from '../domain/coordinates';
import { bilingual, isRTL, localizeCopy, type Language } from '../i18n';
import { LocationMap } from './LocationMap';
import { useReaderStyles } from '../quran-theme-context';

type Coordinates = { latitude: number; longitude: number };
type Selection = Coordinates & { source: 'city' | 'map' | 'manual'; label?: string };
type Props = {
  language: Language; disabled?: boolean; coordinates?: Coordinates;
  onSelect: (value: Selection) => void;
};

export function LocationAlternatives({ language, disabled = false, coordinates, onSelect }: Props) {
  const { styles } = useReaderStyles(baseStyles);
  const rtl = isRTL(language);
  const [open, setOpen] = useState<'city' | 'map' | 'manual' | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryCode, setCountryCode] = useState<string | undefined>();
  const [showCountryFilter, setShowCountryFilter] = useState(false);
  const [countryShown, setCountryShown] = useState(8);
  const [cityQuery, setCityQuery] = useState('');
  const [shown, setShown] = useState(8);
  const [selectedCity, setSelectedCity] = useState<number | null>(null);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [invalid, setInvalid] = useState(false);
  const country = countries.find(item => item.code === countryCode);
  const countryMatches = useMemo(() => {
    const q = countryQuery.trim().toLocaleLowerCase();
    return countries.filter(item => !q || `${item.name} ${item.arabicName ?? ''} ${item.code}`.toLocaleLowerCase().includes(q));
  }, [countryQuery]);
  const matches = useMemo(() => !cityQuery.trim() && countryCode
    ? cities.filter(city => city.countryCode === countryCode)
    : searchCities(cityQuery, countryCode), [cityQuery, countryCode]);
  const copies = {
  ar: {
    title: 'خيارات أخرى للموقع', hint: 'لا تحتاج هذه الخيارات إلى إذن الموقع.',
    city: 'البحث عن مدينة', map: 'اختيار من الخريطة', manual: 'إدخال الإحداثيات',
    countrySearch: 'ابحث عن دولة', citySearch: 'اكتب اسم مدينة', allCountries: 'كل الدول', filterCountry: 'تصفية حسب الدولة',
    pickCountry: 'ابحث عن دولة أو اخترها', clear: 'مسح الدولة', noResults: 'لا توجد نتائج. جرّب تهجئة أخرى أو امسح تصفية الدولة.', searchPrompt: 'ابحث عن مدينة أو اختر دولة لعرض مدنها.',
    showing: 'عرض', of: 'من', use: 'استخدام هذه المدينة', example: 'مثال: الرياض',
    lat: 'خط العرض (اختياري)', lon: 'خط الطول (اختياري)', useCoords: 'استخدام الإحداثيات', invalid: 'أدخل إحداثيات صحيحة ضمن النطاق المسموح.',
    exampleNote: 'يملأ المثال حقلي الرياض فقط؛ لن يُستخدم الموقع حتى تضغط «استخدام الإحداثيات».',
  }, en: {
    title: 'Other location options', hint: 'These options work without location permission.',
    city: 'Search for a city', map: 'Choose on map', manual: 'Enter coordinates',
    countrySearch: 'Search countries', citySearch: 'Enter a city name', allCountries: 'All countries', filterCountry: 'Filter by country',
    pickCountry: 'Search for or choose a country', clear: 'Clear country', noResults: 'No results. Try another spelling or clear the country filter.', searchPrompt: 'Search for a city or choose a country to browse its cities.',
    showing: 'Showing', of: 'of', use: 'Use this city', example: 'Example: Riyadh',
    lat: 'Latitude (optional)', lon: 'Longitude (optional)', useCoords: 'Use coordinates', invalid: 'Enter valid coordinates within the allowed range.',
    exampleNote: 'The example only fills in Riyadh’s values. They are not used until you tap “Use coordinates.”',
  }};
  const txt = localizeCopy(language, copies);
  const alignment = rtl ? styles.rtl : styles.ltr;
  const titleFor = (key: 'city' | 'map' | 'manual') => key === 'city' ? txt.city : key === 'map' ? txt.map : txt.manual;
  const choose = (key: 'city' | 'map' | 'manual') => setOpen(current => current === key ? null : key);
  const useManual = () => {
    const lat = parseCoordinate(latitude, 'latitude');
    const lon = parseCoordinate(longitude, 'longitude');
    if (lat === null || lon === null) { setInvalid(true); return; }
    onSelect({ latitude: lat, longitude: lon, source: 'manual' });
    setInvalid(false);
    setOpen(null);
  };
  return <View style={styles.wrap}>
    <Text style={[styles.heading, alignment]}>{txt.title}</Text>
    <Text style={[styles.hint, alignment]}>{txt.hint}</Text>
    {(['city', 'map', 'manual'] as const).map((key, index) => <View key={key} style={styles.section}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === key, disabled }} disabled={disabled}
        testID={`location-${key}`} onPress={() => choose(key)} style={[styles.choice, open === key && styles.active, disabled && styles.disabled]}>
        <Text style={[styles.choiceText, alignment]}>{index + 1}. {titleFor(key)} {open === key ? '−' : '+'}</Text>
      </Pressable>
      {open === key && <View style={styles.panel}>
        {key === 'city' && <>
          <Pressable accessibilityRole="link" disabled={disabled} onPress={() => { void Linking.openURL('https://www.geonames.org/').catch(() => {}); }}>
            <Text style={[styles.hint, alignment]}>{bilingual(language, 'بيانات المدن: GeoNames · ترخيص CC BY 4.0', 'City data: GeoNames · CC BY 4.0')}</Text>
          </Pressable>
          <TextInput accessibilityLabel={txt.citySearch} editable={!disabled} autoCorrect={false} autoCapitalize="none" value={cityQuery} placeholder={txt.citySearch} placeholderTextColor="#73988D" style={[styles.input, alignment]} onChangeText={value => { setCityQuery(value); setSelectedCity(null); setShown(8); }} />
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCountryFilter, disabled }} disabled={disabled} onPress={() => setShowCountryFilter(value => !value)}><Text style={styles.link}>{txt.filterCountry} {showCountryFilter ? '−' : '+'}</Text></Pressable>
          {country && <View style={[styles.selectedCountry, rtl && styles.selectedCountryRtl]}>
            <Text style={[styles.cityText, alignment]}>{countryLabel(country, language)} · {country.cityCount}/{country.targetCount}</Text>
            <Pressable accessibilityRole="button" disabled={disabled} onPress={() => { setCountryCode(undefined); setSelectedCity(null); setShown(8); }}><Text style={styles.link}>{txt.clear}</Text></Pressable>
          </View>}
          {showCountryFilter && <>
            <TextInput accessibilityLabel={txt.countrySearch} editable={!disabled} autoCorrect={false} autoCapitalize="none" value={countryQuery} placeholder={txt.countrySearch} placeholderTextColor="#73988D" style={[styles.input, alignment]} onChangeText={value => { setCountryQuery(value); setCountryShown(8); }} />
            <View style={styles.countryWrap}>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: !countryCode, disabled }} disabled={disabled} onPress={() => { setCountryCode(undefined); setSelectedCity(null); setShown(8); }} style={[styles.countryChip, !countryCode && styles.selectedChip]}>
                <Text style={styles.cityText}>{txt.allCountries}</Text>
              </Pressable>
              {countryMatches.slice(0, countryShown).map(item => <Pressable key={item.code} accessibilityRole="button" accessibilityState={{ selected: countryCode === item.code, disabled }} disabled={disabled} onPress={() => { setCountryCode(item.code); setCountryQuery(''); setShowCountryFilter(false); setSelectedCity(null); setShown(8); }} style={[styles.countryChip, countryCode === item.code && styles.selectedChip]}>
                <Text style={styles.cityText}>{countryLabel(item, language)} · {item.cityCount}/{item.targetCount}</Text>
              </Pressable>)}
            </View>
            {countryShown < countryMatches.length && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setCountryShown(value => value + 10)}><Text style={styles.link}>{bilingual(language, 'عرض المزيد من الدول', 'Show more countries')}</Text></Pressable>}
            <Text style={[styles.hint, alignment]}>{txt.pickCountry}</Text>
          </>}
          {matches.length === 0 ? <Text accessibilityRole="text" style={[styles.hint, alignment]}>{cityQuery.trim() ? txt.noResults : countryCode ? txt.noResults : txt.searchPrompt}</Text> : <>
            {matches.slice(0, shown).map(city => {
              const nation = countries.find(item => item.code === city.countryCode);
              return <Pressable key={city.id} accessibilityRole="radio" accessibilityState={{ checked: selectedCity === city.id, disabled }} disabled={disabled} style={[styles.cityRow, selectedCity === city.id && styles.selectedCity]} onPress={() => setSelectedCity(city.id)}>
                <Text style={[styles.cityText, alignment]}>{cityLabel(city, language)}</Text>
                <Text style={[styles.hint, alignment]}>{nation ? countryLabel(nation, language) : city.countryCode}</Text>
              </Pressable>;
            })}
            <Text style={[styles.hint, alignment]}>{txt.showing} {Math.min(shown, matches.length)} {txt.of} {matches.length}</Text>
            {shown < matches.length && <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setShown(n => n + 8)}><Text style={styles.link}>{bilingual(language, 'عرض المزيد', 'Show more')}</Text></Pressable>}
            {selectedCity && matches.some(city => city.id === selectedCity) && <Pressable accessibilityRole="button" disabled={disabled} style={[styles.apply, disabled && styles.disabled]} onPress={() => {
              const city = matches.find(item => item.id === selectedCity)!;
              const nation = countries.find(item => item.code === city.countryCode);
              onSelect({ latitude: city.latitude, longitude: city.longitude, source: 'city', label: `${nation ? countryLabel(nation, language) : city.countryCode} · ${cityLabel(city, language)}` });
              setOpen(null);
            }}><Text style={styles.applyText}>{txt.use}</Text></Pressable>}
          </>}
        </>}
        {key === 'map' && <LocationMap language={language} initialCoordinates={coordinates} disabled={disabled} onSelect={value => { onSelect({ ...value, source: 'map' }); setOpen(null); }} />}
        {key === 'manual' && <>
          <Text style={[styles.label, alignment]}>{txt.lat}</Text>
          <TextInput testID="manual-latitude" accessibilityLabel={txt.lat} editable={!disabled} autoCorrect={false} autoCapitalize="none" value={latitude} onChangeText={value => { setLatitude(value); setInvalid(false); }} placeholder="24.7136" placeholderTextColor="#73988D" keyboardType="numbers-and-punctuation" style={[styles.input, styles.ltr]} />
          <Text style={[styles.label, alignment]}>{txt.lon}</Text>
          <TextInput testID="manual-longitude" accessibilityLabel={txt.lon} editable={!disabled} autoCorrect={false} autoCapitalize="none" value={longitude} onChangeText={value => { setLongitude(value); setInvalid(false); }} placeholder="46.6753" placeholderTextColor="#73988D" keyboardType="numbers-and-punctuation" style={[styles.input, styles.ltr]} />
          <Pressable accessibilityRole="button" disabled={disabled} testID="location-example" onPress={() => { setLatitude('24.7136'); setLongitude('46.6753'); setInvalid(false); }}><Text style={styles.link}>{txt.example}</Text></Pressable>
          <Text style={[styles.hint, alignment]}>{txt.exampleNote}</Text>
          {invalid && <Text accessibilityRole="alert" style={styles.error}>{txt.invalid}</Text>}
          <Pressable accessibilityRole="button" disabled={disabled} style={[styles.apply, disabled && styles.disabled]} testID="location-confirm" onPress={useManual}><Text style={styles.applyText}>{txt.useCoords}</Text></Pressable>
        </>}
      </View>}
    </View>)}
  </View>;
}

const baseStyles = StyleSheet.create({
  wrap: { gap: 10 }, section: { gap: 8 }, heading: { color: '#F4EFE4', fontSize: 18, fontWeight: '600' },
  hint: { color: '#A8C1B8', fontSize: 12, lineHeight: 20 }, ltr: { textAlign: 'left', writingDirection: 'ltr' }, rtl: { textAlign: 'right', writingDirection: 'rtl' },
  choice: { borderWidth: 1, borderColor: '#35544B', borderRadius: 12, padding: 13, backgroundColor: '#102A25' }, active: { borderColor: '#D6BA7A', backgroundColor: '#284C40' },
  choiceText: { color: '#F4EFE4', fontSize: 15, fontWeight: '600' }, panel: { gap: 9, padding: 12, backgroundColor: '#15342E', borderRadius: 14, borderWidth: 1, borderColor: '#2B4B41' },
  selectedCountry: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 }, selectedCountryRtl: { flexDirection: 'row-reverse' },
  input: { color: '#F4EFE4', backgroundColor: '#0B211D', borderWidth: 1, borderColor: '#35544B', borderRadius: 10, padding: 11, textAlign: 'left' },
  countryWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, countryChip: { paddingVertical: 7, paddingHorizontal: 9, borderRadius: 16, borderWidth: 1, borderColor: '#35544B' }, selectedChip: { borderColor: '#D6BA7A', backgroundColor: '#284C40' },
  cityRow: { padding: 9, borderBottomWidth: 1, borderBottomColor: '#2B4B41', gap: 2 }, selectedCity: { backgroundColor: '#284C40', borderRadius: 8 }, cityText: { color: '#F4EFE4', fontSize: 14 }, link: { color: '#D6BA7A', textDecorationLine: 'underline', paddingVertical: 4 },
  label: { color: '#F4EFE4', fontSize: 13 }, apply: { backgroundColor: '#D6BA7A', borderRadius: 10, padding: 12, alignItems: 'center' }, applyText: { color: '#102A25', fontWeight: '700' }, disabled: { opacity: 0.4 }, error: { color: '#FFB3A8', fontSize: 13 },
});
