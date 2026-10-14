import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeMainMenuOnPhones, startupHomeVisible } from './app-startup.ts';

test('fresh installs and older saved preferences open Home at every screen size', () => {
  for (const largeScreen of [false, true]) {
    assert.equal(startupHomeVisible(largeScreen, undefined), true);
    const legacy = JSON.parse('{"language":"ar","reader":{"fontSize":28,"nightMode":true}}');
    assert.equal(startupHomeVisible(largeScreen, legacy.mainMenuOnPhones), true);
  }
});

test('only an explicit saved opt-out bypasses Home on phones', () => {
  const saved = JSON.parse('{"mainMenuOnPhones":false}');
  assert.equal(normalizeMainMenuOnPhones(saved.mainMenuOnPhones), false);
  assert.equal(startupHomeVisible(false, saved.mainMenuOnPhones), false);
  assert.equal(startupHomeVisible(true, saved.mainMenuOnPhones), true);
  assert.equal(startupHomeVisible(false, true), true);
});

test('malformed menu values recover to Home rather than silently opting out', () => {
  for (const value of [null, 0, 1, '', 'false', [], {}]) {
    assert.equal(normalizeMainMenuOnPhones(value), true);
    assert.equal(startupHomeVisible(false, value), true);
  }
});
