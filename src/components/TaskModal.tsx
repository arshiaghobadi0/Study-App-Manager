import { Calendar, X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import type { PriorityLevel, StudyTask, SubjectCategory } from '../types/study';
import {
  formatGregorianEnShort,
  formatJalaliLong,
  getPersianWeekdayIndex,
  isoToJalali,
  jalaliMonthLength,
  jalaliToISO,
  parseDateISO,
  PERSIAN_MONTH_NAMES,
  PERSIAN_WEEKDAYS,
  toPersianDigits,
} from '../utils/jalali';

interface TaskModalProps {
  isOpen: boolean;
  initialDateISO: string;
  editingTask: StudyTask | null;
  subjects: SubjectCategory[];
  onClose: () => void;
  onSave: (payload: {
    id?: string;
    title: string;
    notes: string;
    dateISO: string;
    subjectId: string;
    priority: PriorityLevel;
    reminderEnabled: boolean;
    reminderTime: string;
  }) => void;
}

export function TaskModal({
  isOpen,
  initialDateISO,
  editingTask,
  subjects,
  onClose,
  onSave,
}: TaskModalProps) {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [dateISO, setDateISO] = useState(initialDateISO);
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? 'math');
  const [priority, setPriority] = useState<PriorityLevel>('medium');
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      setTitle(editingTask.title);
      setNotes(editingTask.notes ?? '');
      setDateISO(editingTask.dateISO);
      setSubjectId(editingTask.subjectId);
      setPriority(editingTask.priority);
      setReminderEnabled(editingTask.reminderEnabled);
      setReminderTime(editingTask.reminderTime || '18:00');
    } else {
      setTitle('');
      setNotes('');
      setDateISO(initialDateISO);
      setSubjectId(subjects[0]?.id ?? 'math');
      setPriority('medium');
      setReminderEnabled(true);
      setReminderTime('18:00');
    }
    setError('');
  }, [isOpen, editingTask, initialDateISO, subjects]);

  if (!isOpen) return null;

  const jalali = isoToJalali(dateISO);
  const gregorian = parseDateISO(dateISO);
  const weekdayName = PERSIAN_WEEKDAYS[getPersianWeekdayIndex(dateISO)];
  const maxJalaliDay = jalaliMonthLength(jalali.jy, jalali.jm);
  const jalaliYears = [jalali.jy - 1, jalali.jy, jalali.jy + 1, jalali.jy + 2].filter(
    (y, idx, arr) => arr.indexOf(y) === idx && y >= 1400 && y <= 1420,
  );

  const handleJalaliChange = (nextJy: number, nextJm: number, nextJd: number) => {
    const maxDay = jalaliMonthLength(nextJy, nextJm);
    const clampedDay = Math.min(nextJd, maxDay);
    setDateISO(jalaliToISO(nextJy, nextJm, clampedDay));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      setError('وارد کردن عنوان تکلیف الزامی است.');
      return;
    }
    onSave({
      id: editingTask?.id,
      title: trimmed,
      notes: notes.trim(),
      dateISO,
      subjectId,
      priority,
      reminderEnabled,
      reminderTime: reminderTime || '18:00',
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 dark:bg-black/70 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
    >
      <div className="bg-white dark:bg-[#1C1C1E] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 dark:border-zinc-800">
          <h2 id="task-modal-title" className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {editingTask ? 'ویرایش تکلیف درسی' : 'افزودن تکلیف درسی جدید'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن پنجره"
            className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label htmlFor="task-title" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              عنوان تکلیف
            </label>
            <input
              id="task-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (error) setError('');
              }}
              placeholder="مثال: حل تمرین‌های فصل سوم ریاضی"
              className="w-full px-3 py-2 text-sm bg-[#F4F4F6] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent"
            />
            {error && <p className="text-xs text-rose-600 dark:text-rose-400 mt-1">{error}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-subject" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
                دسته‌بندی موضوعی (درس)
              </label>
              <select
                id="task-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#F4F4F6] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {subjects.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">اولویت تکلیف</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-[#F4F4F6] dark:bg-zinc-800 rounded-xl">
                {(
                  [
                    { value: 'high', label: 'بالا' },
                    { value: 'medium', label: 'متوسط' },
                    { value: 'low', label: 'عادی' },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPriority(item.value)}
                    className={`py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
                      priority === item.value
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 space-y-3 bg-[#F4F4F6]/70 dark:bg-zinc-800/40">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                <Calendar className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                <span>تنظیم همزمان تاریخ شمسی و میلادی</span>
              </div>
              <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                {weekdayName} · {formatJalaliLong(jalali)} / {formatGregorianEnShort(gregorian)}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <span className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">تاریخ شمسی</span>
                <div className="grid grid-cols-3 gap-1.5">
                  <select
                    aria-label="روز شمسی"
                    value={jalali.jd}
                    onChange={(e) => handleJalaliChange(jalali.jy, jalali.jm, Number(e.target.value))}
                    className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {Array.from({ length: maxJalaliDay }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        {toPersianDigits(d)}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="ماه شمسی"
                    value={jalali.jm}
                    onChange={(e) => handleJalaliChange(jalali.jy, Number(e.target.value), jalali.jd)}
                    className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {PERSIAN_MONTH_NAMES.map((mName, idx) => (
                      <option key={mName} value={idx + 1}>
                        {mName}
                      </option>
                    ))}
                  </select>

                  <select
                    aria-label="سال شمسی"
                    value={jalali.jy}
                    onChange={(e) => handleJalaliChange(Number(e.target.value), jalali.jm, jalali.jd)}
                    className="px-2 py-1.5 text-xs bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg tabular-nums focus:outline-none focus:ring-2 focus:ring-rose-500"
                  >
                    {jalaliYears.map((y) => (
                      <option key={y} value={y}>
                        {toPersianDigits(y)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="task-gregorian-date" className="block text-xs text-zinc-500 dark:text-zinc-400 mb-1">
                  تاریخ میلادی
                </label>
                <input
                  id="task-gregorian-date"
                  type="date"
                  dir="ltr"
                  value={dateISO}
                  onChange={(e) => {
                    if (e.target.value) setDateISO(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-mono-nums bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
                />
              </div>
            </div>
          </div>

          <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200 cursor-pointer">
              <input
                type="checkbox"
                checked={reminderEnabled}
                onChange={(e) => setReminderEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800 text-rose-600 focus:ring-rose-500"
              />
              فعال‌سازی یادآور برای این مورد
            </label>

            <div className="flex items-center gap-2">
              <label htmlFor="task-reminder-time" className="text-xs text-zinc-500 dark:text-zinc-400">
                ساعت یادآور:
              </label>
              <input
                id="task-reminder-time"
                type="time"
                dir="ltr"
                disabled={!reminderEnabled}
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-mono-nums bg-[#F4F4F6] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-lg disabled:bg-zinc-100 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="task-notes" className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              یادداشت یا شماره صفحات (اختیاری)
            </label>
            <textarea
              id="task-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="مثال: صفحات ۴۲ تا ۴۸ کتاب درسی"
              className="w-full px-3 py-2 text-sm bg-[#F4F4F6] dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-rose-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
            >
              انصراف
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
            >
              {editingTask ? 'ذخیره تغییرات' : 'ثبت تکلیف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
