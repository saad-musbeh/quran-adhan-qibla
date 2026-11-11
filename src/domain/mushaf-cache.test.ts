import assert from 'node:assert/strict';
import test from 'node:test';
import {MushafPageCache} from './mushaf-cache.ts';

test('three slots reuse prefetched pages and evict the least recently used source', async () => {
  const reads: number[] = [];
  const cache = new MushafPageCache(async key => { reads.push(key); return `page ${key}`; });
  for (const key of [10, 11, 9, 11, 12, 10]) await cache.load(key);
  assert.deepEqual(reads, [10, 11, 9, 12, 10]);
});

test('rapid jumps serialize reads and skip evicted queued requests', async () => {
  const reads: number[] = [];
  let finish!: (svg: string) => void;
  const cache = new MushafPageCache(key => {
    reads.push(key);
    return key === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve(`page ${key}`);
  });
  const first = cache.load(1);
  await Promise.resolve();
  const pending = [2, 3, 4, 5, 6].map(key => cache.load(key));
  const done = Promise.allSettled(pending);
  assert.deepEqual(reads, [1], 'only one decoder runs while the first read is pending');
  finish('page 1');
  await first;
  const results = await done;
  assert.deepEqual(reads, [1, 4, 5, 6]);
  assert.deepEqual(results.map(result => result.status), ['rejected', 'rejected', 'fulfilled', 'fulfilled', 'fulfilled']);
});

test('release during a read cannot repopulate the cache or run queued decodes', async () => {
  let finish!: (svg: string) => void;
  const reads: number[] = [];
  const cache = new MushafPageCache(key => {
    reads.push(key);
    return reads.length === 1 ? new Promise(resolve => { finish = resolve; }) : Promise.resolve('new');
  });
  const first = cache.load(1);
  await Promise.resolve();
  const queued = assert.rejects(cache.load(2), /superseded/);
  cache.clear();
  finish('old');
  await first; await queued;
  assert.equal(await cache.load(1), 'new');
  assert.deepEqual(reads, [1, 1]);
});

test('failed reads can retry and concurrent requests share the same load', async () => {
  let attempts = 0;
  const cache = new MushafPageCache(async () => {
    if (++attempts === 1) throw new Error('unavailable');
    return 'page';
  });
  const first = cache.load(1);
  assert.equal(cache.load(1), first);
  await assert.rejects(first, /unavailable/);
  assert.equal(await cache.load(1), 'page');
  assert.equal(attempts, 2);
});

test('byte budget evicts large sources even below three entries', async () => {
  const reads: number[] = [];
  const cache = new MushafPageCache(async key => { reads.push(key); return '1234'; }, 12);
  for (const key of [1, 2, 1]) await cache.load(key);
  assert.deepEqual(reads, [1, 2, 1]);
  const oversized = new MushafPageCache(async key => { reads.push(key); return '1234567'; }, 12);
  await oversized.load(3); await oversized.load(3);
  assert.deepEqual(reads.slice(-2), [3, 3], 'oversized sources are returned but not retained');
});

test('WebView consumption drops source data without deleting a newer request for the same page', async () => {
  let finish!: (svg: string) => void;
  let reads = 0;
  const cache = new MushafPageCache(() => ++reads === 1
    ? new Promise(resolve => { finish = resolve; }) : Promise.resolve('new'));
  const old = cache.consume(1);
  await Promise.resolve();
  cache.clear();
  const replacement = cache.load(1);
  finish('old');
  assert.equal(await old, 'old');
  assert.equal(await replacement, 'new');
  assert.equal(cache.load(1), replacement, 'old cleanup cannot invalidate the new request');
  assert.equal(await cache.consume(1), 'new');
  await cache.load(1);
  assert.equal(reads, 3, 'consumed sources are not retained alongside WebView DOM');
});
