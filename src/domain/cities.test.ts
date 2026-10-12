import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import test from 'node:test';

// The application bundle resolves JSON with Metro's `require`; mirror that in Node.
(globalThis as typeof globalThis & {require: NodeRequire}).require = createRequire(import.meta.url);
const {cities, countries, cityLabel, countryLabel, searchCities} = await import('./cities.ts');

test('catalogue entries have unique ids and valid coordinates', () => {
  assert.ok(cities.length > 0);
  assert.equal(new Set(cities.map(city => city.id)).size, cities.length);
  for (const city of cities) {
    assert.ok(Number.isFinite(city.latitude) && city.latitude >= -90 && city.latitude <= 90);
    assert.ok(Number.isFinite(city.longitude) && city.longitude >= -180 && city.longitude <= 180);
    assert.ok(city.name.length > 0 && city.countryCode.length === 2);
  }
});

test('country counts agree with catalogue and targets reflect majority quota', () => {
  assert.ok(countries.length > 150);
  for (const country of countries) {
    const actual = cities.filter(city => city.countryCode === country.code).length;
    assert.equal(country.cityCount, actual, country.code);
    assert.ok(actual > 0 && actual <= country.targetCount, country.code);
    assert.ok(country.targetCount === 70 || country.targetCount === 30);
  }
});

test('search matches English and Arabic names, filters country, and caps results', () => {
  const english = cities.find(city => city.name.toLocaleLowerCase().includes('cairo'));
  assert.ok(english, 'Cairo is in the catalogue');
  assert.ok(searchCities('CAIRO').some(city => city.id === english.id));
  assert.ok(searchCities('cairo', 'EG').every(city => city.countryCode === 'EG'));
  assert.ok(searchCities('a', 'EG').length <= 50);
  assert.equal(searchCities('', 'EG').length, countries.find(country => country.code === 'EG')?.cityCount);
  const arabic = cities.find(city => city.arabicName);
  assert.ok(arabic, 'at least some Arabic aliases are present');
  assert.ok(searchCities(arabic.arabicName!).some(city => city.id === arabic.id));
  assert.ok(searchCities('a').length <= 50);
  assert.deepEqual(searchCities('   '), []);
});

test('labels use localized names and fall back cleanly', () => {
  const city = cities.find(item => item.arabicName) ?? cities[0]!;
  assert.equal(cityLabel(city, 'en'), city.name);
  assert.equal(cityLabel(city, 'ar'), city.arabicName ?? city.name);
  const country = countries.find(item => item.code === city.countryCode)!;
  assert.equal(countryLabel(country, 'en'), country.name);
  assert.equal(countryLabel(country, 'ar'), country.arabicName);
});
