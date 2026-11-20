import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_APP_SETTINGS,
  getAccentPreset,
  isValidTimeHHMM,
  normalizeAppSettings,
} from './settings';

test('normalizeAppSettings returns defaults for null or invalid inputs', () => {
  assert.deepEqual(normalizeAppSettings(null), DEFAULT_APP_SETTINGS);
  assert.deepEqual(normalizeAppSettings('invalid'), DEFAULT_APP_SETTINGS);
  assert.deepEqual(normalizeAppSettings({}), DEFAULT_APP_SETTINGS);
});

test('normalizeAppSettings preserves valid preferences and falls back for invalid fields', () => {
  const normalized = normalizeAppSettings({
    accentColor: 'blue',
    calendarDisplay: 'jalali',
    density: 'compact',
    showCompletedTasks: false,
    showTaskNotes: false,
    defaultPriority: 'high',
    defaultReminderEnabled: false,
    defaultReminderTime: '09:30',
    reminderSoundEnabled: false,
    smoothAnimations: false,
  });

  assert.equal(normalized.accentColor, 'blue');
  assert.equal(normalized.calendarDisplay, 'jalali');
  assert.equal(normalized.density, 'compact');
  assert.equal(normalized.showCompletedTasks, false);
  assert.equal(normalized.showTaskNotes, false);
  assert.equal(normalized.defaultPriority, 'high');
  assert.equal(normalized.defaultReminderEnabled, false);
  assert.equal(normalized.defaultReminderTime, '09:30');
  assert.equal(normalized.reminderSoundEnabled, false);
  assert.equal(normalized.smoothAnimations, false);

  const clamped = normalizeAppSettings({
    accentColor: 'neon-pink',
    calendarDisplay: 'lunar',
    density: 'giant',
    defaultPriority: 'urgent',
    defaultReminderTime: '99:99',
    showCompletedTasks: 'yes',
  });
  assert.deepEqual(clamped, DEFAULT_APP_SETTINGS);
});

test('isValidTimeHHMM and getAccentPreset validate times and resolve presets accurately', () => {
  assert.equal(isValidTimeHHMM('00:00'), true);
  assert.equal(isValidTimeHHMM('23:59'), true);
  assert.equal(isValidTimeHHMM('24:00'), false);
  assert.equal(isValidTimeHHMM('9:00'), false);

  assert.equal(getAccentPreset('emerald').light, '#169663');
  assert.equal(getAccentPreset('coral').light, '#E14E43');
});
