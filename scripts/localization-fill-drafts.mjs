import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Explicit maintenance command: fill only missing catalog entries. Existing translations
// are preserved. Country/language names use Node ICU/CLDR; other UI text uses Google
// Translate draft output. Quran and tafsir content files are never read or translated.
const root = path.resolve(import.meta.dirname, '..');
const directory = path.join(root, 'src/locales');
const english = JSON.parse(fs.readFileSync(path.join(directory, 'en.json'), 'utf8'));
const countries = JSON.parse(fs.readFileSync(path.join(root, 'src/data/countries.json'), 'utf8'));
const languageSource = ts.createSourceFile('languages.ts', fs.readFileSync(path.join(root, 'src/domain/languages.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
const languages = [];
function visit(node) {
  if (ts.isObjectLiteralExpression(node)) {
    const fields = Object.fromEntries(node.properties.filter(ts.isPropertyAssignment).filter(property => ts.isStringLiteralLike(property.initializer)).map(property => [property.name.getText(languageSource), property.initializer.text]));
    if (fields.id && fields.name) languages.push(fields);
  }
  ts.forEachChild(node, visit);
}
visit(languageSource);

const protectedPattern = /\{\w+\}|QuranEnc|Quranpedia(?:\.net)?|Tazkirul Quran|Goodword Books|CPS|QUL|spa5k\/tafsir_api|EveryAyah\.com|GeoNames|Pew Research Center|Religious Composition by Country|SHA-256|HTML|iOS|CC BY 4\.0/g;
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
async function translateBatch(locale, entries) {
  const protectedValues = [];
  const lines = entries.map(([, text]) => text.trim().replace(protectedPattern, token => {
    const index = protectedValues.push(token) - 1;
    return `ZXQPH${index}QXZ`;
  }));
  const query = new URLSearchParams({ client: 'gtx', sl: 'en', tl: locale, dt: 't', q: lines.join('\n') });
  let lastError;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const response = await fetch(`https://translate.googleapis.com/translate_a/single?${query}`, { signal: AbortSignal.timeout(45000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const result = data[0].map(part => part[0] ?? '').join('').split('\n');
      if (result.length !== entries.length) throw new Error(`Expected ${entries.length} lines, received ${result.length}`);
      return entries.map(([id, source], index) => {
        let text = result[index].replace(/ZXQPH\s*(\d+)\s*QXZ/gi, (_, number) => protectedValues[Number(number)]);
        const sourcePlaceholders = [...source.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
        const translatedPlaceholders = [...text.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort().join(',');
        if (!text.trim() || /ZXQPH|QXZ/.test(text) || sourcePlaceholders !== translatedPlaceholders) throw new Error(`Invalid translation placeholders for ${id}`);
        for (const token of source.match(protectedPattern) ?? []) {
          if (!text.includes(token)) throw new Error(`Source name or placeholder was altered for ${id}: ${token}`);
        }
        if (source.trim() !== text.trim() || source.length < 20) {
          text = source.match(/^\s*/)[0] + text.trim() + source.match(/\s*$/)[0];
          return [id, text];
        }
        throw new Error(`Untranslated UI sentence ${id}`);
      });
    } catch (error) { lastError = error; await delay(400 * (attempt + 1)); }
  }
  if (entries.length > 1) {
    const midpoint = Math.ceil(entries.length / 2);
    return [...await translateBatch(locale, entries.slice(0, midpoint)), ...await translateBatch(locale, entries.slice(midpoint))];
  }
  throw new Error(`${locale}: ${lastError.message}`);
}

async function fillLocale(filename) {
  const locale = filename.slice(0, -5);
  const file = path.join(directory, filename);
  const catalog = JSON.parse(fs.readFileSync(file, 'utf8'));
  const regionNames = new Intl.DisplayNames(locale, { type: 'region', fallback: 'none' });
  const languageNames = new Intl.DisplayNames(locale, { type: 'language', fallback: 'none' });
  const knownNames = new Map();
  for (const country of countries) {
    const name = regionNames.of(country.code);
    if (name) knownNames.set(country.name, name);
  }
  for (const language of languages) {
    const name = languageNames.of(language.id);
    if (name) knownNames.set(language.name, name);
  }
  const missing = Object.entries(english).filter(([id]) => !Object.hasOwn(catalog, id));
  const drafts = [];
  let cldrCount = 0;
  for (const [id, text] of missing) {
    if (knownNames.has(text)) { catalog[id] = knownNames.get(text); cldrCount++; }
    else drafts.push([id, text]);
  }
  const batches = [];
  let batch = [], size = 0;
  for (const entry of drafts) {
    if (batch.length >= 25 || size + entry[1].length > 3200) { batches.push(batch); batch = []; size = 0; }
    batch.push(entry); size += entry[1].length;
  }
  if (batch.length) batches.push(batch);
  for (const items of batches) {
    for (const [id, text] of await translateBatch(locale, items)) catalog[id] = text;
    // Save completed batches so interrupted maintenance can safely resume.
    const ordered = Object.fromEntries(Object.keys(english).filter(id => Object.hasOwn(catalog, id)).map(id => [id, catalog[id]]));
    fs.writeFileSync(file, JSON.stringify(ordered, null, 2) + '\n');
  }
  if (!batches.length) fs.writeFileSync(file, JSON.stringify(catalog, null, 2) + '\n');
  console.log(`${locale}: ${missing.length} filled (${cldrCount} CLDR names; ${drafts.length} machine translation drafts)`);
}

const files = fs.readdirSync(directory).filter(filename => filename.endsWith('.json') && filename !== 'en.json');
let next = 0;
const failures = [];
await Promise.all(Array.from({ length: 5 }, async () => {
  while (next < files.length) {
    const file = files[next++];
    try { await fillLocale(file); } catch (error) { failures.push(error.message); console.error(error.message); }
  }
}));
if (failures.length) process.exitCode = 1;
