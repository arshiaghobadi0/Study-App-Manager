import { MoreHorizontal, SlidersHorizontal } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import type { PriorityLevel, StudyTask, SubjectCategory } from '../types/study';
import type { WeekDayInfo } from '../utils/jalali';
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
    repeatAllWeek?: boolean;
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
  const [isFocused, setIsFocused] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 'math');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [repeatAllWeek, setRepeatAllWeek] = useState(false);
  const [error, setError] = useState('');

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
      repeatAllWeek,
      subjectId: subjectsById[subjectId] ? subjectId : subjects[0]?.id ?? 'math',
      priority,
      reminderEnabled,
      reminderTime,
    });
    setTitle('');
    setRepeatAllWeek(false);
    setError('');
    setOptionsOpen(false);
    setIsFocused(false);
  };

  return (
    <section
      aria-label={`${day.persianWeekday} ${day.jalaliFormatted}`}
      data-testid={`day-section-${day.dateISO}`}
      className="flex flex-col min-w-0"
    >
      {/* Clean minimal 1-line column header matching MONTH / WEEK / TODAY */}
      <header className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-zinc-100 dark:border-zinc-800/70">
        <div className="flex items-baseline gap-2 min-w-0">
          <h3
            className={`text-[15px] font-bold tracking-tight truncate ${
              isToday ? 'text-[#E14E43] dark:text-rose-400' : 'text-zinc-900 dark:text-zinc-100'
            }`}
          >
            {day.persianWeekday}
          </h3>
          <span className="text-[11.5px] text-zinc-400 dark:text-zinc-500 tabular-nums truncate">
            {day.jalaliFormatted.replace(/\s+\S+$/, '')}
          </span>
        </div>

        <button
          type="button"
          onClick={() => onOpenModalForDay(day.dateISO)}
          aria-label={`افزودن با جزئیات کامل برای ${day.persianWeekday}`}
          title={`افزودن با جزئیات برای ${day.persianWeekday}`}
          className="p-1 rounded-md text-zinc-300 dark:text-zinc-600 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
        </button>
      </header>

      {/* Stacked slim task rows */}
      <div className="space-y-2">
        {tasks.length === 0 && hasActiveFilters && (
          <p className="text-xs text-zinc-400 dark:text-zinc-500 py-2 px-1">
            تکلیفی یافت نشد.
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

        {/* Calm blank quick-add slot matching reference screenshot (whisper-quiet until focused) */}
        <form onSubmit={handleQuickSubmit} className="space-y-2">
          <div
            className={`group/slot flex items-center gap-2.5 rounded-[11px] px-3 py-2 transition-colors ${
              isFocused || title.length > 0 || optionsOpen
                ? 'bg-[#F0F0F5] dark:bg-zinc-800'
                : 'bg-[#F6F6F9]/80 hover:bg-[#F2F2F7] dark:bg-zinc-800/35 dark:hover:bg-zinc-800/60'
            }`}
          >
            <span
              className="w-[17px] h-[17px] rounded-full border-[1.5px] border-zinc-300/90 dark:border-zinc-600 shrink-0"
              aria-hidden="true"
            />
            <input
              type="text"
              value={title}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                if (!title.trim() && !optionsOpen) {
                  setIsFocused(false);
                }
              }}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder={isFocused ? `تکلیف جدید برای ${day.persianWeekday}...` : ''}
              aria-label={`افزودن سریع تکلیف برای ${day.persianWeekday}`}
              className="flex-1 min-w-0 bg-transparent text-[13px] text-zinc-800 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none"
            />

            {(isFocused || title.length > 0 || optionsOpen) && (
              <>
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
                    className="px-2.5 py-0.5 text-[11px] font-semibold rounded-md bg-[#E14E43] text-white hover:bg-[#CC3F35] transition-colors whitespace-nowrap shrink-0"
                  >
                    ثبت
                  </button>
                )}
              </>
            )}
          </div>

          {optionsOpen && (
            <div className="rounded-[12px] bg-[#F4F4F7] dark:bg-zinc-800/75 p-2.5 space-y-2 text-xs">
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

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                  <label className="inline-flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={repeatAllWeek}
                      onChange={(e) => setRepeatAllWeek(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-zinc-300 dark:border-zinc-600 text-rose-600 focus:ring-rose-500"
                    />
                    تمام روزهای هفته
                  </label>
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
                      setIsFocused(false);
                      setError('');
                    }}
                    className="px-2 py-1 text-[11px] font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 rounded-md"
                  >
                    بستن
                  </button>
                  <button
                    type="submit"
                    className="px-2.5 py-1 text-[11px] font-semibold bg-[#E14E43] text-white hover:bg-[#CC3F35] rounded-md"
                  >
                    {repeatAllWeek ? 'افزودن به کل هفته' : 'افزودن'}
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
