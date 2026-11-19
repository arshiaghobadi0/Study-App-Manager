import type { PriorityLevel, StudyTask, SubjectCategory } from '../types/study';
import { SUBJECT_COLOR_SWATCHES } from './tasks';
import type { ThemeMode } from './theme';
import { saveExportFile, type ExportSaveResult } from './tauriBridge';

export interface StudyBackupPayload {
  schemaVersion: 1;
  exportedAt: string;
  settings: {
    theme: ThemeMode;
    subjects: SubjectCategory[];
  };
  tasks: StudyTask[];
  summary: {
    taskCount: number;
    subjectCount: number;
  };
}

export interface CreateBackupInput {
  tasks: StudyTask[];
  subjects: SubjectCategory[];
  theme: ThemeMode;
  exportedAt?: string;
}

export type ImportMode = 'replace' | 'merge';

export interface ParsedBackupData {
  exportedAt?: string;
  theme?: ThemeMode;
  subjects: SubjectCategory[];
  tasks: StudyTask[];
}

export type ParseBackupResult =
  | { ok: true; data: ParsedBackupData }
  | { ok: false; error: string };

const VALID_PRIORITIES = new Set<PriorityLevel>(['high', 'medium', 'low']);

function isValidIsoDateString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const [y, m, d] = value.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

function isValidTimeString(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [hh, mm] = value.split(':').map(Number);
  return hh >= 0 && hh <= 23 && mm >= 0 && mm <= 59;
}

function normalizeSubjects(rawSubjects: unknown): { ok: true; subjects: SubjectCategory[] } | { ok: false; error: string } {
  if (rawSubjects === undefined) {
    return { ok: true, subjects: [] };
  }
  if (!Array.isArray(rawSubjects)) {
    return { ok: false, error: 'فهرست درس‌ها در فایل JSON باید به صورت آرایه باشد.' };
  }

  const normalized: SubjectCategory[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawSubjects.length; i += 1) {
    const item = rawSubjects[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'ساختار یکی از درس‌ها در فایل JSON معتبر نیست.' };
    }
    const record = item as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name) {
      return { ok: false, error: 'نام یکی از درس‌ها در فایل JSON خالی یا نامعتبر است.' };
    }
    let id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `sub-import-${i + 1}`;
    while (seenIds.has(id)) {
      id = `${id}-${i + 1}`;
    }
    seenIds.add(id);

    const color =
      typeof record.color === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(record.color.trim())
        ? record.color.trim()
        : SUBJECT_COLOR_SWATCHES[i % SUBJECT_COLOR_SWATCHES.length];

    normalized.push({ id, name, color });
  }

  return { ok: true, subjects: normalized };
}

function normalizeTasks(
  rawTasks: unknown,
  availableSubjects: SubjectCategory[],
): { ok: true; tasks: StudyTask[] } | { ok: false; error: string } {
  if (rawTasks === undefined) {
    return { ok: true, tasks: [] };
  }
  if (!Array.isArray(rawTasks)) {
    return { ok: false, error: 'فهرست تکالیف در فایل JSON باید به صورت آرایه باشد.' };
  }

  const subjectIds = new Set(availableSubjects.map((s) => s.id));
  const fallbackSubjectId = availableSubjects[0]?.id ?? 'math';
  const normalized: StudyTask[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < rawTasks.length; i += 1) {
    const item = rawTasks[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: 'ساختار یکی از تکالیف در فایل JSON معتبر نیست.' };
    }
    const record = item as Record<string, unknown>;
    const title = typeof record.title === 'string' ? record.title.trim() : '';
    if (!title) {
      return { ok: false, error: `عنوان تکلیف شماره ${i + 1} خالی یا نامعتبر است.` };
    }
    if (!isValidIsoDateString(record.dateISO)) {
      return { ok: false, error: `تاریخ تکلیف «${title}» معتبر نیست (فرمت YYYY-MM-DD لازم است).` };
    }

    let id = typeof record.id === 'string' && record.id.trim() ? record.id.trim() : `task-import-${Date.now()}-${i + 1}`;
    while (seenIds.has(id)) {
      id = `${id}-${i + 1}`;
    }
    seenIds.add(id);

    const rawSubjectId = typeof record.subjectId === 'string' ? record.subjectId.trim() : '';
    const subjectId = subjectIds.has(rawSubjectId) ? rawSubjectId : fallbackSubjectId;
    const priority: PriorityLevel =
      typeof record.priority === 'string' && VALID_PRIORITIES.has(record.priority as PriorityLevel)
        ? (record.priority as PriorityLevel)
        : 'medium';
    const completed = typeof record.completed === 'boolean' ? record.completed : false;
    const reminderEnabled = typeof record.reminderEnabled === 'boolean' ? record.reminderEnabled : false;
    const reminderTime = isValidTimeString(record.reminderTime) ? record.reminderTime : '18:00';
    const notes = typeof record.notes === 'string' && record.notes.trim() ? record.notes.trim() : undefined;
    const reminderDismissedAt =
      typeof record.reminderDismissedAt === 'string' && record.reminderDismissedAt.trim()
        ? record.reminderDismissedAt.trim()
        : undefined;
    const snoozedUntilISO =
      typeof record.snoozedUntilISO === 'string' && record.snoozedUntilISO.trim()
        ? record.snoozedUntilISO.trim()
        : undefined;
    const createdAt =
      typeof record.createdAt === 'string' && record.createdAt.trim()
        ? record.createdAt.trim()
        : new Date().toISOString();

    normalized.push({
      id,
      title,
      ...(notes ? { notes } : {}),
      dateISO: record.dateISO,
      subjectId,
      priority,
      completed,
      reminderEnabled,
      reminderTime,
      ...(reminderDismissedAt ? { reminderDismissedAt } : {}),
      ...(snoozedUntilISO ? { snoozedUntilISO } : {}),
      createdAt,
    });
  }

  return { ok: true, tasks: normalized };
}

export function parseBackupJson(
  rawText: string,
  existingSubjects: SubjectCategory[],
): ParseBackupResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    return { ok: false, error: 'محتوای JSON خالی است.' };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return { ok: false, error: 'ساختار فایل JSON معتبر نیست و قابل خواندن نمی‌باشد.' };
  }

  let rawTasks: unknown;
  let rawSubjects: unknown;
  let theme: ThemeMode | undefined;
  let exportedAt: string | undefined;

  if (Array.isArray(parsed)) {
    rawTasks = parsed;
  } else if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    const settingsObj =
      obj.settings && typeof obj.settings === 'object'
        ? (obj.settings as Record<string, unknown>)
        : undefined;

    rawSubjects = obj.subjects ?? settingsObj?.subjects;
    rawTasks = obj.tasks;

    const rawTheme = obj.theme ?? settingsObj?.theme;
    if (rawTheme === 'light' || rawTheme === 'dark') {
      theme = rawTheme;
    }
    if (typeof obj.exportedAt === 'string' && obj.exportedAt.trim()) {
      exportedAt = obj.exportedAt.trim();
    }

    if (rawTasks === undefined && rawSubjects === undefined) {
      return {
        ok: false,
        error: 'فایل JSON باید شامل فهرست تکالیف (tasks) یا تنظیمات درس‌ها (subjects) باشد.',
      };
    }
  } else {
    return { ok: false, error: 'فرمت ریشه فایل JSON معتبر نیست.' };
  }

  const subjectsResult = normalizeSubjects(rawSubjects);
  if (!subjectsResult.ok) {
    return subjectsResult;
  }

  const subjectPool =
    subjectsResult.subjects.length > 0 ? [...subjectsResult.subjects, ...existingSubjects] : existingSubjects;
  const tasksResult = normalizeTasks(rawTasks, subjectPool);
  if (!tasksResult.ok) {
    return tasksResult;
  }

  if (tasksResult.tasks.length === 0 && subjectsResult.subjects.length === 0) {
    return {
      ok: false,
      error: 'هیچ تکلیف یا درسی در فایل JSON یافت نشد.',
    };
  }

  return {
    ok: true,
    data: {
      exportedAt,
      theme,
      subjects: subjectsResult.subjects,
      tasks: tasksResult.tasks,
    },
  };
}

export function applyImportedBackup(args: {
  mode: ImportMode;
  imported: ParsedBackupData;
  currentTasks: StudyTask[];
  currentSubjects: SubjectCategory[];
}): { tasks: StudyTask[]; subjects: SubjectCategory[] } {
  const { mode, imported, currentTasks, currentSubjects } = args;

  if (mode === 'replace') {
    const nextSubjects =
      imported.subjects.length > 0 ? imported.subjects : currentSubjects;
    const validIds = new Set(nextSubjects.map((s) => s.id));
    const fallbackId = nextSubjects[0]?.id ?? 'math';
    const nextTasks = imported.tasks.map((task) => ({
      ...task,
      subjectId: validIds.has(task.subjectId) ? task.subjectId : fallbackId,
    }));

    return {
      subjects: nextSubjects,
      tasks: nextTasks,
    };
  }

  // Merge mode: combine subjects (deduped by id or normalized name) and upsert tasks by id
  const mergedSubjects = [...currentSubjects];
  const existingSubIds = new Set(mergedSubjects.map((s) => s.id));
  const subIdByName = new Map(mergedSubjects.map((s) => [s.name, s.id]));
  const importedToMergedSubjectId = new Map<string, string>();

  for (const sub of imported.subjects) {
    const matchByName = subIdByName.get(sub.name);
    if (existingSubIds.has(sub.id)) {
      const idx = mergedSubjects.findIndex((s) => s.id === sub.id);
      if (idx >= 0) {
        mergedSubjects[idx] = { ...sub };
      }
      importedToMergedSubjectId.set(sub.id, sub.id);
    } else if (matchByName) {
      importedToMergedSubjectId.set(sub.id, matchByName);
    } else {
      mergedSubjects.push({ ...sub });
      existingSubIds.add(sub.id);
      subIdByName.set(sub.name, sub.id);
      importedToMergedSubjectId.set(sub.id, sub.id);
    }
  }

  const mergedSubjectIds = new Set(mergedSubjects.map((s) => s.id));
  const fallbackSubjectId = mergedSubjects[0]?.id ?? 'math';

  const mergedTasks = [...currentTasks];
  const taskIndexById = new Map(mergedTasks.map((t, idx) => [t.id, idx]));

  for (const task of imported.tasks) {
    const remappedSubjectId =
      importedToMergedSubjectId.get(task.subjectId) ??
      (mergedSubjectIds.has(task.subjectId) ? task.subjectId : fallbackSubjectId);
    const normalizedTask: StudyTask = {
      ...task,
      subjectId: remappedSubjectId,
    };

    const existingIdx = taskIndexById.get(task.id);
    if (existingIdx !== undefined) {
      mergedTasks[existingIdx] = normalizedTask;
    } else {
      taskIndexById.set(task.id, mergedTasks.length);
      mergedTasks.push(normalizedTask);
    }
  }

  return {
    subjects: mergedSubjects,
    tasks: mergedTasks,
  };
}

export function createBackupPayload({
  tasks,
  subjects,
  theme,
  exportedAt = new Date().toISOString(),
}: CreateBackupInput): StudyBackupPayload {
  const clonedSubjects = subjects.map((subject) => ({
    id: subject.id,
    name: subject.name,
    color: subject.color,
  }));

  const clonedTasks = tasks.map((task) => ({
    ...task,
  }));

  return {
    schemaVersion: 1,
    exportedAt,
    settings: {
      theme,
      subjects: clonedSubjects,
    },
    tasks: clonedTasks,
    summary: {
      taskCount: clonedTasks.length,
      subjectCount: clonedSubjects.length,
    },
  };
}

export function serializeBackupJson(payload: StudyBackupPayload): string {
  return JSON.stringify(payload, null, 2);
}

export function buildBackupFilename(dateISO: string): string {
  const safeDate = /^\d{4}-\d{2}-\d{2}$/.test(dateISO) ? dateISO : 'export';
  return `study-planner-backup-${safeDate}.json`;
}

function triggerBrowserJsonDownload(filename: string, jsonContent: string): void {
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = 'none';
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function downloadJsonFile(
  filename: string,
  jsonContent: string,
): Promise<ExportSaveResult> {
  return saveExportFile({
    filename,
    mimeType: 'application/json',
    data: jsonContent,
    fallbackBrowserDownload: () => triggerBrowserJsonDownload(filename, jsonContent),
  });
}
