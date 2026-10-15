import { Pressable } from './Pressable';
import { Text, useTextScale } from '../text-size';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, View } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { LEAFLET_CSS, LEAFLET_JS, LEAFLET_LICENSE } from './map-assets/leaflet-runtime';
import { parseMapMessage, type SelectedCoordinates } from './map-assets/map-message';
import { isRTL, localizeCopy, bilingual, type Language } from '../i18n';
import { useReaderStyles } from '../quran-theme-context';

type Props = {
  language: Language;
  initialCoordinates?: SelectedCoordinates;
  onSelect: (coordinates: SelectedCoordinates) => void;
  disabled?: boolean;
};

const copy = {
  en: { title: 'Choose a point on the map', privacy: 'Map selection requires internet. Only map tiles contact OpenStreetMap and share your IP address and viewed area. City search and manual coordinates work offline.', use: 'Use selected point', selected: 'Selected coordinates', loading: 'Loading map…', failure: 'The map could not load. Check your connection and try again. City search and manual coordinates are still available offline.', retry: 'Retry', hint: 'Tap the map to choose a point' },
  ar: { title: 'اختر موقعًا على الخريطة', privacy: 'يتطلب اختيار الموقع عبر الخريطة اتصالًا بالإنترنت. مربعات الخريطة وحدها تتصل بـ OpenStreetMap وتكشف عنوان IP والمنطقة المعروضة. يعمل البحث عن مدينة وإدخال الإحداثيات يدويًا دون اتصال.', use: 'استخدم الموقع المحدد', selected: 'الإحداثيات المحددة', loading: 'جارٍ تحميل الخريطة…', failure: 'تعذّر تحميل الخريطة. تحقّق من الاتصال وحاول مجددًا. يظل البحث عن مدينة وإدخال الإحداثيات يدويًا متاحين دون اتصال.', retry: 'إعادة المحاولة', hint: 'انقر على الخريطة لاختيار موقع' },
} as const;

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);
}

function mapHtml(center: SelectedCoordinates | undefined, language: Language, hint: string, theme: ReturnType<typeof useReaderStyles>['colors']) {
  const initial = center && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)
    && Math.abs(center.latitude) <= 90 && Math.abs(center.longitude) <= 180
    ? center : { latitude: 20, longitude: 0 };
  const direction = isRTL(language) ? 'rtl' : 'ltr';
  return `<!doctype html><html lang="${escapeHtml(language)}" dir="${direction}"><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"><style>${LEAFLET_CSS}html,body,#map{height:100%;width:100%;margin:0;background:#eef2f4}.hint{position:absolute;z-index:500;top:8px;left:50%;transform:translateX(-50%);padding:5px 9px;border-radius:6px;background:${theme.appSurface};color:${theme.appText};font:calc(13px * var(--text-scale,1)) sans-serif;max-width:calc(100% - 24px);text-align:center;box-shadow:0 1px 4px #0003}.leaflet-control-attribution{font-size:calc(11px * var(--text-scale,1))}.leaflet-popup-content{font-size:calc(13px * var(--text-scale,1))}</style><script>${LEAFLET_JS}</script></head><body><!-- ${LEAFLET_LICENSE} --><div id="map"></div><div class="hint">${escapeHtml(hint)}</div><script>
window.setTextScale=value=>document.documentElement.style.setProperty('--text-scale',String(value));
const map=L.map('map',{zoomControl:false,attributionControl:true,preferCanvas:true,worldCopyJump:false}).setView([${initial.latitude},${initial.longitude}],${center ? 12 : 2});
map.zoomControl=L.control.zoom({zoomInTitle:${JSON.stringify(bilingual(language,'تكبير الخريطة','Zoom in')).replace(/</g,'\\u003c')},zoomOutTitle:${JSON.stringify(bilingual(language,'تصغير الخريطة','Zoom out')).replace(/</g,'\\u003c')}}).addTo(map);
const tileLayer=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{minZoom:2,maxZoom:19,updateWhenIdle:true,keepBuffer:2,detectRetina:false,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
let tileErrors=0,tileFailed=false,tileReady=false;const tileTimeout=setTimeout(()=>{if(!tileReady){tileFailed=true;window.setMapEnabled(false);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-error'}));}},15000);
tileLayer.on('tileload',()=>{tileErrors=0;if(!tileReady){tileReady=true;clearTimeout(tileTimeout);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-ready'}));}});tileLayer.on('tileerror',()=>{if(tileFailed)return;tileErrors+=1;if(tileErrors>=3){tileFailed=true;clearTimeout(tileTimeout);window.setMapEnabled(false);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-error'}));}});
let marker=null,enabled=true;window.setMapEnabled=value=>{enabled=!!value;if(enabled){map.dragging.enable();map.touchZoom.enable();map.doubleClickZoom.enable();map.scrollWheelZoom.enable();map.keyboard.enable();map.zoomControl.addTo(map);}else{map.dragging.disable();map.touchZoom.disable();map.doubleClickZoom.disable();map.scrollWheelZoom.disable();map.keyboard.disable();map.zoomControl.remove();}};
function choose(latlng){if(!enabled)return;const p={latitude:latlng.lat,longitude:latlng.lng};if(marker)marker.setLatLng(latlng);else marker=L.circleMarker(latlng,{radius:8,color:'#fff',weight:3,fillColor:'${theme.accent}',fillOpacity:1}).addTo(map);window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',latitude:p.latitude,longitude:p.longitude}));}
map.on('click',event=>choose(event.latlng));
${center ? `choose(L.latLng(${initial.latitude},${initial.longitude}));` : ''}
</script></body></html>`;
}

export function LocationMap({ language, initialCoordinates, onSelect, disabled = false }: Props) {
  const { colors: theme, styles } = useReaderStyles(baseStyles);
  const textScale = useTextScale();
  const t = localizeCopy(language, copy);
  const [selected, setSelected] = useState<SelectedCoordinates | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const webView = useRef<WebView>(null);
  const html = useMemo(() => mapHtml(initialCoordinates, language, t.hint, theme), [initialCoordinates, language, attempt, t.hint, theme]);
  const isRtl = isRTL(language);
  const setMapEnabledScript = `window.setMapEnabled && window.setMapEnabled(${!disabled}); true;`;

  const scaleScript = `window.setTextScale && window.setTextScale(${textScale}); true;`;
  useEffect(() => { webView.current?.injectJavaScript(setMapEnabledScript); }, [setMapEnabledScript]);
  useEffect(() => { webView.current?.injectJavaScript(scaleScript); }, [scaleScript]);
  const handleNavigation = (request: WebViewNavigation) => {
    if (request.url === 'about:blank') return true;
    if (request.url === 'https://www.openstreetmap.org/copyright') void Linking.openURL(request.url);
    return false;
  };

  return <View style={styles.container}>

    <Text style={[styles.privacy, isRtl && styles.rtl]}>{t.privacy}</Text>
    <View style={styles.mapFrame}>
      <WebView
        key={attempt}
        ref={webView}
        source={{ html }}
        originWhitelist={['about:blank', 'https://www.openstreetmap.org']}
        onShouldStartLoadWithRequest={handleNavigation}
        onLoadStart={() => { setLoading(true); setFailed(false); }}
        onLoadEnd={() => { webView.current?.injectJavaScript(setMapEnabledScript+scaleScript); }}
        onError={() => { setLoading(false); setFailed(true); }}
        onHttpError={() => { setLoading(false); setFailed(true); }}
        onMessage={event => {
          try {
            const message = JSON.parse(event.nativeEvent.data) as { type?: unknown };
            if (message?.type === 'map-error') { setLoading(false); setFailed(true); return; }
            if (message?.type === 'map-ready') { setLoading(false); setFailed(false); return; }
          } catch { /* Invalid messages are ignored by the coordinate parser below. */ }
          const coordinates = parseMapMessage(event.nativeEvent.data);
          if (coordinates && !disabled) setSelected(coordinates);
        }}
        javaScriptEnabled
        domStorageEnabled={false}
        cacheEnabled
        allowFileAccess={false}
        allowFileAccessFromFileURLs={false}
        allowUniversalAccessFromFileURLs={false}
        mixedContentMode="never"
        userAgent="QuranAdhanQibla/0.2.0 (https://github.com/saad-musbeh/quran-adhan-qibla)"
        javaScriptCanOpenWindowsAutomatically={false}
        setSupportMultipleWindows={false}
        scrollEnabled={false}
        style={styles.webview}
      />
      {loading && !failed && <View style={styles.overlay}><ActivityIndicator /><Text style={styles.overlayText}>{t.loading}</Text></View>}
      {failed && <View style={styles.failure}><Text style={[styles.failureText, isRtl && styles.rtl]}>{t.failure}</Text><Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={() => { setSelected(null); setLoading(true); setFailed(false); setAttempt(value => value + 1); }} style={[styles.retry, disabled && styles.disabledButton]}><Text style={styles.retryText}>{t.retry}</Text></Pressable></View>}
    </View>
    {disabled && <View pointerEvents="auto" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.interactionBlocker} />}
    {selected && <View style={[styles.selection, isRtl && styles.selectionRtl]}>
      <Text style={styles.selectionLabel}>{t.selected}</Text>
      <Text selectable style={styles.coordinates}>{selected.latitude.toFixed(5)}, {selected.longitude.toFixed(5)}</Text>
      <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || failed || loading }} disabled={disabled || failed || loading} onPress={() => onSelect(selected)} style={[styles.useButton, (disabled || failed || loading) && styles.disabledButton]}>
        <Text style={styles.useText}>{t.use}</Text>
      </Pressable>
    </View>}
  </View>;
}

const baseStyles = StyleSheet.create({
  container: { gap: 8 },
  title: { color: '#F4EFE4', fontSize: 16, fontWeight: '700', textAlign: 'left' },
  privacy: { color: '#A8C1B8', fontSize: 12, lineHeight: 18, textAlign: 'left' },
  rtl: { textAlign: 'right', writingDirection: 'rtl' },
  mapFrame: { height: 280, overflow: 'hidden', borderRadius: 12, backgroundColor: '#eef2f4' },
  interactionBlocker: { ...StyleSheet.absoluteFill, backgroundColor: '#ffffff22' },
  disabledButton: { opacity: 0.5 },
  webview: { backgroundColor: 'transparent' },
  overlay: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#eef2f4' },
  overlayText: { color: '#536870', fontSize: 13 },
  failure: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12, backgroundColor: '#F4EFE4' },
  failureText: { color: '#18382F', fontSize: 14, textAlign: 'center' },
  retry: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 8, backgroundColor: '#D6BA7A' },
  retryText: { color: '#18382F', fontSize: 14, fontWeight: '600' },
  selection: { gap: 4, alignItems: 'flex-start' },
  selectionRtl: { alignItems: 'flex-end' },
  selectionLabel: { color: '#A8C1B8', fontSize: 12 },
  coordinates: { color: '#F4EFE4', fontSize: 15, fontVariant: ['tabular-nums'] },
  useButton: { alignSelf: 'stretch', alignItems: 'center', marginTop: 5, padding: 12, borderRadius: 9, backgroundColor: '#D6BA7A' },
  useText: { color: '#18382F', fontSize: 15, fontWeight: '700' },
});
