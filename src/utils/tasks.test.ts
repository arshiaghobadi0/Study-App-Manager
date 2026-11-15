import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyTask } from '../types/study';
import {
  computeSnoozeUntilISO,
  computeWeeklyStats,
  createInitialSeedTasks,
  filterTasks,
  getDueReminderTasks,
  sortTasksForDay,
} from './tasks';
import { getWeekDays } from './jalali';

const sampleTasks: StudyTask[] = [
  {
    id: '1',
    title: 'تمرین ریاضی',
    dateISO: '2026-11-14',
    subjectId: 'math',
    priority: 'low',
    completed: false,
    reminderEnabled: false,
    reminderTime: '14:00',
    createdAt: '2026-11-14T08:00:00Z',
  },
  {
    id: '2',
    title: 'تست فیزیک',
    notes: 'فصل حرکت',
    dateISO: '2026-11-14',
    subjectId: 'physics',
    priority: 'high',
    completed: false,
    reminderEnabled: true,
    reminderTime: '16:00',
    createdAt: '2026-11-14T09:00:00Z',
  },
  {
    id: '3',
    title: 'مطالعه ادبیات',
    dateISO: '2026-11-15',
    subjectId: 'literature',
    priority: 'high',
    completed: true,
    reminderEnabled: true,
    reminderTime: '10:00',
    createdAt: '2026-11-14T07:00:00Z',
  },
];

test('sortTasksForDay puts incomplete tasks first, then sorts by priority and reminder time', () => {
  const sorted = sortTasksForDay(sampleTasks);
  assert.deepEqual(
    sorted.map((t) => t.id),
    ['2', '1', '3'],
  );
});

test('filterTasks filters by subject, priority, completion, and search query', () => {
  const bySubject = filterTasks(sampleTasks, {
    subjectId: 'physics',
    priority: 'all',
    completion: 'all',
    search: '',
  });
  assert.deepEqual(bySubject.map((t) => t.id), ['2']);

  const bySearch = filterTasks(sampleTasks, {
    subjectId: 'all',
    priority: 'all',
    completion: 'all',
    search: 'حرکت',
  });
  assert.deepEqual(bySearch.map((t) => t.id), ['2']);

  const byPendingHigh = filterTasks(sampleTasks, {
    subjectId: 'all',
    priority: 'high',
    completion: 'pending',
    search: '',
  });
  assert.deepEqual(byPendingHigh.map((t) => t.id), ['2']);
});

test('computeWeeklyStats aggregates counts for the target week only', () => {
  const days = getWeekDays(0, '2026-11-15').map((d) => d.dateISO);
  const stats = computeWeeklyStats(sampleTasks, days);
  assert.deepEqual(stats, {
    total: 3,
    completed: 1,
    pending: 2,
    activeReminders: 1,
  });
});

test('getDueReminderTasks detects due reminders and respects dismissal and snooze', () => {
  const dueAt = new Date(2026, 10, 14, 16, 5, 0, 0).getTime(); // 2026-11-14 16:05 local
  const due = getDueReminderTasks(sampleTasks, dueAt);
  assert.deepEqual(due.map((t) => t.id), ['2']);

  // Snoozed for 10 minutes should suppress until snooze expires
  const snoozedTasks = sampleTasks.map((t) =>
    t.id === '2' ? { ...t, snoozedUntilISO: computeSnoozeUntilISO(10, dueAt) } : t,
  );
  assert.equal(getDueReminderTasks(snoozedTasks, dueAt + 60_000).length, 0);
  assert.equal(getDueReminderTasks(snoozedTasks, dueAt + 11 * 60_000).length, 1);
});

test('createInitialSeedTasks populates tasks within the anchor week', () => {
  const days = new Set(getWeekDays(0, '2026-11-15').map((d) => d.dateISO));
  const seed = createInitialSeedTasks('2026-11-15');
  assert.ok(seed.length >= 6);
  for (const item of seed) {
    assert.ok(days.has(item.dateISO));
  }
});
