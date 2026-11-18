import { MoreHorizontal, SlidersHorizontal } from 'lucide-react';
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
  const [title, setTitle] = useState('');
  const [optionsOpen, setOptionsOpen] = useState(false);
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
    setOptionsOpen(false);
  };

  return (
    <section
      aria-label={`${day.persianWeekday} ${day.jalaliFormatted}`}
      data-testid={`day-section-${day.dateISO}`}
      className="flex flex-col min-w-0"
    >
      {/* Column Header matching MONTH / WEEK / TODAY layout */}
      <header className="flex items-start justify-between gap-2 pb-2.5 mb-2 border-b border-zinc-200/80 dark:border-zinc-800">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={`text-base font-bold tracking-tight truncate ${
                isToday ? 'text-rose-600 dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
              }`}
            >
              {day.persianWeekday}
            </h3>
            {isToday && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                امروز
              </span>
            )}
            {tasks.length > 0 && (
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums whitespace-nowrap">
                {toPersianDigits(completedCount)}/{toPersianDigits(tasks.length)}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 tabular-nums">
            <span>{day.jalaliFormatted}</span>
            <span aria-hidden="true">·</span>
            <span dir="ltr" className="font-mono-nums">
              {day.gregorianFormattedEn}
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={() => onOpenModalForDay(day.dateISO)}
          aria-label={`افزودن با جزئیات کامل برای ${day.persianWeekday}`}
          title="افزودن تکلیف با جزئیات کامل"
          className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      {/* Stacked rounded task cards */}
      <div className="space-y-2">
        {tasks.length === 0 && hasActiveFilters && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2 px-1">
            تکلیفی مطابق فیلترهای فعلی نیست.
          </p>
        )}

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

        {/* Blank quick-add slot at the bottom of every column matching reference screenshot */}
        <form onSubmit={handleQuickSubmit} className="space-y-2">
          <div className="flex items-center gap-2.5 rounded-xl px-3 py-2 bg-[#F2F2F7]/70 dark:bg-zinc-800/45 focus-within:bg-[#F2F2F7] dark:focus-within:bg-zinc-800 transition-colors">
            <span
              className="w-[18px] h-[18px] rounded-full border-2 border-zinc-300 dark:border-zinc-600 shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              value={title}
              onFocus={() => setOptionsOpen(true)}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder={`افزودن تکلیف برای ${day.persianWeekday}...`}
              aria-label={`افزودن سریع تکلیف برای ${day.persianWeekday}`}
              className="flex-1 min-w-0 bg-transparent text-xs sm:text-[13px] text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setOptionsOpen((prev) => !prev)}
              aria-expanded={optionsOpen}
              aria-label={`تنظیمات افزودن سریع برای ${day.persianWeekday}`}
              title="انتخاب درس، اولویت و یادآور"
              className="p-1 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors shrink-0"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {title.trim().length > 0 && (
              <button
                type="submit"
                className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 transition-colors whitespace-nowrap shrink-0"
              >
                ثبت
              </button>
            )}
          </div>

          {optionsOpen && (
            <div className="rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/70 p-2.5 space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-1.5">
                <select
                  value={subjectId}
                  onChange={(e) => setSubjectId(e.target.value)}
                  aria-label={`انتخاب درس برای ${day.persianWeekday}`}
                  className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
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
                  aria-label={`انتخاب اولویت برای ${day.persianWeekday}`}
                  className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                >
                  <option value="high">اولویت بالا</option>
                  <option value="medium">اولویت متوسط</option>
                  <option value="low">اولویت عادی</option>
                </select>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={reminderEnabled}
                      onChange={(e) => setReminderEnabled(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-600 text-rose-600 focus:ring-rose-500"
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
                      className="text-xs font-mono-nums bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    />
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setOptionsOpen(false);
                      setError('');
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 rounded-md"
                  >
                    بستن
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 text-white hover:bg-rose-700 rounded-md"
                  >
                    افزودن
                  </button>
                </div>
              </div>
              {error && <p className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
