import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decodeMushafPage } from './mushaf-compression.ts';
import { test } from 'node:test';

const source = JSON.parse(readFileSync(new URL('../../assets/mushaf/pages-src/khatm-dua.json', import.meta.url), 'utf8')) as {
  title: string; pages: { page: number; paragraphs: string[] }[];
};

test('both photo transcriptions survive wrapping and offline compression without losing any words', () => {
  assert.deepEqual(source.pages.map(page => page.page), [605, 606]);
  for (const page of source.pages) {
    const svg = decodeMushafPage(readFileSync(new URL(`../../assets/mushaf/pages/${page.page}.svg.zst`, import.meta.url)));
    assert.equal(svg, readFileSync(new URL(`../../assets/mushaf/pages-src/${page.page}.svg`, import.meta.url), 'utf8'));
    assert.ok(svg.includes(`id="page-${page.page}-content"`));
    const words = [...svg.matchAll(/data-text="([^"]*)"/g)].map(match => match[1]).join(' ');
    assert.equal(words, `${source.title} ${page.paragraphs.join(' ')}`);
    assert.ok(!/ayahPolygon|<script|https?:\/\//.test(svg.replace('http://www.w3.org/2000/svg', '')), 'appendix is inert artwork with no verse targets or network dependencies');
  }
});

test('dua lettering is outlined and neighboring rows have separate ink bounds', () => {
  for (const page of source.pages) {
    const svg = decodeMushafPage(readFileSync(new URL(`../../assets/mushaf/pages/${page.page}.svg.zst`, import.meta.url)));
    assert.ok(!/<text\b|font-family=/.test(svg), 'lettering must not move when a runtime font loads');
    const rows = [...svg.matchAll(/<g data-kind="body"[^>]*transform="translate\(([^)]+)\)"[^>]*><path d="([^"]+)"\/><\/g>/g)];
    assert.ok(rows.length >= 10);
    let previousBottom = 0;
    for (const row of rows) {
      const [dx, dy] = row[1].split(' ').map(Number);
      // M/L/C coordinate pairs bound the entire curve by its control-point hull.
      // This checks the generated paths themselves, not an em-size estimate.
      const coordinates = row[2].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
      const xs = coordinates.filter((_, index) => index % 2 === 0).map(value => value + dx);
      const ys = coordinates.filter((_, index) => index % 2 === 1).map(value => value + dy);
      const top = Math.min(...ys), bottom = Math.max(...ys);
      assert.ok(Math.min(...xs) >= 24 && Math.max(...xs) <= 321, 'ink stays clear of the side borders');
      assert.ok(top >= 74 && bottom <= 522, 'ink stays clear of the title and bottom border');
      assert.ok(top >= previousBottom + 1, `page ${page.page}: neighboring Arabic rows overlap`);
      previousBottom = bottom;
    }
  }
});

test('the complete closing dua includes both photographed parts and their continuation boundary', () => {
  const [first, second] = source.pages.map(page => page.paragraphs.join(' '));
  assert.ok(first.startsWith('اللهم ارحمني بالقرآن'));
  assert.ok(first.includes('واجعل الموت راحة لي من كل شر'));
  assert.ok(first.endsWith('وتقبل صلاتي واغفر خطيئاتي'));
  assert.ok(second.startsWith('وأسألك العلا من الجنة'));
  assert.ok(second.includes('ولا تجعل الدنيا أكبر همنا ولا مبلغ علمنا'));
  assert.ok(second.includes('ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار'));
  assert.ok(second.endsWith('وصلى الله على نبينا محمد وعلى آله وأصحابه الأخيار وسلم تسليما كثيرا'));
});
