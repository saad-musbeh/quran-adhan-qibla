import type { Language } from './languages';
import { message } from '../localization.ts';

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
const cityData = require('../data/cities.json');
const countryData = require('../data/countries.json');
export const cities = cityData as City[];

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
  const city = cities.find(item => item.latitude === location.latitude && item.longitude === location.longitude);
  if (!city) return location.label;
  const country = countries.find(item => item.code === city.countryCode);
  return `${country ? countryLabel(country,language) : city.countryCode} · ${cityLabel(city,language)}`;
}
