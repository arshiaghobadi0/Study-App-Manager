import { Bell, BellOff, Check, Pencil, Trash2 } from 'lucide-react';
import type { StudyTask, SubjectCategory } from '../types/study';
import { toPersianDigits } from '../utils/jalali';
import type { DensityMode } from '../utils/settings';
import { PRIORITY_LABELS } from '../utils/tasks';

interface TaskRowProps {
  task: StudyTask;
  subject?: SubjectCategory;
  density?: DensityMode;
  showNotes?: boolean;
  onToggleComplete: (taskId: string) => void;
  onToggleReminder: (taskId: string) => void;
  onEdit: (task: StudyTask) => void;
  onDelete: (taskId: string) => void;
}

export function TaskRow({
  task,
  subject,
  density = 'airy',
  showNotes = true,
  onToggleComplete,
  onToggleReminder,
  onEdit,
  onDelete,
}: TaskRowProps) {
  const accentColor = subject?.color ?? 'var(--accent)';
  const isCompact = density === 'compact';

  return (
    <div
      className={`group relative rounded-[11px] transition-all duration-200 ease-smooth anim-task-enter ${
        isCompact ? 'px-2.5 py-1.5' : 'px-3 py-2.5'
      } ${
        task.completed
          ? 'bg-[#F5F5F8]/60 dark:bg-zinc-800/35'
          : 'bg-[#F4F4F8] hover:bg-[#ECECF2] dark:bg-zinc-800/65 dark:hover:bg-zinc-800/95'
      }`}
    >
      {/* Full-width slim row: text gets 100% width with no permanent empty gap */}
      <div className="flex items-start gap-2.5 min-w-0">
        <button
          type="button"
          role="checkbox"
          aria-checked={task.completed}
          aria-label={`تکمیل '${task.title}'`}
          onClick={() => onToggleComplete(task.id)}
          className={`mt-[2px] w-[17px] h-[17px] rounded-full border-[1.5px] inline-flex items-center justify-center transition-all duration-200 ease-spring active:scale-90 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-rose-500 ${
            task.completed
              ? 'border-transparent text-white anim-check-pop'
              : 'border-zinc-300 dark:border-zinc-500 bg-transparent hover:border-zinc-500 dark:hover:border-zinc-300 hover:scale-105'
          }`}
          style={
            task.completed
              ? { backgroundColor: accentColor, borderColor: accentColor }
              : undefined
          }
        >
          {task.completed && <Check className="w-2.5 h-2.5 stroke-[3]" aria-hidden="true" />}
        </button>

        <div className="min-w-0 flex-1">
          <p
            className={`${isCompact ? 'text-[13px]' : 'text-[13.5px]'} leading-[1.45] break-words transition-colors duration-200 ${
              task.completed
                ? 'line-through text-zinc-400 dark:text-zinc-500'
                : 'text-zinc-800 dark:text-zinc-100 font-normal'
            }`}
          >
            {!task.completed && task.priority === 'high' && (
              <span
                className="text-[#DC4C41] dark:text-rose-400 font-bold me-1.5 font-mono-nums tracking-tighter"
                title={PRIORITY_LABELS.high}
                aria-label="اولویت بالا"
              >
                !!!
              </span>
            )}
            {!task.completed && task.priority === 'medium' && (
              <span
                className="text-[#E08A2E] dark:text-amber-400 font-bold me-1.5 font-mono-nums tracking-tighter"
                title={PRIORITY_LABELS.medium}
                aria-label="اولویت متوسط"
              >
                !!
              </span>
            )}
            <span>{task.title}</span>
          </p>

          {showNotes && task.notes && (
            <p
              className={`text-[11.5px] mt-0.5 leading-snug line-clamp-1 transition-colors duration-200 ${
                task.completed ? 'text-zinc-400/80 dark:text-zinc-500' : 'text-zinc-400 dark:text-zinc-400'
              }`}
            >
              {task.notes}
            </p>
          )}

          <div className="flex items-center justify-between gap-2 mt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 min-w-0">
              {subject && (
                <span className="inline-flex items-center gap-1 truncate">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0 opacity-80"
                    style={{ backgroundColor: subject.color }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{subject.name}</span>
                </span>
              )}
              {subject && task.reminderEnabled && <span aria-hidden="true">·</span>}
              {task.reminderEnabled && (
                <span className="font-mono-nums shrink-0">{toPersianDigits(task.reminderTime)}</span>
              )}
            </div>

            {/* Inline on mobile (zero overlap with title); floating hover overlay on desktop */}
            <div className="flex items-center gap-0.5 shrink-0 lg:absolute lg:left-1.5 lg:top-1.5 lg:px-1 lg:py-0.5 lg:rounded-lg lg:bg-[#ECECF2]/95 dark:lg:bg-zinc-800/95 lg:backdrop-blur-xs lg:opacity-0 lg:pointer-events-none lg:group-hover:opacity-100 lg:group-hover:pointer-events-auto lg:group-focus-within:opacity-100 lg:group-focus-within:pointer-events-auto transition-opacity duration-150">
              <button
                type="button"
                onClick={() => onToggleReminder(task.id)}
                aria-label={
                  task.reminderEnabled
                    ? `خاموش کردن یادآور '${task.title}'`
                    : `روشن کردن یادآور '${task.title}'`
                }
                title={task.reminderEnabled ? 'خاموش کردن یادآور' : 'روشن کردن یادآور'}
                className={`p-1 rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
                  task.reminderEnabled
                    ? 'text-rose-500 dark:text-rose-400 hover:bg-white/80 dark:hover:bg-zinc-700'
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-white/80 dark:hover:bg-zinc-700'
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
                className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-white/80 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
              >
                <Pencil className="w-3.5 h-3.5" aria-hidden="true" />
              </button>

              <button
                type="button"
                onClick={() => onDelete(task.id)}
                aria-label={`حذف '${task.title}'`}
                title="انتقال به اخیراً حذف‌شده"
                className="p-1 rounded-md text-zinc-400 dark:text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-white/80 dark:hover:bg-zinc-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
