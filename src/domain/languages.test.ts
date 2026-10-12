import assert from 'node:assert/strict';
import test from 'node:test';
import { LANGUAGES, isLanguage, isRTL, localeFor, searchLanguages } from './languages.ts';
import { neighborForSwipe } from './navigation.ts';
import { parseLocalizedInteger } from './localized-number.ts';
import { catalogs, message } from '../localization.ts';
import { notificationCopy } from '../notification-i18n.ts';

test('language selection finds native names, accents and English names', () => {
  assert.equal(searchLanguages(' francais ')[0]?.id, 'fr');
  assert.equal(searchLanguages('اردو')[0]?.id, 'ur');
  assert.equal(searchLanguages('Sorani')[0]?.id, 'ckb');
  assert.equal(searchLanguages('not-a-language').length, 0);
  assert.equal(isLanguage('arbitrary'), false);
});
test('every language uses a Gregorian calendar and the correct swipe direction', () => {
  assert.equal(LANGUAGES.length, 35);
  assert.equal(new Set(LANGUAGES.map(item => item.id)).size, 35);
  for (const item of LANGUAGES) {
    assert.equal(new Intl.DateTimeFormat(localeFor(item.id)).resolvedOptions().calendar, 'gregory');
    assert.equal(neighborForSwipe('quran', isRTL(item.id) ? 80 : -80, 0, item.id), 'adhan');
  }
});
test('catalogs preserve all messages and substitution variables', () => {
  const placeholders = (text: string) => [...text.matchAll(/\{\w+\}/g)].map(match => match[0]).sort();
  for (const [language, catalog] of Object.entries(catalogs)) {
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(catalogs.en).sort(), language);
    for (const [id, english] of Object.entries(catalogs.en)) {
      assert.ok(catalog[id]?.trim(), `${language}:${id}`);
      assert.deepEqual(placeholders(catalog[id]), placeholders(english), `${language}:${id}`);
      assert.doesNotMatch(catalog[id], /ZXQ\w*ZXQ/, `${language}:${id}`);
    }
  }
  for (const item of LANGUAGES) assert.ok(Object.values(notificationCopy(item.id)).every(value => value.trim()));
  assert.notEqual(message('fr', 'Choose language'), 'Choose language');
});
test('page and verse inputs accept native keyboard digits without accepting invalid ranges', () => {
  for (const value of ['123', '١٢٣', '۱۲۳', '१२३', '১২৩', '੧੨੩', '௧௨௩', '൧൨൩', '１２３']) assert.equal(parseLocalizedInteger(value), 123);
  for (const value of ['', '-1', '1.5', '1e3', '12xyz', '9007199254740992']) assert.equal(parseLocalizedInteger(value), null);
});
