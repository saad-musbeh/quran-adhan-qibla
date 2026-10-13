import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

// The application bundle resolves JSON with Metro's `require`; mirror that in Node.
(globalThis as typeof globalThis & {require: NodeRequire}).require = createRequire(import.meta.url);
const {cities, countries, cityLabel, countryLabel, searchCities} = await import('./cities.ts');

test('worldwide catalogue entries have unique ids and valid coordinates', () => {
  assert.ok(cities.length > 100_000, 'all eligible places replace the former country quotas');
  assert.equal(new Set(cities.map(city => city.id)).size, cities.length);
  for (const city of cities) {
    assert.ok(Number.isFinite(city.latitude) && city.latitude >= -90 && city.latitude <= 90);
    assert.ok(Number.isFinite(city.longitude) && city.longitude >= -180 && city.longitude <= 180);
    assert.ok(city.name.length > 0 && city.countryCode.length === 2);
  }
});

test('country counts agree with all available places and include small territories', () => {
  assert.ok(countries.length > 200);
  const counts = new Map<string, number>();
  for (const city of cities) counts.set(city.countryCode, (counts.get(city.countryCode) ?? 0) + 1);
  for (const country of countries) {
    assert.equal(country.cityCount, counts.get(country.code), country.code);
    assert.ok(country.cityCount > 0);
    assert.equal(searchCities('', country.code).length, country.cityCount);
  }
  assert.ok(countries.some(country => country.code === 'FO'), 'Faroe Islands has no religion quota prerequisite');
  assert.ok(searchCities('Woking', 'GB').some(city => city.name === 'Woking'));
  assert.ok(searchCities('Novi', 'US').some(city => city.name === 'Novi'));
});

test('search matches Arabic, accent-insensitive names and source transliterations', () => {
  assert.ok(searchCities('CAIRO', 'eg').some(city => city.name === 'Cairo'));
  assert.ok(searchCities('sao paulo', 'BR').some(city => city.name === 'São Paulo'));
  const arabic = cities.find(city => city.arabicName);
  assert.ok(arabic, 'source Arabic aliases are present');
  assert.ok(searchCities(arabic.arabicName!).some(city => city.id === arabic.id));
  const transliterated = cities.find(city => city.asciiName && !/^[\x00-\x7F]+$/.test(city.name));
  assert.ok(transliterated);
  assert.ok(searchCities(transliterated.asciiName!, transliterated.countryCode).some(city => city.id === transliterated.id));
  assert.deepEqual(searchCities('   '), []);
  assert.deepEqual(searchCities('London', 'ZZ'), []);
});

test('every result remains accessible beyond fifty with exact and prefix matches first', () => {
  const matches = searchCities('a', 'US');
  assert.ok(matches.length > 1000, 'no hidden 50-result cutoff');
  assert.ok(matches.every(city => city.countryCode === 'US'));
  const york = searchCities('york', 'US');
  const exactIndex = york.findIndex(city => city.name.toLocaleLowerCase() === 'york');
  const prefixIndex = york.findIndex(city => city.name.toLocaleLowerCase().startsWith('york') && city.name.toLocaleLowerCase() !== 'york');
  const partialIndex = york.findIndex(city => city.name.toLocaleLowerCase().includes('york') && !city.name.toLocaleLowerCase().startsWith('york'));
  assert.ok(exactIndex >= 0 && prefixIndex > exactIndex && partialIndex > prefixIndex);
});

test('labels use localized names and fall back cleanly', () => {
  const city = cities.find(item => item.arabicName) ?? cities[0]!;
  assert.equal(cityLabel(city, 'en'), city.name);
  assert.equal(cityLabel(city, 'ar'), city.arabicName ?? city.name);
  const country = countries.find(item => item.code === city.countryCode)!;
  assert.equal(countryLabel(country, 'en'), country.name);
  assert.equal(countryLabel(country, 'ar'), country.arabicName);
});
