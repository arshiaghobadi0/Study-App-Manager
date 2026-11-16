import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyTask } from '../types/study';
import { getWeekDays } from './jalali';
import { buildWeeklyProgressSeries } from './analytics';

test('buildWeeklyProgressSeries aggregates completed and remaining tasks per day across the 7-day week', () => {
  const weekDays = getWeekDays(0, '2026-11-15');
  const tasks: StudyTask[] = [
    {
      id: 't1',
      title: 'تمرین ریاضی',
      dateISO: weekDays[0].dateISO, // شنبه
      subjectId: 'math',
      priority: 'high',
      completed: true,
      reminderEnabled: false,
      reminderTime: '16:00',
      createdAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 't2',
      title: 'تمرین فیزیک',
      dateISO: weekDays[1].dateISO, // یک‌شنبه
      subjectId: 'physics',
      priority: 'medium',
      completed: true,
      reminderEnabled: false,
      reminderTime: '17:00',
      createdAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 't3',
      title: 'خلاصه زیست',
      dateISO: weekDays[1].dateISO, // یک‌شنبه
      subjectId: 'science',
      priority: 'low',
      completed: false,
      reminderEnabled: true,
      reminderTime: '19:00',
      createdAt: '2026-11-14T10:00:00Z',
    },
    {
      id: 't4',
      title: 'تکلیف هفته دیگر',
      dateISO: '2026-12-25', // outside this week
      subjectId: 'math',
      priority: 'low',
      completed: true,
      reminderEnabled: false,
      reminderTime: '10:00',
      createdAt: '2026-11-14T10:00:00Z',
    },
  ];

  const summary = buildWeeklyProgressSeries(weekDays, tasks);

  assert.equal(summary.points.length, 7);
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.completedTasks, 2);
  assert.equal(summary.remainingTasks, 1);
  assert.equal(summary.completionRatePercent, 67);

  assert.equal(summary.points[0].dayName, 'شنبه');
  assert.ok(!summary.points[0].jalaliShort.includes('undefined'));
  assert.ok(summary.points[0].jalaliShort.includes('آبان'));
  assert.equal(summary.points[0].completed, 1);
  assert.equal(summary.points[0].remaining, 0);
  assert.equal(summary.points[0].completionPercent, 100);

  assert.equal(summary.points[1].dayName, 'یک‌شنبه');
  assert.equal(summary.points[1].completed, 1);
  assert.equal(summary.points[1].remaining, 1);
  assert.equal(summary.points[1].completionPercent, 50);

  assert.equal(summary.points[2].completed, 0);
  assert.equal(summary.points[2].remaining, 0);
  assert.equal(summary.points[2].completionPercent, 0);
});

test('buildWeeklyProgressSeries returns zero totals for an empty week', () => {
  const weekDays = getWeekDays(1, '2026-11-15');
  const summary = buildWeeklyProgressSeries(weekDays, []);

  assert.equal(summary.points.length, 7);
  assert.equal(summary.totalTasks, 0);
  assert.equal(summary.completedTasks, 0);
  assert.equal(summary.remainingTasks, 0);
  assert.equal(summary.completionRatePercent, 0);
});
