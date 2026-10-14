import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import test from 'node:test';

// The application bundle resolves JSON with Metro's `require`; mirror that in Node.
(globalThis as typeof globalThis & {require: NodeRequire}).require = createRequire(import.meta.url);
const {cities, countries, cityLabel, countryLabel, searchCities, selectedLocationLabel, prayerLocationLabel} = await import('./cities.ts');

test('Hermes-safe literal chunks preserve the complete ordered October 13 source snapshot', () => {
  const chunks = JSON.parse(readFileSync(new URL('../data/cities.json', import.meta.url), 'utf8')) as unknown[][];
  assert.ok(chunks.length > 1 && chunks.length <= 4096);
  assert.ok(chunks.every(chunk => Array.isArray(chunk) && chunk.length > 0 && chunk.length <= 4096), 'each compiled array stays below the dense-array boundary');
  assert.equal(cities.length, 224_763);
  assert.deepEqual(chunks.flat(), cities, 'runtime flattening retains every entry in source order');
  assert.equal(createHash('sha256').update(cities.map(city => city.id).join(',')).digest('hex'),
    '082d82cce6322a3cc4a8c1da2cbd036690c55b09debd0b2ee8184d9e74eccb60');
  assert.equal(createHash('sha256').update(JSON.stringify(cities)).digest('hex'),
    'fe00172d5ed0f3638a1a1e52aa4ec41ceb2fc6edf8ce89e8db8b0534138c3859');
});

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

test('chosen cities retain exact localized labels, independent of their previously saved language', () => {
  for (const [name, countryCode] of [['Riyadh', 'SA'], ['London', 'GB'], ['Dakar', 'SN']]) {
    const city = cities.find(city => city.name === name && city.countryCode === countryCode)!;
    const country = countries.find(country => country.code === countryCode)!;
    const location = { ...city, source: 'city', label: 'Old label' };
    assert.equal(prayerLocationLabel(location, 'en'), `${country.name} · ${name}`);
    assert.equal(prayerLocationLabel(location, 'ar'), `${country.arabicName} · ${cityLabel(city, 'ar')}`);
    assert.equal(prayerLocationLabel(location, 'ar'), selectedLocationLabel(location, 'ar'));
  }
});

test('GPS, map and manual coordinates near a settlement remain explicitly approximate', () => {
  for (const [name, countryCode] of [['Riyadh', 'SA'], ['London', 'GB'], ['Dakar', 'SN']]) {
    const city = cities.find(city => city.name === name && city.countryCode === countryCode)!;
    const country = countries.find(country => country.code === countryCode)!;
    for (const source of ['device', 'map', 'manual']) {
      const location = { latitude: city.latitude, longitude: city.longitude, source };
      assert.equal(prayerLocationLabel(location, 'en'), `Near ${country.name} · ${city.name}`);
      assert.equal(prayerLocationLabel(location, 'ar'), `بالقرب من ${country.arabicName} · ${cityLabel(city, 'ar')}`);
    }
  }
});

test('distant coordinates show source and localized coordinates without fabricating a city', () => {
  const ocean = { latitude: 0, longitude: -140, source: 'manual' };
  assert.equal(prayerLocationLabel(ocean, 'en'), 'Manual coordinates · 0.0000, -140.0000');
  const arabic = prayerLocationLabel(ocean, 'ar');
  assert.ok(arabic.startsWith('إحداثيات يدوية · '));
  assert.ok(arabic.includes('١٤٠') && arabic.includes('٠٫٠٠٠٠'));
  assert.ok(!/[0-9]/.test(arabic));
  assert.equal(prayerLocationLabel({ ...ocean, source: 'device' }, 'en'), 'Device location · 0.0000, -140.0000');
  assert.equal(prayerLocationLabel({ ...ocean, source: 'map' }, 'en'), 'Map point · 0.0000, -140.0000');
  assert.equal(prayerLocationLabel({ ...ocean, label: '  My campsite  ' }, 'ar'), 'My campsite');
  assert.equal(prayerLocationLabel({ ...ocean, source: 'city', label: 'Saved custom town' }, 'en'), 'Saved custom town');
  assert.equal(prayerLocationLabel({ latitude: NaN, longitude: 0, source: 'device' }, 'en'), 'Device location');
});

test('nearby lookup wraps the date line and supports the polar edge without asserting distant cities', () => {
  const egvekinot = cities.find(city => city.id === 4031742)!;
  const country = countries.find(country => country.code === egvekinot.countryCode)!;
  // Egvekinot is west of the date line, but this fix is east of it, ~42 km away.
  assert.equal(prayerLocationLabel({ latitude: egvekinot.latitude, longitude: 179.95, source: 'device' }, 'en'),
    `Near ${country.name} · Egvekinot`);
  const atDateLine = { latitude: egvekinot.latitude, longitude: 180, source: 'device' };
  assert.equal(prayerLocationLabel(atDateLine, 'en'), prayerLocationLabel({ ...atDateLine, longitude: -180 }, 'en'));
  for (const latitude of [-90, -89.9, 89.9, 90]) {
    assert.ok(prayerLocationLabel({ latitude, longitude: 179.95, source: 'device' }, 'en').startsWith('Device location · '));
  }
  const longyearbyen = cities.find(city => city.id === 2729907)!;
  assert.ok(prayerLocationLabel({ latitude: longyearbyen.latitude, longitude: longyearbyen.longitude + 1, source: 'map' }, 'en').includes('Longyearbyen'));
});

test('50-km cutoff prevents a faraway town label, including latitude-cell boundaries', () => {
  const egvekinot = cities.find(city => city.id === 4031742)!;
  const latitudeOffset = (km: number) => km / 6371.0088 * 180 / Math.PI;
  const at = (km: number) => ({ latitude: egvekinot.latitude + latitudeOffset(km), longitude: egvekinot.longitude, source: 'device' });
  assert.ok(prayerLocationLabel(at(49.99), 'en').endsWith('Egvekinot'));
  assert.ok(prayerLocationLabel(at(50.01), 'en').startsWith('Device location · '));
});
