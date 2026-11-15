import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyTask, SubjectCategory } from '../types/study';
import { getWeekDays } from './jalali';
import { buildPrintableWeekData } from './printSchedule';

const subjectsById: Record<string, SubjectCategory> = {
  math: { id: 'math', name: 'ریاضی', color: '#2563EB' },
  physics: { id: 'physics', name: 'فیزیک', color: '#0891B2' },
};

const sampleTasks: StudyTask[] = [
  {
    id: 't1',
    title: 'تمرین ۱',
    notes: 'صفحه ۱۰',
    dateISO: '2026-11-14',
    subjectId: 'math',
    priority: 'high',
    completed: true,
    reminderEnabled: true,
    reminderTime: '16:00',
    createdAt: '2026-11-14T08:00:00Z',
  },
  {
    id: 't2',
    title: 'تمرین ۲',
    notes: 'صفحه ۲۰',
    dateISO: '2026-11-15',
    subjectId: 'physics',
    priority: 'medium',
    completed: false,
    reminderEnabled: false,
    reminderTime: '18:00',
    createdAt: '2026-11-14T09:00:00Z',
  },
];

test('buildPrintableWeekData respects includeCompleted and includeNotes options', () => {
  const days = getWeekDays(0, '2026-11-15');

  const full = buildPrintableWeekData(days, sampleTasks, subjectsById, {
    includeCompleted: true,
    includeNotes: true,
  });

  assert.equal(full.totalCount, 2);
  assert.equal(full.completedCount, 1);
  assert.equal(full.pendingCount, 1);
  assert.equal(full.days[0].tasks.length, 1);
  assert.equal(full.days[0].tasks[0].notes, 'صفحه ۱۰');
  assert.equal(full.days[0].tasks[0].reminderText, '16:00');
  assert.equal(full.days[1].tasks[0].reminderText, undefined);

  const pendingOnlyNoNotes = buildPrintableWeekData(days, sampleTasks, subjectsById, {
    includeCompleted: false,
    includeNotes: false,
  });

  assert.equal(pendingOnlyNoNotes.days[0].tasks.length, 0);
  assert.equal(pendingOnlyNoNotes.days[1].tasks.length, 1);
  assert.equal(pendingOnlyNoNotes.days[1].tasks[0].notes, undefined);
});
