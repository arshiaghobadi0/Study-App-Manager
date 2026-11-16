import test from 'node:test';
import assert from 'node:assert/strict';
import type { StudyTask, SubjectCategory } from '../types/study';
import {
  applyImportedBackup,
  buildBackupFilename,
  createBackupPayload,
  parseBackupJson,
  serializeBackupJson,
} from './backup';

const sampleSubjects: SubjectCategory[] = [
  { id: 'math', name: 'ریاضی', color: '#2563eb' },
  { id: 'custom-1', name: 'زیست‌شناسی', color: '#059669' },
];

const sampleTasks: StudyTask[] = [
  {
    id: 'task-1',
    title: 'حل تمرین‌های انتگرال',
    notes: 'صفحه ۴۵ تا ۵۰',
    dateISO: '2026-11-15',
    subjectId: 'math',
    priority: 'high',
    completed: false,
    reminderEnabled: true,
    reminderTime: '18:00',
    createdAt: '2026-11-14T10:00:00.000Z',
  },
  {
    id: 'task-2',
    title: 'مرور فصل ژنتیک',
    dateISO: '2026-11-28',
    subjectId: 'custom-1',
    priority: 'medium',
    completed: true,
    reminderEnabled: false,
    reminderTime: '16:00',
    createdAt: '2026-11-14T11:00:00.000Z',
  },
];

test('createBackupPayload includes all tasks across weeks, subject settings, and theme', () => {
  const payload = createBackupPayload({
    tasks: sampleTasks,
    subjects: sampleSubjects,
    theme: 'dark',
    exportedAt: '2026-11-15T12:00:00.000Z',
  });

  assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.exportedAt, '2026-11-15T12:00:00.000Z');
  assert.equal(payload.settings.theme, 'dark');
  assert.deepEqual(payload.settings.subjects, sampleSubjects);
  assert.deepEqual(payload.tasks, sampleTasks);
  assert.deepEqual(payload.summary, { taskCount: 2, subjectCount: 2 });

  // Verify clones are detached from source references
  payload.tasks[0].title = 'changed';
  payload.settings.subjects[0].name = 'changed';
  assert.equal(sampleTasks[0].title, 'حل تمرین‌های انتگرال');
  assert.equal(sampleSubjects[0].name, 'ریاضی');
});

test('serializeBackupJson produces valid formatted JSON that round-trips cleanly', () => {
  const payload = createBackupPayload({
    tasks: sampleTasks,
    subjects: sampleSubjects,
    theme: 'light',
    exportedAt: '2026-11-15T12:00:00.000Z',
  });

  const json = serializeBackupJson(payload);
  const parsed = JSON.parse(json);
  assert.deepEqual(parsed, payload);
  assert.ok(json.includes('\n  '), 'JSON should be pretty-printed for readability');

  const reimported = parseBackupJson(json, []);
  assert.equal(reimported.ok, true);
  if (reimported.ok) {
    assert.equal(reimported.data.theme, 'light');
    assert.deepEqual(reimported.data.subjects, sampleSubjects);
    assert.deepEqual(reimported.data.tasks, sampleTasks);
  }
});

test('buildBackupFilename produces a clean dated JSON filename with safe fallback', () => {
  assert.equal(buildBackupFilename('2026-11-15'), 'study-planner-backup-2026-11-15.json');
  assert.equal(buildBackupFilename('invalid/date'), 'study-planner-backup-export.json');
});

test('parseBackupJson supports simplified task array and rejects invalid JSON or bad dates', () => {
  const arrayImport = parseBackupJson(
    JSON.stringify([{ title: 'خلاصه فصل اول', dateISO: '2026-11-16', priority: 'high' }]),
    sampleSubjects,
  );
  assert.equal(arrayImport.ok, true);
  if (arrayImport.ok) {
    assert.equal(arrayImport.data.tasks.length, 1);
    assert.equal(arrayImport.data.tasks[0].subjectId, 'math');
    assert.equal(arrayImport.data.tasks[0].priority, 'high');
  }

  const malformed = parseBackupJson('{not valid json', sampleSubjects);
  assert.equal(malformed.ok, false);

  const badDate = parseBackupJson(
    JSON.stringify({ tasks: [{ title: 'تکلیف تست', dateISO: '2026-02-31' }] }),
    sampleSubjects,
  );
  assert.equal(badDate.ok, false);

  const emptyObj = parseBackupJson('{}', sampleSubjects);
  assert.equal(emptyObj.ok, false);
});

test('applyImportedBackup handles both replace and merge modes cleanly', () => {
  const currentSubjects: SubjectCategory[] = [
    { id: 'math', name: 'ریاضی', color: '#2563eb' },
  ];
  const currentTasks: StudyTask[] = [sampleTasks[0]];

  const imported = {
    subjects: [
      { id: 'math', name: 'ریاضی', color: '#1d4ed8' },
      { id: 'bio', name: 'زیست‌شناسی', color: '#059669' },
    ],
    tasks: [
      { ...sampleTasks[0], title: 'عنوان جدید' },
      { ...sampleTasks[1], subjectId: 'bio' },
    ],
  };

  const merged = applyImportedBackup({
    mode: 'merge',
    imported,
    currentTasks,
    currentSubjects,
  });
  assert.equal(merged.subjects.length, 2);
  assert.equal(merged.tasks.length, 2);
  assert.equal(merged.tasks[0].title, 'عنوان جدید');

  const replaced = applyImportedBackup({
    mode: 'replace',
    imported: {
      subjects: [{ id: 'bio', name: 'زیست‌شناسی', color: '#059669' }],
      tasks: [{ ...sampleTasks[1], subjectId: 'missing-id' }],
    },
    currentTasks,
    currentSubjects,
  });
  assert.equal(replaced.subjects.length, 1);
  assert.equal(replaced.tasks.length, 1);
  assert.equal(replaced.tasks[0].subjectId, 'bio');
});
