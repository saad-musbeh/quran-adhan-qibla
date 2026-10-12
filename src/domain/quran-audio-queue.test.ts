import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

(globalThis as typeof globalThis & { require: NodeRequire }).require = createRequire(import.meta.url);
const { initialQuranQueue, nextQuranQueueChapter, findQuranQueuePosition } = await import('./quran-audio-queue.ts');

test('initial normal queue includes the current surah remainder and one full next surah', () => {
  const queue = initialQuranQueue({ surah: 1, verse: 6 }, null);
  assert.deepEqual(queue.slice(0, 2), [{ surah: 1, verse: 6 }, { surah: 1, verse: 7 }]);
  assert.equal(queue.length, 288);
  assert.deepEqual(queue.at(-1), { surah: 2, verse: 286 });
  assert.equal(findQuranQueuePosition(queue, { surah: 2, verse: 1 }), 2);
});

test('a range queues only its selected verses, while a normal queue can append the following surah', () => {
  assert.deepEqual(initialQuranQueue({ surah: 2, verse: 3 }, { surah: 2, start: 3, end: 5 }), [
    { surah: 2, verse: 3 }, { surah: 2, verse: 4 }, { surah: 2, verse: 5 },
  ]);
  assert.deepEqual(initialQuranQueue({ surah: 2, verse: 4 }, { surah: 2, start: 3, end: 5 }), [
    { surah: 2, verse: 3 }, { surah: 2, verse: 4 }, { surah: 2, verse: 5 },
  ]);
  assert.deepEqual(nextQuranQueueChapter([{ surah: 2, verse: 286 }]).slice(0, 2), [{ surah: 3, verse: 1 }, { surah: 3, verse: 2 }]);
  assert.deepEqual(nextQuranQueueChapter([{ surah: 114, verse: 6 }]), []);
});
