import type { SelectedCoordinates } from './map-message';

export type MapRuntimeOptions = {
  accent: string;
  center?: SelectedCoordinates | null;
};

/** Build the in-WebView interaction and tile-loading script run after Leaflet exists. */
export function buildMapRuntimeScript({ accent, center = null }: MapRuntimeOptions): string {
  const fill = JSON.stringify(accent);
  const initial = center ? `choose(L.latLng(${center.latitude},${center.longitude}));` : '';
  return `let tileErrors=0,tileFailed=false,tileReady=false;
const tileTimeout=setTimeout(()=>{if(tileReady||tileFailed)return;tileFailed=true;window.setMapEnabled(false);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-error'}));},15000);
tileLayer.on('tileload',()=>{if(tileFailed)return;tileErrors=0;if(tileReady)return;tileReady=true;clearTimeout(tileTimeout);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-ready'}));});
tileLayer.on('tileerror',()=>{if(tileFailed)return;tileErrors+=1;if(tileErrors>=3){tileFailed=true;clearTimeout(tileTimeout);window.setMapEnabled(false);window.ReactNativeWebView.postMessage(JSON.stringify({type:'map-error'}));}});
let marker=null,enabled=true;
function applyMapInteraction(){const active=enabled&&!tileFailed;if(active){map.dragging.enable();map.touchZoom.enable();map.doubleClickZoom.enable();map.scrollWheelZoom.enable();map.keyboard.enable();map.zoomControl.addTo(map);}else{map.dragging.disable();map.touchZoom.disable();map.doubleClickZoom.disable();map.scrollWheelZoom.disable();map.keyboard.disable();map.zoomControl.remove();}}
window.setMapEnabled=value=>{enabled=!!value;applyMapInteraction();};
function choose(latlng){if(!enabled||tileFailed)return;const point=map.wrapLatLng(latlng);const latitude=point.lat,longitude=point.lng;if(marker)marker.setLatLng(point);else marker=L.circleMarker(point,{radius:8,color:'#fff',weight:3,fillColor:${fill},fillOpacity:1}).addTo(map);window.ReactNativeWebView.postMessage(JSON.stringify({type:'select',latitude,longitude}));}
${initial}`;
}
