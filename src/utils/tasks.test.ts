import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyTask } from '../types/study';
import {
  computeSidebarCounts,
  computeSnoozeUntilISO,
  computeWeeklyStats,
  createInitialSeedTasks,
  expandTaskDatesForWeek,
  filterTasks,
  getDueReminderTasks,
  removeTasksByScope,
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

test('filterTasks filters by subject, priority, completion, dateISO, reminders, and search query', () => {
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

  const byDateAndReminder = filterTasks(sampleTasks, {
    subjectId: 'all',
    priority: 'all',
    completion: 'all',
    search: '',
    dateISO: '2026-11-14',
    onlyReminders: true,
  });
  assert.deepEqual(byDateAndReminder.map((t) => t.id), ['2']);
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

test('computeSidebarCounts aggregates today, week totals, and per-subject counts accurately', () => {
  const days = getWeekDays(0, '2026-11-15').map((d) => d.dateISO);
  const counts = computeSidebarCounts(sampleTasks, days, '2026-11-14');
  assert.equal(counts.todayPending, 2);
  assert.equal(counts.weekTotal, 3);
  assert.equal(counts.weekCompleted, 1);
  assert.equal(counts.weekHighPriorityPending, 1);
  assert.equal(counts.weekActiveReminders, 1);
  assert.equal(counts.bySubject.math, 1);
  assert.equal(counts.bySubject.physics, 1);
  assert.equal(counts.bySubject.literature, 1);
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

test('expandTaskDatesForWeek returns single date or all 7 days of the Iranian week', () => {
  assert.deepEqual(expandTaskDatesForWeek('2026-11-19', false), ['2026-11-19']);

  const expectedWeek = [
    '2026-11-14', // Saturday
    '2026-11-15',
    '2026-11-16',
    '2026-11-17',
    '2026-11-18',
    '2026-11-19', // Thursday
    '2026-11-20', // Friday
  ];
  assert.deepEqual(expandTaskDatesForWeek('2026-11-19', true), expectedWeek);
  assert.deepEqual(expandTaskDatesForWeek('2026-11-14', true), expectedWeek);
  assert.deepEqual(expandTaskDatesForWeek('2026-11-20', true), expectedWeek);
});

test('removeTasksByScope deletes all tasks or week tasks with soft/permanent trash modes', () => {
  const mixedTasks: StudyTask[] = [
    ...sampleTasks,
    {
      id: 'next-week-1',
      title: 'تکلیف هفته بعد',
      dateISO: '2026-11-22',
      subjectId: 'math',
      priority: 'medium',
      completed: false,
      reminderEnabled: false,
      reminderTime: '18:00',
      createdAt: '2026-11-22T08:00:00Z',
    },
  ];
  const currentWeekISOs = getWeekDays(0, '2026-11-15').map((d) => d.dateISO);

  // Soft delete all
  const allSoft = removeTasksByScope(mixedTasks, [], {
    scope: 'all',
    weekDateISOs: currentWeekISOs,
    permanent: false,
    deletedAtISO: '2026-11-19T10:00:00Z',
  });
  assert.equal(allSoft.nextTasks.length, 0);
  assert.equal(allSoft.removedCount, 4);
  assert.equal(allSoft.nextTrash.length, 4);
  assert.equal(allSoft.nextTrash[0].deletedAt, '2026-11-19T10:00:00Z');

  // Permanent delete all
  const allPerm = removeTasksByScope(mixedTasks, [], {
    scope: 'all',
    weekDateISOs: currentWeekISOs,
    permanent: true,
  });
  assert.equal(allPerm.nextTasks.length, 0);
  assert.equal(allPerm.removedCount, 4);
  assert.equal(allPerm.nextTrash.length, 0);

  // Week-only delete preserves tasks in other weeks
  const weekOnly = removeTasksByScope(mixedTasks, [], {
    scope: 'week',
    weekDateISOs: currentWeekISOs,
    permanent: false,
  });
  assert.equal(weekOnly.removedCount, 3);
  assert.deepEqual(
    weekOnly.nextTasks.map((t) => t.id),
    ['next-week-1'],
  );
  assert.equal(weekOnly.nextTrash.length, 3);
});
