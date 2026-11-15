import { Bell, ChevronLeft, ChevronRight, Plus, Printer, RotateCcw, Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { PrintableWeekSheet } from './components/PrintableWeekSheet';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { ReminderBanner } from './components/ReminderBanner';
import { SubjectModal } from './components/SubjectModal';
import { TaskModal } from './components/TaskModal';
import { WeeklyDaySection } from './components/WeeklyDaySection';
import type { PriorityLevel, StudyTask, SubjectCategory, TaskFilterState } from './types/study';
import {
  formatGregorianEnShort,
  formatJalaliLong,
  formatWeekSpanSummary,
  getTodayISO,
  getWeekDays,
  isoToJalali,
  parseDateISO,
  toPersianDigits,
} from './utils/jalali';
import { buildPrintableWeekData, type PrintScheduleOptions } from './utils/printSchedule';
import { playReminderChime } from './utils/sound';
import { loadSubjects, loadTasks, saveSubjects, saveTasks } from './utils/storage';
import {
  computeSnoozeUntilISO,
  computeWeeklyStats,
  filterTasks,
  getDueReminderTasks,
  sortTasksForDay,
} from './utils/tasks';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [tasks, setTasks] = useState<StudyTask[]>(() => loadTasks());
  const [subjects, setSubjects] = useState<SubjectCategory[]>(() => loadSubjects());
  const [weekOffset, setWeekOffset] = useState(0);
  const [filters, setFilters] = useState<TaskFilterState>({
    subjectId: 'all',
    priority: 'all',
    completion: 'all',
    search: '',
  });

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [modalInitialDateISO, setModalInitialDateISO] = useState(() => getTodayISO());
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintScheduleOptions>({
    includeCompleted: true,
    includeNotes: true,
  });

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });

  const announcedIdsRef = useRef<Set<string>>(new Set());
  const userInteractedRef = useRef(false);

  useEffect(() => {
    const markInteracted = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener('pointerdown', markInteracted, { once: true });
    window.addEventListener('keydown', markInteracted, { once: true });
    return () => {
      window.removeEventListener('pointerdown', markInteracted);
      window.removeEventListener('keydown', markInteracted);
    };
  }, []);

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  useEffect(() => {
    saveSubjects(subjects);
  }, [subjects]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 10_000);
    return () => window.clearInterval(timer);
  }, []);

  const todayISO = getTodayISO();
  const todayJalali = isoToJalali(todayISO);
  const todayGregorian = parseDateISO(todayISO);

  const weekDays = useMemo(() => getWeekDays(weekOffset, todayISO), [weekOffset, todayISO]);
  const weekDateISOs = useMemo(() => weekDays.map((d) => d.dateISO), [weekDays]);
  const weekSpan = useMemo(() => formatWeekSpanSummary(weekDays), [weekDays]);

  const subjectsById = useMemo(() => {
    const map: Record<string, SubjectCategory> = {};
    for (const s of subjects) {
      map[s.id] = s;
    }
    return map;
  }, [subjects]);

  const dueReminders = useMemo(() => getDueReminderTasks(tasks, nowMs), [tasks, nowMs]);

  useEffect(() => {
    for (const task of dueReminders) {
      const key = `${task.id}:${task.reminderTime}:${task.snoozedUntilISO ?? ''}`;
      if (!announcedIdsRef.current.has(key)) {
        announcedIdsRef.current.add(key);
        if (userInteractedRef.current) {
          playReminderChime();
        }
        if (notificationPermission === 'granted' && typeof window !== 'undefined' && 'Notification' in window) {
          const subjectName = subjectsById[task.subjectId]?.name ?? 'تکلیف درسی';
          try {
            new window.Notification(`یادآور مطالعه: ${task.title}`, {
              body: `${subjectName} · ساعت ${toPersianDigits(task.reminderTime)}`,
            });
          } catch {
            // ignore notification errors
          }
        }
      }
    }
  }, [dueReminders, notificationPermission, subjectsById]);

  const weeklyStats = useMemo(() => computeWeeklyStats(tasks, weekDateISOs), [tasks, weekDateISOs]);
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);

  const hasActiveFilters =
    filters.subjectId !== 'all' ||
    filters.priority !== 'all' ||
    filters.completion !== 'all' ||
    filters.search.trim().length > 0;

  const tasksByDate = useMemo(() => {
    const grouped: Record<string, StudyTask[]> = {};
    for (const iso of weekDateISOs) {
      grouped[iso] = [];
    }
    for (const task of filteredTasks) {
      if (grouped[task.dateISO]) {
        grouped[task.dateISO].push(task);
      }
    }
    for (const iso of weekDateISOs) {
      grouped[iso] = sortTasksForDay(grouped[iso]);
    }
    return grouped;
  }, [filteredTasks, weekDateISOs]);

  const totalMatchingInWeek = useMemo(
    () => weekDateISOs.reduce((sum, iso) => sum + (tasksByDate[iso]?.length ?? 0), 0),
    [weekDateISOs, tasksByDate],
  );

  const printableData = useMemo(
    () => buildPrintableWeekData(weekDays, tasks, subjectsById, printOptions),
    [weekDays, tasks, subjectsById, printOptions],
  );

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleRequestNotification = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    try {
      const result = await window.Notification.requestPermission();
      setNotificationPermission(result);
    } catch {
      // ignore
    }
  };

  const handleOpenNewModal = (dateISO: string = todayISO) => {
    setEditingTask(null);
    setModalInitialDateISO(dateISO);
    setTaskModalOpen(true);
  };

  const handleEditTask = (task: StudyTask) => {
    setEditingTask(task);
    setModalInitialDateISO(task.dateISO);
    setTaskModalOpen(true);
  };

  const handleSaveTask = (payload: {
    id?: string;
    title: string;
    notes: string;
    dateISO: string;
    subjectId: string;
    priority: PriorityLevel;
    reminderEnabled: boolean;
    reminderTime: string;
  }) => {
    if (payload.id) {
      setTasks((prev) =>
        prev.map((t) =>
          t.id === payload.id
            ? {
                ...t,
                title: payload.title,
                notes: payload.notes || undefined,
                dateISO: payload.dateISO,
                subjectId: payload.subjectId,
                priority: payload.priority,
                reminderEnabled: payload.reminderEnabled,
                reminderTime: payload.reminderTime,
                reminderDismissedAt: undefined,
                snoozedUntilISO: undefined,
              }
            : t,
        ),
      );
    } else {
      const created: StudyTask = {
        id: generateId('task'),
        title: payload.title,
        notes: payload.notes || undefined,
        dateISO: payload.dateISO,
        subjectId: payload.subjectId,
        priority: payload.priority,
        completed: false,
        reminderEnabled: payload.reminderEnabled,
        reminderTime: payload.reminderTime,
        createdAt: new Date().toISOString(),
      };
      setTasks((prev) => [...prev, created]);
    }
  };

  const handleQuickAdd = (payload: {
    title: string;
    dateISO: string;
    subjectId: string;
    priority: PriorityLevel;
    reminderEnabled: boolean;
    reminderTime: string;
  }) => {
    const created: StudyTask = {
      id: generateId('task'),
      title: payload.title,
      dateISO: payload.dateISO,
      subjectId: payload.subjectId,
      priority: payload.priority,
      completed: false,
      reminderEnabled: payload.reminderEnabled,
      reminderTime: payload.reminderTime,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [...prev, created]);
  };

  const handleToggleComplete = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              completed: !t.completed,
              reminderDismissedAt: !t.completed ? new Date().toISOString() : undefined,
            }
          : t,
      ),
    );
  };

  const handleToggleReminder = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              reminderEnabled: !t.reminderEnabled,
              reminderDismissedAt: undefined,
              snoozedUntilISO: undefined,
            }
          : t,
      ),
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleSnoozeReminder = (taskId: string, minutes: number) => {
    const until = computeSnoozeUntilISO(minutes);
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, snoozedUntilISO: until } : t)),
    );
  };

  const handleDismissReminder = (taskId: string) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, reminderDismissedAt: new Date().toISOString() } : t,
      ),
    );
  };

  const handleAddSubject = (name: string, color: string) => {
    const created: SubjectCategory = {
      id: generateId('sub'),
      name,
      color,
    };
    setSubjects((prev) => [...prev, created]);
  };

  const handleDeleteSubject = (subjectId: string) => {
    if (subjects.length <= 1) return;
    const remaining = subjects.filter((s) => s.id !== subjectId);
    const fallbackId = remaining[0].id;
    setSubjects(remaining);
    setTasks((prev) =>
      prev.map((t) => (t.subjectId === subjectId ? { ...t, subjectId: fallbackId } : t)),
    );
    if (filters.subjectId === subjectId) {
      setFilters((prev) => ({ ...prev, subjectId: 'all' }));
    }
  };

  const resetFilters = () => {
    setFilters({
      subjectId: 'all',
      priority: 'all',
      completion: 'all',
      search: '',
    });
  };

  return (
    <>
      <div className="min-h-screen bg-slate-50 text-slate-900 print:hidden">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            برنامه‌ریز درسی هفتگی
          </a>

          <nav aria-label="ناوبری هفته" className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w - 1)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              هفته قبل
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset(0)}
              className={`transition-colors whitespace-nowrap shrink-0 ${
                weekOffset === 0 ? 'text-blue-700 font-semibold' : 'hover:text-slate-900'
              }`}
            >
              هفته جاری
            </button>
            <button
              type="button"
              onClick={() => setWeekOffset((w) => w + 1)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              هفته بعد
            </button>
            <button
              type="button"
              onClick={() => setSubjectModalOpen(true)}
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              مدیریت درس‌ها
            </button>
          </nav>

          <button
            type="button"
            onClick={() => handleOpenNewModal(todayISO)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            افزودن تکلیف
          </button>
        </div>
      </header>

      <main id="top" className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <section aria-label="خلاصه هفته و تاریخ" className="bg-white border border-slate-200 rounded-xl p-5 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tabular-nums">
                  {weekSpan.jalaliSpan}
                </h1>
                <span aria-hidden="true" className="text-slate-300">
                  /
                </span>
                <span dir="ltr" className="text-sm font-mono-nums text-slate-500">
                  {weekSpan.gregorianSpan}
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span>امروز: {formatJalaliLong(todayJalali)}</span>
                <span aria-hidden="true">·</span>
                <span dir="ltr" className="font-mono-nums">
                  {formatGregorianEnShort(todayGregorian)}
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg md:hidden">
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w - 1)}
                  aria-label="هفته قبل"
                  className="p-1.5 text-slate-700 hover:bg-white rounded-md transition-colors"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset(0)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-800 hover:bg-white rounded-md transition-colors whitespace-nowrap"
                >
                  هفته جاری
                </button>
                <button
                  type="button"
                  onClick={() => setWeekOffset((w) => w + 1)}
                  aria-label="هفته بعد"
                  className="p-1.5 text-slate-700 hover:bg-white rounded-md transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setSubjectModalOpen(true)}
                className="md:hidden px-3 py-1.5 text-xs font-medium bg-white border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 whitespace-nowrap"
              >
                مدیریت درس‌ها
              </button>

              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border bg-white border-slate-300 text-slate-700 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                چاپ / ذخیره PDF
              </button>

              {notificationPermission !== 'unsupported' && (
                <button
                  type="button"
                  onClick={handleRequestNotification}
                  disabled={notificationPermission === 'granted'}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    notificationPermission === 'granted'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 cursor-default'
                      : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                  {notificationPermission === 'granted' ? 'اعلان مرورگر فعال است' : 'فعال‌سازی اعلان مرورگر'}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 border-t border-slate-200 pt-4">
            <div className="border-b border-l sm:border-b-0 border-slate-200 pb-3 pl-4 sm:py-0">
              <p className="text-xs text-slate-500">کل تکالیف هفته</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                {toPersianDigits(weeklyStats.total)}
              </p>
            </div>
            <div className="border-b sm:border-b-0 sm:border-l border-slate-200 pb-3 pr-4 sm:py-0 sm:px-4">
              <p className="text-xs text-slate-500">تکمیل‌شده</p>
              <p className="text-2xl font-bold text-emerald-700 tabular-nums mt-0.5">
                {toPersianDigits(weeklyStats.completed)}
              </p>
            </div>
            <div className="border-l border-slate-200 pt-3 pl-4 sm:py-0 sm:px-4">
              <p className="text-xs text-slate-500">باقی‌مانده</p>
              <p className="text-2xl font-bold text-slate-900 tabular-nums mt-0.5">
                {toPersianDigits(weeklyStats.pending)}
              </p>
            </div>
            <div className="pt-3 pr-4 sm:py-0 sm:pr-4">
              <p className="text-xs text-slate-500">یادآورهای فعال</p>
              <p className="text-2xl font-bold text-blue-700 tabular-nums mt-0.5">
                {toPersianDigits(weeklyStats.activeReminders)}
              </p>
            </div>
          </div>
        </section>

        <ReminderBanner
          dueTasks={dueReminders}
          subjectsById={subjectsById}
          onComplete={handleToggleComplete}
          onSnooze={handleSnoozeReminder}
          onDismiss={handleDismissReminder}
        />

        <section aria-label="فیلتر و جستجو" className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search
                className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                placeholder="جستجو در عنوان یا یادداشت تکالیف..."
                aria-label="جستجو در تکالیف"
                className="w-full pr-9 pl-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
              />
            </div>

            <select
              value={filters.subjectId}
              onChange={(e) => setFilters((prev) => ({ ...prev, subjectId: e.target.value }))}
              aria-label="فیلتر بر اساس درس"
              className="lg:max-w-[170px] truncate px-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="all">همه درس‌ها</option>
              {subjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0" role="group" aria-label="فیلتر اولویت">
              {(
                [
                  { value: 'all', label: 'همه اولویت‌ها' },
                  { value: 'high', label: 'بالا' },
                  { value: 'medium', label: 'متوسط' },
                  { value: 'low', label: 'عادی' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, priority: item.value }))}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filters.priority === item.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg shrink-0" role="group" aria-label="فیلتر وضعیت">
              {(
                [
                  { value: 'all', label: 'همه' },
                  { value: 'pending', label: 'باقی‌مانده' },
                  { value: 'completed', label: 'انجام‌شده' },
                ] as const
              ).map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, completion: item.value }))}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    filters.completion === item.value
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                پاک کردن فیلترها
              </button>
            )}
          </div>
        </section>

        {hasActiveFilters && totalMatchingInWeek === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-slate-700">
              در این هفته هیچ تکلیفی مطابق فیلترهای انتخاب‌شده یافت نشد.
            </p>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              نمایش همه تکالیف هفته
            </button>
          </div>
        ) : (
          <div className="space-y-4" data-testid="weekly-list">
            {weekDays.map((day) => (
              <WeeklyDaySection
                key={day.dateISO}
                day={day}
                isToday={day.dateISO === todayISO}
                tasks={tasksByDate[day.dateISO] ?? []}
                subjects={subjects}
                subjectsById={subjectsById}
                hasActiveFilters={hasActiveFilters}
                onQuickAdd={handleQuickAdd}
                onOpenModalForDay={(iso) => handleOpenNewModal(iso)}
                onToggleComplete={handleToggleComplete}
                onToggleReminder={handleToggleReminder}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      <TaskModal
        isOpen={taskModalOpen}
        initialDateISO={modalInitialDateISO}
        editingTask={editingTask}
        subjects={subjects}
        onClose={() => setTaskModalOpen(false)}
        onSave={handleSaveTask}
      />

      <SubjectModal
        isOpen={subjectModalOpen}
        subjects={subjects}
        onClose={() => setSubjectModalOpen(false)}
        onAddSubject={handleAddSubject}
        onDeleteSubject={handleDeleteSubject}
      />

      <PrintScheduleModal
        isOpen={printModalOpen}
        options={printOptions}
        data={printableData}
        onChangeOptions={setPrintOptions}
        onClose={() => setPrintModalOpen(false)}
        onTriggerPrint={handleTriggerPrint}
      />
      </div>

      <div className="hidden print:block bg-white" data-testid="printable-schedule-root">
        <PrintableWeekSheet data={printableData} />
      </div>
    </>
  );
}
