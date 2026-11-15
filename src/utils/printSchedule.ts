import type { StudyTask, SubjectCategory } from '../types/study';
import { formatWeekSpanSummary, type WeekDayInfo } from './jalali';
import { sortTasksForDay } from './tasks';

export interface PrintScheduleOptions {
  includeCompleted: boolean;
  includeNotes: boolean;
}

export interface PrintableTaskItem {
  id: string;
  title: string;
  notes?: string;
  subjectName: string;
  subjectColor: string;
  priority: StudyTask['priority'];
  completed: boolean;
  reminderText?: string;
}

export interface PrintableDaySection {
  day: WeekDayInfo;
  tasks: PrintableTaskItem[];
}

export interface PrintableWeekData {
  jalaliSpan: string;
  gregorianSpan: string;
  totalCount: number;
  completedCount: number;
  pendingCount: number;
  days: PrintableDaySection[];
}

export function buildPrintableWeekData(
  weekDays: WeekDayInfo[],
  allTasks: StudyTask[],
  subjectsById: Record<string, SubjectCategory>,
  options: PrintScheduleOptions,
): PrintableWeekData {
  const { jalaliSpan, gregorianSpan } = formatWeekSpanSummary(weekDays);
  const weekDateSet = new Set(weekDays.map((d) => d.dateISO));
  const weekTasks = allTasks.filter((t) => weekDateSet.has(t.dateISO));

  const totalCount = weekTasks.length;
  const completedCount = weekTasks.filter((t) => t.completed).length;
  const pendingCount = totalCount - completedCount;

  const days: PrintableDaySection[] = weekDays.map((day) => {
    const dayTasks = sortTasksForDay(
      weekTasks.filter((t) => t.dateISO === day.dateISO && (options.includeCompleted || !t.completed)),
    );

    return {
      day,
      tasks: dayTasks.map((task) => {
        const subject = subjectsById[task.subjectId];
        return {
          id: task.id,
          title: task.title,
          notes: options.includeNotes ? task.notes : undefined,
          subjectName: subject?.name ?? 'عمومی',
          subjectColor: subject?.color ?? '#64748B',
          priority: task.priority,
          completed: task.completed,
          reminderText: task.reminderEnabled && task.reminderTime ? task.reminderTime : undefined,
        };
      }),
    };
  });

  return {
    jalaliSpan,
    gregorianSpan,
    totalCount,
    completedCount,
    pendingCount,
    days,
  };
}
