import { AlertCircle, ArrowUp, Bell, BellOff, Minus, Pencil, Trash2 } from 'lucide-react';
import type { PriorityLevel, StudyTask, SubjectCategory } from '../types/study';
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

function PriorityIndicator({ priority, completed }: { priority: PriorityLevel; completed: boolean }) {
  if (completed) {
    return (
      <span className="inline-flex items-center gap-1 text-slate-400">
        <Minus className="w-3 h-3" aria-hidden="true" />
        <span>{PRIORITY_LABELS[priority]}</span>
      </span>
    );
  }

  if (priority === 'high') {
    return (
      <span className="inline-flex items-center gap-1 text-rose-700 font-medium">
        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{PRIORITY_LABELS.high}</span>
      </span>
    );
  }

  if (priority === 'medium') {
    return (
      <span className="inline-flex items-center gap-1 text-amber-700 font-medium">
        <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
        <span>{PRIORITY_LABELS.medium}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-slate-600">
      <Minus className="w-3.5 h-3.5" aria-hidden="true" />
      <span>{PRIORITY_LABELS.low}</span>
    </span>
  );
}

export function TaskRow({
  task,
  subject,
  onToggleComplete,
  onToggleReminder,
  onEdit,
  onDelete,
}: TaskRowProps) {
  return (
    <div
      className={`group flex items-start justify-between gap-3 py-3 px-4 transition-colors hover:bg-slate-50/80 ${
        task.completed ? 'bg-slate-50/40' : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3 min-w-0 flex-1">
        <input
          type="checkbox"
          checked={task.completed}
          onChange={() => onToggleComplete(task.id)}
          aria-label={`تکمیل '${task.title}'`}
          className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 cursor-pointer shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p
            className={`text-sm leading-6 break-words ${
              task.completed ? 'line-through text-slate-400' : 'text-slate-900 font-medium'
            }`}
          >
            {task.title}
          </p>

          {task.notes && (
            <p className={`text-xs mt-0.5 break-words ${task.completed ? 'text-slate-400' : 'text-slate-500'}`}>
              {task.notes}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1.5 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
              <span
                className="w-2 h-2 rounded-xs shrink-0"
                style={{ backgroundColor: subject?.color ?? '#64748B' }}
                aria-hidden="true"
              />
              <span>{subject?.name ?? 'عمومی'}</span>
            </span>

            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>

            <PriorityIndicator priority={task.priority} completed={task.completed} />

            {task.reminderEnabled && (
              <>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span
                  className={`inline-flex items-center gap-1 font-mono-nums ${
                    task.completed ? 'text-slate-400' : 'text-blue-700'
                  }`}
                >
                  <Bell className="w-3 h-3" aria-hidden="true" />
                  <span>یادآور {toPersianDigits(task.reminderTime)}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onToggleReminder(task.id)}
          aria-label={
            task.reminderEnabled
              ? `خاموش کردن یادآور '${task.title}'`
              : `روشن کردن یادآور '${task.title}'`
          }
          title={task.reminderEnabled ? 'خاموش کردن یادآور' : 'روشن کردن یادآور'}
          className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            task.reminderEnabled
              ? 'text-blue-600 hover:bg-blue-50'
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
          }`}
        >
          {task.reminderEnabled ? (
            <Bell className="w-4 h-4" aria-hidden="true" />
          ) : (
            <BellOff className="w-4 h-4" aria-hidden="true" />
          )}
        </button>

        <button
          type="button"
          onClick={() => onEdit(task)}
          aria-label={`ویرایش '${task.title}'`}
          title="ویرایش تکلیف"
          className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
        >
          <Pencil className="w-4 h-4" aria-hidden="true" />
        </button>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          aria-label={`حذف '${task.title}'`}
          title="حذف تکلیف"
          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-600"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
