import type { StudyTask } from '../types/study';
import { PERSIAN_MONTH_NAMES, toPersianDigits, type WeekDayInfo } from './jalali';

export interface DailyProgressPoint {
  dateISO: string;
  dayName: string;
  jalaliShort: string;
  gregorianShort: string;
  completed: number;
  remaining: number;
  total: number;
  completionPercent: number;
}

export interface WeeklyProgressSummary {
  points: DailyProgressPoint[];
  totalTasks: number;
  completedTasks: number;
  remainingTasks: number;
  completionRatePercent: number;
}

export function buildWeeklyProgressSeries(
  weekDays: WeekDayInfo[],
  tasks: StudyTask[],
): WeeklyProgressSummary {
  const countsByDate = new Map<string, { completed: number; remaining: number }>();
  for (const day of weekDays) {
    countsByDate.set(day.dateISO, { completed: 0, remaining: 0 });
  }

  for (const task of tasks) {
    const bucket = countsByDate.get(task.dateISO);
    if (!bucket) continue;
    if (task.completed) {
      bucket.completed += 1;
    } else {
      bucket.remaining += 1;
    }
  }

  let totalTasks = 0;
  let completedTasks = 0;
  let remainingTasks = 0;

  const points: DailyProgressPoint[] = weekDays.map((day) => {
    const bucket = countsByDate.get(day.dateISO) ?? { completed: 0, remaining: 0 };
    const total = bucket.completed + bucket.remaining;
    const completionPercent = total > 0 ? Math.round((bucket.completed / total) * 100) : 0;
    const monthName = PERSIAN_MONTH_NAMES[day.jalali.jm - 1] ?? '';

    totalTasks += total;
    completedTasks += bucket.completed;
    remainingTasks += bucket.remaining;

    return {
      dateISO: day.dateISO,
      dayName: day.persianWeekday,
      jalaliShort: `${toPersianDigits(day.jalali.jd)} ${monthName}`.trim(),
      gregorianShort: day.gregorianFormattedEn,
      completed: bucket.completed,
      remaining: bucket.remaining,
      total,
      completionPercent,
    };
  });

  const completionRatePercent =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    points,
    totalTasks,
    completedTasks,
    remainingTasks,
    completionRatePercent,
  };
}
