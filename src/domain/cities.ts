import type { Language } from './languages';
import { message } from '../localization.ts';

export type City = {
  id: number;
  name: string;
  arabicName?: string;
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
  targetCount: number;
};

// Metro supports static JSON require for bundled data files.
declare const require: (path: string) => unknown;
const cityData = require('../data/cities.json');
const countryData = require('../data/countries.json');
export const cities = cityData as City[];

// Country labels are precomputed so native runtimes need no Intl.DisplayNames polyfill.
export const countries = countryData as Country[];

function normalize(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f\u064B-\u065F\u0670\u06D6-\u06ED]/g, '').toLocaleLowerCase();
}

export function searchCities(query: string, countryCode?: string): City[] {
  const term = normalize(query.trim());
  const country = countryCode?.toUpperCase();
  if (!term && !country) return [];
  const limit = term ? 50 : 100;
  const matches: City[] = [];
  for (const city of cities) {
    if (country && city.countryCode !== country) continue;
    if (!term || normalize(city.name).includes(term) || (city.arabicName && normalize(city.arabicName).includes(term))) {
      matches.push(city);
      if (matches.length === limit) break;
    }
  }
  return matches;
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
