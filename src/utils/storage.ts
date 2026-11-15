import type { StudyTask, SubjectCategory } from '../types/study';
import { createInitialSeedTasks, DEFAULT_SUBJECTS } from './tasks';

const TASKS_STORAGE_KEY = 'study_planner_tasks_v1';
const SUBJECTS_STORAGE_KEY = 'study_planner_subjects_v1';

export function loadTasks(): StudyTask[] {
  try {
    const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
    if (!raw) {
      const seed = createInitialSeedTasks();
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
  } catch {
    // fallback if storage is unavailable or corrupted
  }
  return createInitialSeedTasks();
}

export function saveTasks(tasks: StudyTask[]): void {
  try {
    window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    // ignore quota errors
  }
}

export function loadSubjects(): SubjectCategory[] {
  try {
    const raw = window.localStorage.getItem(SUBJECTS_STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(DEFAULT_SUBJECTS));
      return DEFAULT_SUBJECTS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch {
    // fallback
  }
  return DEFAULT_SUBJECTS;
}

export function saveSubjects(subjects: SubjectCategory[]): void {
  try {
    window.localStorage.setItem(SUBJECTS_STORAGE_KEY, JSON.stringify(subjects));
  } catch {
    // ignore quota errors
  }
}
