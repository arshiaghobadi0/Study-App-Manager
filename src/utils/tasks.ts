import type { PriorityLevel, StudyTask, SubjectCategory, TaskFilterState } from '../types/study';
import { addDaysISO, getSaturdayOfWeekISO, getTodayISO } from './jalali';

export const PRIORITY_ORDER: Record<PriorityLevel, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

export const PRIORITY_LABELS: Record<PriorityLevel, string> = {
  high: 'اولویت بالا',
  medium: 'اولویت متوسط',
  low: 'اولویت عادی',
};

export const DEFAULT_SUBJECTS: SubjectCategory[] = [
  { id: 'math', name: 'ریاضی', color: '#2563EB' },
  { id: 'physics', name: 'فیزیک', color: '#0891B2' },
  { id: 'literature', name: 'ادبیات فارسی', color: '#D97706' },
  { id: 'english', name: 'زبان انگلیسی', color: '#059669' },
  { id: 'chemistry', name: 'شیمی و علوم', color: '#7C3AED' },
  { id: 'cs', name: 'برنامه‌نویسی', color: '#DC2626' },
];

export const SUBJECT_COLOR_SWATCHES = [
  '#2563EB',
  '#0891B2',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#DB2777',
  '#475569',
];

export function sortTasksForDay(tasks: StudyTask[]): StudyTask[] {
  return [...tasks].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;

    if (a.reminderEnabled && b.reminderEnabled) {
      const tDiff = a.reminderTime.localeCompare(b.reminderTime);
      if (tDiff !== 0) return tDiff;
    } else if (a.reminderEnabled !== b.reminderEnabled) {
      return a.reminderEnabled ? -1 : 1;
    }

    return a.createdAt.localeCompare(b.createdAt);
  });
}

export function filterTasks(tasks: StudyTask[], filters: TaskFilterState): StudyTask[] {
  const normalizedQuery = filters.search.trim().toLowerCase();

  return tasks.filter((task) => {
    if (filters.subjectId !== 'all' && task.subjectId !== filters.subjectId) {
      return false;
    }
    if (filters.priority !== 'all' && task.priority !== filters.priority) {
      return false;
    }
    if (filters.completion === 'pending' && task.completed) {
      return false;
    }
    if (filters.completion === 'completed' && !task.completed) {
      return false;
    }
    if (normalizedQuery) {
      const hay = `${task.title} ${task.notes ?? ''}`.toLowerCase();
      if (!hay.includes(normalizedQuery)) {
        return false;
      }
    }
    return true;
  });
}

export interface WeeklyStats {
  total: number;
  completed: number;
  pending: number;
  activeReminders: number;
}

export function computeWeeklyStats(tasks: StudyTask[], weekDateISOs: string[]): WeeklyStats {
  const dateSet = new Set(weekDateISOs);
  const weekTasks = tasks.filter((t) => dateSet.has(t.dateISO));

  let completed = 0;
  let activeReminders = 0;

  for (const task of weekTasks) {
    if (task.completed) {
      completed += 1;
    } else if (task.reminderEnabled) {
      activeReminders += 1;
    }
  }

  return {
    total: weekTasks.length,
    completed,
    pending: weekTasks.length - completed,
    activeReminders,
  };
}

export function parseTaskReminderTimestamp(dateISO: string, timeHHMM: string): number {
  const [y, m, d] = dateISO.split('-').map(Number);
  const [hh, mm] = timeHHMM.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return NaN;
  }
  return new Date(y, m - 1, d, hh, mm, 0, 0).getTime();
}

export function getDueReminderTasks(tasks: StudyTask[], nowMs: number = Date.now()): StudyTask[] {
  const maxPastWindowMs = 24 * 60 * 60 * 1000; // within last 24h so old week reminders don't spam

  return tasks.filter((task) => {
    if (task.completed || !task.reminderEnabled || !task.reminderTime) {
      return false;
    }
    if (task.reminderDismissedAt) {
      return false;
    }
    if (task.snoozedUntilISO) {
      const snoozeMs = Date.parse(task.snoozedUntilISO);
      if (!Number.isNaN(snoozeMs) && nowMs < snoozeMs) {
        return false;
      }
    }
    const targetMs = parseTaskReminderTimestamp(task.dateISO, task.reminderTime);
    if (Number.isNaN(targetMs)) return false;

    return nowMs >= targetMs && nowMs - targetMs <= maxPastWindowMs;
  });
}

export function computeSnoozeUntilISO(minutes: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + minutes * 60 * 1000).toISOString();
}

export function createInitialSeedTasks(anchorISO: string = getTodayISO()): StudyTask[] {
  const sat = getSaturdayOfWeekISO(anchorISO);
  const nowISO = new Date().toISOString();

  return [
    {
      id: 'seed-1',
      title: 'حل ۱۵ تست مبحث انتگرال و کاربرد مشتق',
      notes: 'تمرکز بر سوالات کنکور سه سال اخیر و یادداشت نکات سرعتی',
      dateISO: sat,
      subjectId: 'math',
      priority: 'high',
      completed: true,
      reminderEnabled: true,
      reminderTime: '16:30',
      createdAt: nowISO,
    },
    {
      id: 'seed-2',
      title: 'مرور فصل حرکت‌شناسی و نمودار سرعت-زمان',
      notes: 'خلاصه‌نویسی فرمول‌های شتاب ثابت',
      dateISO: addDaysISO(sat, 1),
      subjectId: 'physics',
      priority: 'high',
      completed: false,
      reminderEnabled: true,
      reminderTime: '18:00',
      createdAt: nowISO,
    },
    {
      id: 'seed-3',
      title: 'تمرین لغات درس سوم و درک مطلب انگلیسی',
      notes: 'مرور فلش‌کارت‌های واژگان آکادمیک',
      dateISO: addDaysISO(sat, 1),
      subjectId: 'english',
      priority: 'medium',
      completed: false,
      reminderEnabled: false,
      reminderTime: '20:00',
      createdAt: nowISO,
    },
    {
      id: 'seed-4',
      title: 'خواندن آرایه‌های ادبی و تحلیل دو غزل حافظ',
      dateISO: addDaysISO(sat, 2),
      subjectId: 'literature',
      priority: 'low',
      completed: false,
      reminderEnabled: true,
      reminderTime: '17:00',
      createdAt: nowISO,
    },
    {
      id: 'seed-5',
      title: 'پیاده‌سازی الگوریتم مرتب‌سازی ادغامی و تحلیل پیچیدگی',
      notes: 'نوشتن تست واحد برای آرایه‌های خالی و مرتب‌شده',
      dateISO: addDaysISO(sat, 3),
      subjectId: 'cs',
      priority: 'high',
      completed: false,
      reminderEnabled: true,
      reminderTime: '19:30',
      createdAt: nowISO,
    },
    {
      id: 'seed-6',
      title: 'حل مسائل استوکیومتری و موازنه واکنش‌ها',
      dateISO: addDaysISO(sat, 4),
      subjectId: 'chemistry',
      priority: 'medium',
      completed: false,
      reminderEnabled: true,
      reminderTime: '15:00',
      createdAt: nowISO,
    },
    {
      id: 'seed-7',
      title: 'مرور جمع‌بندی نکات ریاضی و آزمون زمان‌دار ۳۰ دقیقه‌ای',
      dateISO: addDaysISO(sat, 5),
      subjectId: 'math',
      priority: 'high',
      completed: false,
      reminderEnabled: true,
      reminderTime: '10:30',
      createdAt: nowISO,
    },
    {
      id: 'seed-8',
      title: 'مطالعه آزاد و جبران تکالیف عقب‌مانده هفته',
      dateISO: addDaysISO(sat, 6),
      subjectId: 'literature',
      priority: 'low',
      completed: false,
      reminderEnabled: false,
      reminderTime: '11:00',
      createdAt: nowISO,
    },
  ];
}
