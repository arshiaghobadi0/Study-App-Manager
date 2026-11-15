import { BellRing, Check, Clock, X } from 'lucide-react';
import type { StudyTask, SubjectCategory } from '../types/study';
import { toPersianDigits } from '../utils/jalali';

interface ReminderBannerProps {
  dueTasks: StudyTask[];
  subjectsById: Record<string, SubjectCategory>;
  onComplete: (taskId: string) => void;
  onSnooze: (taskId: string, minutes: number) => void;
  onDismiss: (taskId: string) => void;
}

export function ReminderBanner({
  dueTasks,
  subjectsById,
  onComplete,
  onSnooze,
  onDismiss,
}: ReminderBannerProps) {
  if (dueTasks.length === 0) return null;

  return (
    <section
      aria-label="یادآورهای فعال"
      className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/70 rounded-xl p-4 space-y-3"
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <BellRing className="w-4 h-4 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
          <h2 className="text-sm font-semibold">
            یادآور زمان مطالعه ({toPersianDigits(dueTasks.length)} مورد)
          </h2>
        </div>
      </div>

      <div className="divide-y divide-amber-200/80 dark:divide-amber-800/60">
        {dueTasks.map((task) => {
          const subject = subjectsById[task.subjectId];
          return (
            <div
              key={task.id}
              className="py-2.5 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{task.title}</p>
                <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                  {subject && <span>{subject.name}</span>}
                  {subject && <span aria-hidden="true">·</span>}
                  <span className="font-mono-nums">ساعت {toPersianDigits(task.reminderTime)}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onComplete(task.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors whitespace-nowrap shrink-0"
                >
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  انجام شد
                </button>
                <button
                  type="button"
                  onClick={() => onSnooze(task.id, 10)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-slate-900 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors whitespace-nowrap shrink-0"
                >
                  <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                  ۱۰ دقیقه بعد
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(task.id)}
                  aria-label={`بستن یادآور '${task.title}'`}
                  className="inline-flex items-center justify-center p-1.5 rounded-lg text-amber-800 dark:text-amber-300 hover:bg-amber-200/60 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
