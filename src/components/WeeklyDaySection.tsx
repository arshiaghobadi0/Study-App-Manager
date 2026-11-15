import { Plus } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { PriorityLevel, StudyTask, SubjectCategory } from '../types/study';
import { toPersianDigits, type WeekDayInfo } from '../utils/jalali';
import { TaskRow } from './TaskRow';

interface WeeklyDaySectionProps {
  day: WeekDayInfo;
  isToday: boolean;
  tasks: StudyTask[];
  subjects: SubjectCategory[];
  subjectsById: Record<string, SubjectCategory>;
  hasActiveFilters: boolean;
  onQuickAdd: (payload: {
    title: string;
    dateISO: string;
    subjectId: string;
    priority: PriorityLevel;
    reminderEnabled: boolean;
    reminderTime: string;
  }) => void;
  onOpenModalForDay: (dateISO: string) => void;
  onToggleComplete: (taskId: string) => void;
  onToggleReminder: (taskId: string) => void;
  onEditTask: (task: StudyTask) => void;
  onDeleteTask: (taskId: string) => void;
}

export function WeeklyDaySection({
  day,
  isToday,
  tasks,
  subjects,
  subjectsById,
  hasActiveFilters,
  onQuickAdd,
  onOpenModalForDay,
  onToggleComplete,
  onToggleReminder,
  onEditTask,
  onDeleteTask,
}: WeeklyDaySectionProps) {
  const [quickOpen, setQuickOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 'math');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [error, setError] = useState('');

  const completedCount = tasks.filter((t) => t.completed).length;

  const handleQuickSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('لطفاً عنوان تکلیف را وارد کنید.');
      return;
    }
    onQuickAdd({
      title: trimmed,
      dateISO: day.dateISO,
      subjectId: subjectsById[subjectId] ? subjectId : subjects[0]?.id ?? 'math',
      priority,
      reminderEnabled,
      reminderTime,
    });
    setTitle('');
    setError('');
    setQuickOpen(false);
  };

  return (
    <section
      aria-label={`${day.persianWeekday} ${day.jalaliFormatted}`}
      data-testid={`day-section-${day.dateISO}`}
      className={`bg-white dark:bg-slate-900 border rounded-xl overflow-hidden ${
        isToday ? 'border-blue-300 dark:border-blue-700' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <header
        className={`flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b ${
          isToday
            ? 'bg-blue-50/50 dark:bg-blue-950/30 border-blue-200/80 dark:border-blue-900/70'
            : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{day.persianWeekday}</h3>
          {isToday && (
            <span className="text-xs font-semibold text-blue-700 dark:text-blue-400">امروز</span>
          )}
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            ·
          </span>
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 tabular-nums">
            {day.jalaliFormatted}
          </span>
          <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">
            /
          </span>
          <span dir="ltr" className="text-xs font-mono-nums text-slate-500 dark:text-slate-400">
            {day.gregorianFormattedEn}
          </span>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {tasks.length > 0 && (
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              {toPersianDigits(completedCount)} از {toPersianDigits(tasks.length)} انجام‌شده
            </span>
          )}

          <button
            type="button"
            onClick={() => {
              setQuickOpen((prev) => !prev);
              setError('');
            }}
            aria-expanded={quickOpen}
            aria-label={`افزودن سریع تکلیف برای ${day.persianWeekday}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/60 transition-colors whitespace-nowrap shrink-0"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            افزودن سریع
          </button>

          <button
            type="button"
            onClick={() => onOpenModalForDay(day.dateISO)}
            aria-label={`فرم کامل تکلیف برای ${day.persianWeekday}`}
            className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors whitespace-nowrap shrink-0"
          >
            جزئیات بیشتر
          </button>
        </div>
      </header>

      {quickOpen && (
        <form
          onSubmit={handleQuickSubmit}
          className="px-4 py-3 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 space-y-2.5"
        >
          <div className="flex flex-col md:flex-row gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder={`عنوان تکلیف برای ${day.persianWeekday}...`}
              aria-label={`عنوان تکلیف برای ${day.persianWeekday}`}
              className="flex-1 min-w-0 px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            />

            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              aria-label="انتخاب درس"
              className="px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as PriorityLevel)}
              aria-label="انتخاب اولویت"
              className="px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="high">اولویت بالا</option>
              <option value="medium">اولویت متوسط</option>
              <option value="low">اولویت عادی</option>
            </select>

            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5">
              <label className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer whitespace-nowrap">
                <input
                  type="checkbox"
                  checked={reminderEnabled}
                  onChange={(e) => setReminderEnabled(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-800 text-blue-600 focus:ring-blue-600"
                />
                یادآور
              </label>
              {reminderEnabled && (
                <input
                  type="time"
                  dir="ltr"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  aria-label="ساعت یادآور"
                  className="text-xs font-mono-nums bg-transparent text-slate-800 dark:text-slate-100 border-0 p-0 focus:outline-none focus:ring-0"
                />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="submit"
                className="px-4 py-2 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0"
              >
                ثبت
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickOpen(false);
                  setError('');
                }}
                className="px-3 py-2 text-xs font-medium rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-700/70 transition-colors whitespace-nowrap shrink-0"
              >
                انصراف
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>}
        </form>
      )}

      {tasks.length === 0 ? (
        <div className="px-4 py-4 text-xs text-slate-400 dark:text-slate-500 flex items-center justify-between">
          <span>
            {hasActiveFilters
              ? 'تکلیفی مطابق فیلترهای فعلی در این روز وجود ندارد.'
              : 'هنوز تکلیفی برای این روز ثبت نشده است.'}
          </span>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              subject={subjectsById[task.subjectId]}
              onToggleComplete={onToggleComplete}
              onToggleReminder={onToggleReminder}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
            />
          ))}
        </div>
      )}
    </section>
  );
}
