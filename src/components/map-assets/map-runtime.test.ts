import assert from 'node:assert/strict';
import test from 'node:test';
import vm from 'node:vm';
import { buildMapRuntimeScript } from './map-runtime.ts';
import { parseMapMessage, type SelectedCoordinates } from './map-message.ts';

type MapMessage = { type?: string; latitude?: number; longitude?: number };
type MarkerPoint = { lat: number; lng: number };
type TileEvent = () => void;

type Harness = {
  events: Record<string, TileEvent>;
  messages: MapMessage[];
  interactionStates: string[];
  markerPoints: MarkerPoint[];
  fireTimeout: () => void;
  sandbox: vm.Context;
};

function wrapLongitude(longitude: number): number {
  let wrapped = longitude;
  while (wrapped > 180) wrapped -= 360;
  while (wrapped < -180) wrapped += 360;
  return wrapped;
}

function createHarness(): Harness {
  const events: Record<string, TileEvent> = {};
  const messages: MapMessage[] = [];
  const interactionStates: string[] = [];
  const markerPoints: MarkerPoint[] = [];
  const timeouts: Array<() => void> = [];
  const control = { enable: () => interactionStates.push('enabled'), disable: () => interactionStates.push('disabled') };
  const sandbox = {
    setTimeout: (callback: () => void) => { timeouts.push(callback); return timeouts.length; },
    clearTimeout: () => {},
    tileLayer: { on: (name: string, callback: TileEvent) => { events[name] = callback; } },
    map: {
      dragging: control,
      touchZoom: control,
      doubleClickZoom: control,
      scrollWheelZoom: control,
      keyboard: control,
      zoomControl: { addTo: () => {}, remove: () => {} },
      wrapLatLng: (latlng: { lat: number; lng: number; alt?: number }) => ({ lat: latlng.lat, lng: wrapLongitude(latlng.lng), alt: latlng.alt }),
    },
    L: {
      latLng: (lat: number, lng: number) => ({ lat, lng }),
      circleMarker: (point: MarkerPoint) => {
        markerPoints.push(point);
        const marker = { addTo: () => marker, setLatLng: (point: MarkerPoint) => { markerPoints.push(point); } };
        return marker;
      },
    },
    window: { ReactNativeWebView: { postMessage: (raw: string) => { messages.push(JSON.parse(raw) as MapMessage); } } },
  };
  vm.createContext(sandbox);
  return { events, messages, interactionStates, markerPoints, fireTimeout: () => timeouts.at(-1)?.(), sandbox };
}

function types(messages: MapMessage[]): Array<string | undefined> {
  return messages.map(message => message.type);
}

test('tile loading reports ready once and can still fail when a later viewed area is offline', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  harness.events.tileload();
  assert.deepEqual(types(harness.messages), ['map-ready']);
  harness.events.tileload();
  harness.events.tileerror();
  assert.deepEqual(types(harness.messages), ['map-ready']);
  harness.events.tileload(); // A successful tile breaks the consecutive-error streak.
  harness.events.tileerror();
  harness.events.tileerror();
  assert.deepEqual(types(harness.messages), ['map-ready']);
  harness.events.tileerror();
  assert.deepEqual(types(harness.messages), ['map-ready', 'map-error']);
  harness.events.tileload();
  assert.deepEqual(types(harness.messages), ['map-ready', 'map-error']);
});

test('transient tile errors still recover when a tile loads', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  harness.events.tileerror();
  harness.events.tileerror();
  harness.events.tileload();
  assert.deepEqual(types(harness.messages), ['map-ready']);
});

test('three tile errors are terminal and a later tile load cannot clear the failure', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  harness.events.tileerror();
  harness.events.tileerror();
  harness.events.tileerror();
  assert.deepEqual(types(harness.messages), ['map-error']);
  assert.equal(harness.interactionStates.at(-1), 'disabled');
  harness.events.tileload();
  assert.deepEqual(types(harness.messages), ['map-error']);
});

test('tile timeout is terminal and re-enabling cannot restore a failed map', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  harness.fireTimeout();
  assert.deepEqual(types(harness.messages), ['map-error']);
  harness.events.tileload();
  assert.deepEqual(types(harness.messages), ['map-error']);
  vm.runInContext('window.setMapEnabled(true);', harness.sandbox);
  assert.equal(harness.interactionStates.at(-1), 'disabled');
});

test('disabled maps ignore selection until re-enabled', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  vm.runInContext('window.setMapEnabled(false);choose({lat:10,lng:20});', harness.sandbox);
  assert.deepEqual(types(harness.messages), []);
  vm.runInContext('window.setMapEnabled(true);choose({lat:10,lng:20});', harness.sandbox);
  assert.deepEqual(types(harness.messages), ['select']);
});

test('antimeridian selections keep the marker in the visible world and emit canonical coordinates', () => {
  const harness = createHarness();
  vm.runInContext(buildMapRuntimeScript({ accent: '#DBAB68' }), harness.sandbox);
  vm.runInContext('window.setMapEnabled(true);choose({lat:10,lng:181});choose({lat:10,lng:182});', harness.sandbox);
  const picks = harness.messages.filter(message => message.type === 'select');
  assert.deepEqual(picks.map(pick => pick.longitude), [-179, -178]);
  assert.deepEqual(harness.markerPoints.map(point => point.lng), [181, 182]);
  let selected: SelectedCoordinates | null = null;
  for (const pick of picks) selected = parseMapMessage(JSON.stringify(pick)) ?? selected;
  assert.deepEqual(selected, { latitude: 10, longitude: -178 });
});
