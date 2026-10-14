import { localeFor, type Language } from './languages.ts';
import { bilingual, message } from '../localization.ts';

export type City = {
  id: number;
  name: string;
  arabicName?: string;
  asciiName?: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timeZone?: string;
};

export type Country = {
  code: string;
  name: string;
  arabicName: string;
  cityCount: number;
};

// Metro supports static JSON require for bundled data files.
declare const require: (path: string) => unknown;
const cityChunks = require('../data/cities.json') as City[][];
const countryData = require('../data/countries.json');
// Keep every compiled array literal below Hermes' 65,535 dense-array boundary.
// Runtime push builds a normal dense array; avoid spread's function-argument limit.
export const cities: City[] = [];
for (const chunk of cityChunks) {
  for (const city of chunk) cities.push(city);
}

// Country labels are precomputed so native runtimes need no Intl.DisplayNames polyfill.
export const countries = countryData as Country[];

function normalize(value: string): string {
  return value.normalize('NFD')
    .replace(/[\u0300-\u036f\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').toLocaleLowerCase();
}

// Country browsing does not scan/normalize the full worldwide catalogue on each render.
const citiesByCountry = new Map<string, City[]>();
for (const city of cities) {
  const list = citiesByCountry.get(city.countryCode);
  if (list) list.push(city);
  else citiesByCountry.set(city.countryCode, [city]);
}
const searchNames = new Map<number, string>();
function namesFor(city: City): string {
  let names = searchNames.get(city.id);
  if (!names) {
    const aliases = [...new Set([city.name, city.asciiName, city.arabicName]
      .filter((name): name is string => Boolean(name)).map(normalize))];
    names = `\0${aliases.join('\0')}\0`;
    searchNames.set(city.id, names);
  }
  return names;
}

/** All matching records, ranked exact then prefix then substring. UI pages the results. */
export function searchCities(query: string, countryCode?: string): City[] {
  const term = normalize(query.trim());
  const source = countryCode ? citiesByCountry.get(countryCode.toUpperCase()) ?? [] : cities;
  if (!term) return countryCode ? source : [];
  const prefixTerm = `\0${term}`;
  const exactTerm = `${prefixTerm}\0`;
  const exact: City[] = [];
  const prefix: City[] = [];
  const partial: City[] = [];
  for (const city of source) {
    const names = namesFor(city);
    if (names.includes(exactTerm)) exact.push(city);
    else if (names.includes(prefixTerm)) prefix.push(city);
    else if (names.includes(term)) partial.push(city);
  }
  return [...exact, ...prefix, ...partial];
}

export function cityLabel(city: City, language: Language): string {
  return language === 'ar' ? city.arabicName ?? city.name : city.name;
}

export function countryLabel(country: Country, language: Language): string {
  return language === 'ar' ? country.arabicName : message(language, country.name);
}

/** Rebuild bundled city labels when the UI language changes, including saved selections. */
export function selectedLocationLabel(location: {source:string;latitude:number;longitude:number;label?:string}, language: Language): string | undefined {
  if (location.source !== 'city') return location.label;
  const city = cityAtCoordinates(location.latitude, location.longitude);
  if (!city) return location.label;
  return placeLabel(city, language);
}

type PrayerLocation = { source: string; latitude: number; longitude: number; label?: string };
const NEARBY_CITY_KM = 50;
const EARTH_RADIUS_KM = 6371.0088;
const radians = Math.PI / 180;
const coordinateKey = (latitude: number, longitude: number) => `${latitude},${longitude}`;
const countryByCode = new Map(countries.map(country => [country.code, country]));
let cityByCoordinates: Map<string, City> | undefined;
function cityAtCoordinates(latitude: number, longitude: number): City | undefined {
  if (!cityByCoordinates) {
    cityByCoordinates = new Map();
    for (const city of cities) {
      const key = coordinateKey(city.latitude, city.longitude);
      if (!cityByCoordinates.has(key)) cityByCoordinates.set(key, city);
    }
  }
  return cityByCoordinates.get(coordinateKey(latitude, longitude));
}

// Built on first approximate lookup. One-degree cells avoid scanning 224k places
// for each GPS fix; the bounded cache also survives language/audio re-renders.
let spatialCities: Map<number, City[]> | undefined;
const nearbyCache = new Map<string, City | null>();
const latitudeCell = (latitude: number) => Math.min(179, Math.floor(latitude + 90));
const longitudeCell = (longitude: number) => ((Math.floor(longitude + 180) % 360) + 360) % 360;
function nearestCity(latitude: number, longitude: number): City | null {
  const key = coordinateKey(latitude, longitude);
  if (nearbyCache.has(key)) return nearbyCache.get(key)!;
  if (!spatialCities) {
    spatialCities = new Map();
    for (const city of cities) {
      const cell = latitudeCell(city.latitude) * 360 + longitudeCell(city.longitude);
      const entries = spatialCities.get(cell);
      if (entries) entries.push(city);
      else spatialCities.set(cell, [city]);
    }
  }
  const angularRadius = NEARBY_CITY_KM / EARTH_RADIUS_KM;
  const latitudeRadius = angularRadius / radians;
  const minLatitude = latitudeCell(Math.max(-90, latitude - latitudeRadius));
  const maxLatitude = latitudeCell(Math.min(90, latitude + latitudeRadius));
  // A spherical cap that touches a pole includes every longitude. Else its
  // longitude extent is asin(sin(radius)/cos(latitude)), including date-line wrap.
  const longitudeRadius = Math.abs(latitude) + latitudeRadius >= 90 ? 180
    : Math.asin(Math.min(1, Math.sin(angularRadius) / Math.cos(latitude * radians))) / radians;
  const cells = new Set<number>();
  for (let lon = Math.floor(longitude - longitudeRadius + 180); lon <= Math.floor(longitude + longitudeRadius + 180); lon++) {
    cells.add(((lon % 360) + 360) % 360);
  }
  let nearest: City | null = null;
  let distance = NEARBY_CITY_KM;
  for (let lat = minLatitude; lat <= maxLatitude; lat++) {
    for (const lon of cells) {
      for (const city of spatialCities.get(lat * 360 + lon) ?? []) {
        const a = Math.sin((city.latitude - latitude) * radians / 2) ** 2
          + Math.cos(latitude * radians) * Math.cos(city.latitude * radians)
          * Math.sin((city.longitude - longitude) * radians / 2) ** 2;
        const km = 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, a))));
        if (km <= distance) { nearest = city; distance = km; }
      }
    }
  }
  if (nearbyCache.size >= 64) nearbyCache.delete(nearbyCache.keys().next().value!);
  nearbyCache.set(key, nearest);
  return nearest;
}

function placeLabel(city: City, language: Language): string {
  const country = countryByCode.get(city.countryCode);
  return `${country ? countryLabel(country, language) : city.countryCode} · ${cityLabel(city, language)}`;
}

/** Offline display metadata only. A nearby settlement never asserts city boundaries. */
export function prayerLocationLabel(location: PrayerLocation, language: Language): string {
  const { latitude, longitude } = location;
  if (location.source === 'city') {
    const city = cityAtCoordinates(latitude, longitude);
    if (city) return placeLabel(city, language);
  }
  // Preserve explicit user/source labels; regular GPS and map fixes have none.
  if (location.label?.trim()) return location.label.trim();
  const valid = Number.isFinite(latitude) && Math.abs(latitude) <= 90
    && Number.isFinite(longitude) && Math.abs(longitude) <= 180;
  if (valid && location.source !== 'city') {
    const city = nearestCity(latitude, longitude);
    if (city) return bilingual(language, 'بالقرب من {place}', 'Near {place}', { place: placeLabel(city, language) });
  }
  const source = location.source === 'device' ? bilingual(language, 'موقع الجهاز', 'Device location')
    : location.source === 'manual' ? bilingual(language, 'إحداثيات يدوية', 'Manual coordinates')
    : location.source === 'map' ? bilingual(language, 'نقطة على الخريطة', 'Map point')
    : bilingual(language, 'الموقع', 'Location');
  if (!valid) return source;
  const number = new Intl.NumberFormat(localeFor(language), { useGrouping: false, minimumFractionDigits: 4, maximumFractionDigits: 4 });
  return `${source} · ${number.format(latitude)}, ${number.format(longitude)}`;
}
