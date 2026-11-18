import { Bell, BellOff, Check, Pencil, Trash2 } from 'lucide-react';
import type { StudyTask, SubjectCategory } from '../types/study';
import { toPersianDigits } from '../utils/jalali';
import { PRIORITY_LABELS } from '../utils/tasks';

interface TaskRowProps {
  task: StudyTask;
  subject?: SubjectCategory;
  onToggleComplete: (taskId: string) => void;
  onToggleReminder: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

export function TaskRow({
  task,
  subject,
  onToggleComplete,
  onToggleReminder,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const accentColor = subject?.color ?? '#E14842';

  return (
    <div
      className={`group rounded-xl px-3 py-2.5 transition-colors duration-150 flex items-start justify-between gap-2.5 ${
        task.completed
          ? 'bg-[#F2F2F7]/65 dark:bg-zinc-800/40'
          : 'bg-[#F2F2F7] hover:bg-[#E8E8EE] dark:bg-zinc-800/85 dark:hover:bg-zinc-800'
      }`}
    >
      <div className="flex items-start gap-2.5 min-w-0 flex-1">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`تکمیل '${task.title}'`}
          onClick={() => onToggleComplete(task.id)}
          className={`mt-0.5 w-[18px] h-[18px] rounded-full border-2 inline-flex items-center justify-center transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-rose-500 ${
            task.completed
              ? 'border-transparent text-white'
              : 'border-zinc-400/80 dark:border-zinc-500 bg-white/80 dark:bg-zinc-900/60 hover:border-zinc-600 dark:hover:border-zinc-300'
          }`}
          style={
            task.completed
              ? { backgroundColor: accentColor, borderColor: accentColor }
              : undefined
          }
        >
          {task.completed && <Check className="w-3 h-3 stroke-[3]" aria-hidden="true" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`text-[13.5px] leading-5 break-words ${
              task.completed
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-900 dark:text-zinc-100 font-medium'
            }`}
          >
            {!task.completed && task.priority === 'high' && (
              <span
                className="text-rose-600 dark:text-rose-400 font-bold me-1.5 font-mono-nums tracking-tighter"
                title={PRIORITY_LABELS.high}
                aria-label="اولویت بالا"
              >
                !!!
              </span>
            )}
            {!task.completed && task.priority === 'medium' && (
              <span
                className="text-amber-600 dark:text-amber-400 font-bold me-1.5 font-mono-nums tracking-tighter"
                title={PRIORITY_LABELS.medium}
                aria-label="اولویت متوسط"
              >
                !!
              </span>
            )}
            <span>{task.title}</span>
          </p>

          {task.notes && (
            <p
              className={`text-xs mt-0.5 leading-relaxed break-words ${
                task.completed ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {task.notes}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
            <span className="font-medium text-zinc-600 dark:text-zinc-300">
              {subject?.name ?? 'عمومی'}
            </span>
            <span aria-hidden="true">·</span>
            <span>{PRIORITY_LABELS[task.priority]}</span>
            {task.reminderEnabled && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={`inline-flex items-center gap-1 font-mono-nums ${
                    task.completed
                      ? 'text-zinc-400 dark:text-zinc-500'
                      : 'text-rose-600 dark:text-rose-400 font-medium'
                  }`}
                >
                  <Bell className="w-3 h-3" aria-hidden="true" />
                  <span>{toPersianDigits(task.reminderTime)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0 opacity-80 lg:opacity-0 lg:group-hover:opacity-100 lg:group-focus-within:opacity-100 transition-opacity">
        <button
          type="button"
          onClick={() => onToggleReminder(task.id)}
          aria-label={
            task.reminderEnabled
              ? `خاموش کردن یادآور '${task.title}'`
              : `روشن کردن یادآور '${task.title}'`
          }
          title={task.reminderEnabled ? 'خاموش کردن یادآور' : 'روشن کردن یادآور'}
          className={`p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
            task.reminderEnabled
              ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/60'
              : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700'
          }`}
        >
          {task.reminderEnabled ? (
            <Bell className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <BellOff className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`ویرایش '${task.title}'`}
          title="ویرایش تکلیف"
          className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`حذف '${task.title}'`}
          title="انتقال به اخیراً حذف‌شده"
          className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
        >
          <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
