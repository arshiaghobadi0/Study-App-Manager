import test from 'node:test';
import assert from 'node:assert/strict';
import { getNextTheme, resolveInitialTheme } from './theme';

test('resolveInitialTheme respects explicit saved preference over system preference', () => {
  assert.equal(resolveInitialTheme('dark', false), 'dark');
  assert.equal(resolveInitialTheme('light', true), 'light');
});

test('resolveInitialTheme falls back to system preference when no valid preference is saved', () => {
  assert.equal(resolveInitialTheme(null, true), 'dark');
  assert.equal(resolveInitialTheme(undefined, false), 'light');
  assert.equal(resolveInitialTheme('invalid', true), 'dark');
});

test('getNextTheme toggles cleanly between light and dark', () => {
  assert.equal(getNextTheme('light'), 'dark');
  assert.equal(getNextTheme('dark'), 'light');
});
