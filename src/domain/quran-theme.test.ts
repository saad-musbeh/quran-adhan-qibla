import assert from 'node:assert/strict';
import test from 'node:test';
import { QURAN_THEMES, getQuranTheme, readQuranThemePreference } from './quran-theme.ts';

function luminance(hex: string) {
  const rgb = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
}
function contrast(a: string, b: string) {
  const values = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

test('all five app colors provide readable light and dark controls without changing Quran paper', () => {
  for (const base of QURAN_THEMES) {
    const light = getQuranTheme(base.id, 'light');
    const dark = getQuranTheme(base.id, 'dark');
    assert.notEqual(light.appBackground, dark.appBackground);
    for (const theme of [light, dark]) {
      for (const background of [theme.appBackground, theme.appSurface, theme.appRaised]) {
        assert.ok(contrast(theme.appText, background) >= 4.5, `${base.id} ${theme.mode} text on ${background}`);
        assert.ok(contrast(theme.accent, background) >= 3, `${base.id} ${theme.mode} controls on ${background}`);
      }
      assert.ok(contrast(theme.appAccentInk, theme.accent) >= 4.5);
      assert.equal(theme.lightPaper, base.lightPaper);
      assert.equal(theme.ink, base.ink);
      assert.equal(theme.deep, base.deep);
    }
  }
});

test('saved appearance restores independently of color and preserves old color choices', () => {
  assert.deepEqual(readQuranThemePreference(null, 'maroon'), { themeId: 'maroon', mode: 'dark' });
  assert.deepEqual(readQuranThemePreference('{"themeId":"green","mode":"light"}', 'maroon'), { themeId: 'green', mode: 'light' });
  assert.deepEqual(readQuranThemePreference('{"themeId":"invalid","mode":"light"}', 'brown'), { themeId: 'brown', mode: 'light' });
  for (const raw of [null, 'null', '{}', '{broken', '42']) {
    assert.deepEqual(readQuranThemePreference(raw), { themeId: 'blue', mode: 'dark' });
  }
  assert.deepEqual(readQuranThemePreference('{"themeId":"black","mode":"invalid"}'), { themeId: 'black', mode: 'dark' });
});
