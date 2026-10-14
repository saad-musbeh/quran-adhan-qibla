import assert from 'node:assert/strict';
import test from 'node:test';
import { qiblaSceneColors } from './qibla-scene.ts';
import { getQuranTheme, QURAN_THEMES } from './quran-theme.ts';

function contrast(a: string, b: string) {
  const luminance = (color: string) => [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16) / 255)
    .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
    .reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0);
  const [high, low] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (high + 0.05) / (low + 0.05);
}

test('Qibla guidance remains visible over both dial surfaces in every appearance', () => {
  for (const base of QURAN_THEMES) {
    for (const mode of ['light', 'dark'] as const) {
      const palette = qiblaSceneColors(getQuranTheme(base.id, mode));
      for (const background of [palette.face, palette.inner]) {
        assert.ok(contrast(palette.direction, background) >= 3, `${base.id} ${mode} direction on ${background}`);
        assert.ok(contrast(palette.marker, background) >= 3, `${base.id} ${mode} position on ${background}`);
      }
    }
  }
});
