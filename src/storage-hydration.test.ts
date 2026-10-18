import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createElement } from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import ts from 'typescript';
import type { usePreferences } from './use-preferences';
import type { useQuranBooks } from './use-quran-books';

const require = createRequire(new URL('./domain/quran.ts', import.meta.url));
(globalThis as typeof globalThis & { require: NodeRequire; IS_REACT_ACT_ENVIRONMENT: boolean }).require = require;
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const domains = Object.fromEntries(await Promise.all(['quran-books', 'languages', 'prayers', 'adhan-voices', 'app-startup', 'devotional-reminders']
  .map(async name => [`./domain/${name}`, await import(`./domain/${name}.ts`)])));
const preferencesKey = 'app-preferences-v1';
const booksKey = 'quran.reader.books.v1';
const savedBooks = [
  { id: 'book-1', name: 'First', page: 300, bookmarks: [100, 200], verseBookmarks: ['2:2'] },
  { id: 'book-2', name: 'Second', page: 50, bookmarks: [40], verseBookmarks: [] },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

function storage(entries: Record<string, string> = {}) {
  const values = new Map(Object.entries(entries));
  const writes: Array<[string, string]> = [];
  return {
    values, writes,
    async getItem(key: string) { return values.get(key) ?? null; },
    async multiGet(keys: string[]) { return keys.map(key => [key, values.get(key) ?? null]); },
    async setItem(key: string, value: string) { writes.push([key, value]); values.set(key, value); },
  };
}

function hook<T>(name: string, io: ReturnType<typeof storage>): () => T {
  const compiled = ts.transpileModule(readFileSync(new URL(`./${name}.ts`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const mocks: Record<string, unknown> = {
    ...domains,
    react: require('react'),
    '@react-native-async-storage/async-storage': io,
    './text-size': { DEFAULT_TEXT_SIZE: 22, MIN_TEXT_SIZE: 16, MAX_TEXT_SIZE: 32 },
  };
  const output = { exports: {} as Record<string, () => T> };
  new Function('require', 'module', 'exports', compiled)((id: string) => {
    if (!(id in mocks)) throw Error(`Unexpected hook dependency: ${id}`);
    return mocks[id];
  }, output, output.exports);
  return Object.values(output.exports)[0];
}

async function mount<T>(useHook: () => T) {
  let value!: T;
  let root!: ReactTestRenderer;
  function Probe() { value = useHook(); return null; }
  await act(async () => { root = create(createElement(Probe)); });
  return {
    get value() { return value; },
    async change(action: () => unknown) { await act(async () => { await action(); }); },
    async close() { await act(async () => { root.unmount(); }); },
  };
}

test('a preferences read failure never writes defaults, and retry restores saved settings', async () => {
  const original = JSON.stringify({ language: 'ar', prayer: { method: 5, hanafi: true }, reader: { fontSize: 30, nightMode: true } });
  const io = storage({ [preferencesKey]: original });
  const read = io.getItem;
  io.getItem = async () => { throw Error('Temporary storage failure'); };
  const h = await mount(hook<ReturnType<typeof usePreferences>>('use-preferences', io));
  try {
    assert.equal(h.value.ready, false);
    assert.equal(h.value.loadFailed, true);
    assert.equal(io.writes.length, 0);
    assert.equal(io.values.get(preferencesKey), original);
    await h.change(() => h.value.setPreferences(value => ({ ...value, language: 'en' })));
    assert.equal(io.writes.length, 0);
    io.getItem = read;
    await h.change(() => h.value.retry());
    assert.equal(h.value.ready, true);
    assert.equal(h.value.loadFailed, false);
    assert.equal(h.value.preferences.language, 'ar');
    assert.equal(h.value.preferences.prayer.method, 5);
    assert.equal(h.value.preferences.reader.fontSize, 30);
    await h.change(() => h.value.setPreferences(value => ({ ...value, language: 'en' })));
    assert.equal(JSON.parse(io.values.get(preferencesKey)!).language, 'en');
  } finally { await h.close(); }
});

test('preferences cannot be edited until saved values have loaded', async () => {
  const io = storage();
  const loading = deferred<string>();
  io.getItem = () => loading.promise;
  const h = await mount(hook<ReturnType<typeof usePreferences>>('use-preferences', io));
  try {
    await h.change(() => {
      h.value.setPreferences(value => ({ ...value, language: 'en' }));
      h.value.setPreferences(value => ({ ...value, reader: { ...value.reader, fontSize: 24 } }));
    });
    assert.equal(h.value.preferences.language, 'ar');
    assert.equal(h.value.preferences.reader.fontSize, 22);
    assert.equal(io.writes.length, 0);
    await h.change(() => loading.resolve(JSON.stringify({ language: 'en', reader: { fontSize: 30, nightMode: true }, prayer: { method: 4, hanafi: true } })));
    assert.equal(h.value.preferences.language, 'en');
    assert.deepEqual(h.value.preferences.reader, { fontSize: 30, nightMode: true });
    assert.equal(h.value.preferences.prayer.method, 4);
    assert.equal(h.value.preferences.prayer.hanafi, true);
  } finally { await h.close(); }
});

test('preference writes stay ordered when an earlier write is slow', async () => {
  const io = storage();
  const h = await mount(hook<ReturnType<typeof usePreferences>>('use-preferences', io));
  try {
    const gate = deferred<void>();
    const write = io.setItem;
    let started = 0;
    io.setItem = async (key, value) => {
      if (++started === 1) await gate.promise;
      await write(key, value);
    };
    await h.change(() => h.value.setPreferences(value => ({ ...value, language: 'en' })));
    await h.change(() => h.value.setPreferences(value => ({ ...value, language: 'ar' })));
    assert.equal(started, 1);
    await h.change(() => gate.resolve());
    assert.equal(started, 2);
    assert.equal(JSON.parse(io.values.get(preferencesKey)!).language, 'ar');
  } finally { await h.close(); }
});

test('a library read failure preserves every book and bookmark until a successful retry', async () => {
  const original = JSON.stringify(savedBooks);
  const io = storage({ [booksKey]: original });
  const read = io.getItem;
  io.getItem = async () => { throw Error('Temporary storage failure'); };
  const h = await mount(hook<ReturnType<typeof useQuranBooks>>('use-quran-books', io));
  try {
    assert.equal(h.value.ready, false);
    assert.equal(h.value.loadFailed, true);
    assert.equal(io.writes.length, 0);
    assert.equal(io.values.get(booksKey), original);
    io.getItem = read;
    await h.change(() => h.value.retry());
    assert.equal(h.value.ready, true);
    assert.equal(h.value.loadFailed, false);
    assert.deepEqual(h.value.books, savedBooks);
    assert.deepEqual(JSON.parse(io.values.get(booksKey)!), savedBooks);
  } finally { await h.close(); }
});

test('failed legacy reads cannot overwrite the old reader, and retry migrates it intact', async () => {
  const io = storage({ 'quran.reader.lastPage': '300', 'quran.reader.bookmarks': '[100,200]', 'quran.reader.verseBookmarks': '["2:2"]' });
  const multiGet = io.multiGet;
  io.multiGet = async () => { throw Error('Temporary legacy read failure'); };
  const h = await mount(hook<ReturnType<typeof useQuranBooks>>('use-quran-books', io));
  try {
    assert.equal(h.value.ready, false);
    assert.equal(io.values.has(booksKey), false);
    assert.equal(io.writes.length, 0);
    io.multiGet = multiGet;
    await h.change(() => h.value.retry());
    assert.equal(h.value.books[0].page, 300);
    assert.deepEqual(h.value.books[0].bookmarks, [100, 200]);
    assert.deepEqual(h.value.books[0].verseBookmarks, ['2:2']);
    assert.equal(io.values.get('quran.reader.lastPage'), '300');
    assert.equal(JSON.parse(io.values.get(booksKey)!)[0].page, 300);
  } finally { await h.close(); }
});

test('a delayed library read after unmount cannot save the default shelf', async () => {
  const io = storage();
  const loading = deferred<string>();
  io.getItem = () => loading.promise;
  const h = await mount(hook<ReturnType<typeof useQuranBooks>>('use-quran-books', io));
  await h.close();
  await act(async () => loading.resolve(JSON.stringify(savedBooks)));
  assert.equal(io.writes.length, 0);
});
