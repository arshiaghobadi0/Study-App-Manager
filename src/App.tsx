import {
  Bell,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Download,
  Menu,
  PanelRightOpen,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ConfirmDeleteAllModal } from './components/ConfirmDeleteAllModal';
import { ImportBackupModal } from './components/ImportBackupModal';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PlannerSidebar, type WorkspaceViewMode } from './components/PlannerSidebar';
import { PrintableWeekSheet } from './components/PrintableWeekSheet';
import { PrintScheduleModal } from './components/PrintScheduleModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReminderBanner } from './components/ReminderBanner';
import { SubjectModal } from './components/SubjectModal';
import { TaskModal } from './components/TaskModal';
import { WeeklyDaySection } from './components/WeeklyDaySection';
import { WeeklyProgressChart } from './components/WeeklyProgressChart';
import type { PriorityLevel, StudyTask, SubjectCategory, TaskFilterState } from './types/study';
import { buildWeeklyProgressSeries } from './utils/analytics';
import {
  applyImportedBackup,
  buildBackupFilename,
  createBackupPayload,
  downloadJsonFile,
  serializeBackupJson,
  type ImportMode,
  type ParsedBackupData,
} from './utils/backup';
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
import { exportSchedulePdfFile } from './utils/pdfExport';
import { buildPrintableWeekData, type PrintScheduleOptions } from './utils/printSchedule';
import { playReminderChime } from './utils/sound';
import { loadSubjects, loadTasks, loadTrash, saveSubjects, saveTasks, saveTrash } from './utils/storage';
import {
  computeSidebarCounts,
  computeSnoozeUntilISO,
  computeWeeklyStats,
  expandTaskDatesForWeek,
  filterTasks,
  getDueReminderTasks,
  removeTasksByScope,
  sortTasksForDay,
} from './utils/tasks';
import {
  applyThemeToDocument,
  getNextTheme,
  loadTheme,
  saveTheme,
  type ThemeMode,
} from './utils/theme';

function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function App() {
  const [tasks, setTasks] = useState<StudyTask[]>(() => loadTasks());
  const [trashTasks, setTrashTasks] = useState<StudyTask[]>(() => loadTrash());
  const [subjects, setSubjects] = useState<SubjectCategory[]>(() => loadSubjects());
  const [weekOffset, setWeekOffset] = useState(0);
  const [filters, setFilters] = useState<TaskFilterState>({
    subjectId: 'all',
    priority: 'all',
    completion: 'all',
    search: '',
  });
  const [viewMode, setViewMode] = useState<WorkspaceViewMode>('board');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [modalInitialDateISO, setModalInitialDateISO] = useState(() => getTodayISO());
  const [editingTask, setEditingTask] = useState<StudyTask | null>(null);
  const [subjectModalOpen, setSubjectModalOpen] = useState(false);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [deleteAllModalOpen, setDeleteAllModalOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintScheduleOptions>({
    includeCompleted: true,
    includeNotes: true,
  });
  const [theme, setTheme] = useState<ThemeMode>(() => loadTheme());
  const [backupFeedback, setBackupFeedback] = useState<string | null>(null);

  const [nowMs, setNowMs] = useState(() => Date.now());
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return 'unsupported';
    }
    return window.Notification.permission;
  });

  const announcedIdsRef = useRef<Set<string>>(new Set());
  const userInteractedRef = useRef(false);
  const backupTimerRef = useRef<number | null>(null);

  useEffect(() => {
    applyThemeToDocument(theme);
    saveTheme(theme);
  }, [theme]);

  useEffect(() => {
    return () => {
      if (backupTimerRef.current !== null) {
        window.clearTimeout(backupTimerRef.current);
      }
    };
  }, []);

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
    saveTrash(trashTasks);
  }, [trashTasks]);

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
  const sidebarCounts = useMemo(
    () => computeSidebarCounts(tasks, weekDateISOs, todayISO),
    [tasks, weekDateISOs, todayISO],
  );
  const weeklyProgressSummary = useMemo(
    () => buildWeeklyProgressSeries(weekDays, tasks),
    [weekDays, tasks],
  );
  const filteredTasks = useMemo(() => filterTasks(tasks, filters), [tasks, filters]);

  const hasActiveFilters =
    filters.subjectId !== 'all' ||
    filters.priority !== 'all' ||
    filters.completion !== 'all' ||
    Boolean(filters.dateISO) ||
    Boolean(filters.onlyReminders) ||
    filters.search.trim().length > 0;

  const visibleWeekDays = useMemo(() => {
    if (filters.dateISO) {
      const matching = weekDays.filter((d) => d.dateISO === filters.dateISO);
      if (matching.length > 0) return matching;
    }
    return weekDays;
  }, [weekDays, filters.dateISO]);

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

  const boardHeading = useMemo(() => {
    if (viewMode === 'trash') return 'اخیراً حذف‌شده';
    if (filters.onlyReminders) return 'یادآورهای فعال';
    if (filters.dateISO === todayISO) return 'تکالیف امروز';
    if (filters.subjectId !== 'all') {
      return subjectsById[filters.subjectId]?.name ?? 'برنامه درسی';
    }
    if (filters.completion === 'completed') return 'تکمیل‌شده‌های هفته';
    if (filters.priority === 'high') return 'تکالیف فوری و اولویت بالا';
    if (filters.priority === 'medium') return 'تکالیف اولویت متوسط';
    if (filters.priority === 'low') return 'تکالیف اولویت عادی';
    return 'برنامه درسی هفتگی';
  }, [viewMode, filters, todayISO, subjectsById]);

  const showTimedFeedback = (message: string) => {
    setBackupFeedback(message);
    if (backupTimerRef.current !== null) {
      window.clearTimeout(backupTimerRef.current);
    }
    backupTimerRef.current = window.setTimeout(() => {
      setBackupFeedback(null);
    }, 5000);
  };

  const handleTriggerPrint = () => {
    window.print();
  };

  const handleSavePdf = async () => {
    const weekStartISO = weekDays[0]?.dateISO ?? todayISO;
    const result = await exportSchedulePdfFile(printableData, weekStartISO);
    if (result.destination === 'android-downloads') {
      showTimedFeedback(`فایل PDF در پوشه ${result.folder} ذخیره شد (${result.path}).`);
    } else if (result.destination === 'tauri-downloads') {
      showTimedFeedback(`فایل PDF در مسیر ${result.path} ذخیره شد.`);
    } else {
      showTimedFeedback(`فایل PDF (${result.path}) با موفقیت دانلود شد.`);
    }
    return result;
  };

  const handleExportBackup = async () => {
    const payload = createBackupPayload({
      tasks,
      subjects,
      theme,
    });
    const jsonContent = serializeBackupJson(payload);
    const filename = buildBackupFilename(todayISO);
    const result = await downloadJsonFile(filename, jsonContent);

    if (result.destination === 'android-downloads') {
      showTimedFeedback(
        `فایل پشتیبان JSON در پوشه ${result.folder} ذخیره شد (${toPersianDigits(payload.summary.taskCount)} تکلیف و ${toPersianDigits(payload.summary.subjectCount)} درس).`,
      );
    } else if (result.destination === 'tauri-downloads') {
      showTimedFeedback(
        `فایل پشتیبان JSON در مسیر ${result.path} ذخیره شد (${toPersianDigits(payload.summary.taskCount)} تکلیف).`,
      );
    } else {
      showTimedFeedback(
        `فایل پشتیبان (${toPersianDigits(payload.summary.taskCount)} تکلیف و ${toPersianDigits(payload.summary.subjectCount)} درس) دانلود شد.`,
      );
    }
  };

  const handleApplyImport = ({
    data,
    mode,
    applyTheme,
  }: {
    data: ParsedBackupData;
    mode: ImportMode;
    applyTheme: boolean;
  }) => {
    const applied = applyImportedBackup({
      mode,
      imported: data,
      currentTasks: tasks,
      currentSubjects: subjects,
    });
    setSubjects(applied.subjects);
    setTasks(applied.tasks);
    if (applyTheme && data.theme) {
      setTheme(data.theme);
    }
    if (
      filters.subjectId !== 'all' &&
      !applied.subjects.some((s) => s.id === filters.subjectId)
    ) {
      setFilters((prev) => ({ ...prev, subjectId: 'all' }));
    }

    const modeLabel = mode === 'replace' ? 'جایگزین' : 'ادغام';
    showTimedFeedback(
      `داده‌های JSON با موفقیت ${modeLabel} شد (${toPersianDigits(data.tasks.length)} تکلیف و ${toPersianDigits(applied.subjects.length)} درس).`,
    );
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
    repeatAllWeek?: boolean;
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
      const targetDates = expandTaskDatesForWeek(payload.dateISO, Boolean(payload.repeatAllWeek));
      const nowISO = new Date().toISOString();
      const createdList: StudyTask[] = targetDates.map((iso) => ({
        id: generateId('task'),
        title: payload.title,
        notes: payload.notes || undefined,
        dateISO: iso,
        subjectId: payload.subjectId,
        priority: payload.priority,
        completed: false,
        reminderEnabled: payload.reminderEnabled,
        reminderTime: payload.reminderTime,
        createdAt: nowISO,
      }));
      setTasks((prev) => [...prev, ...createdList]);
      if (createdList.length > 1) {
        showTimedFeedback(
          `تکلیف «${payload.title}» برای تمام ۷ روز هفته (شنبه تا جمعه) ثبت شد.`,
        );
      }
    }
  };

  const handleQuickAdd = (payload: {
    title: string;
    dateISO: string;
    repeatAllWeek?: boolean;
    subjectId: string;
    priority: PriorityLevel;
    reminderEnabled: boolean;
    reminderTime: string;
  }) => {
    const targetDates = expandTaskDatesForWeek(payload.dateISO, Boolean(payload.repeatAllWeek));
    const nowISO = new Date().toISOString();
    const createdList: StudyTask[] = targetDates.map((iso) => ({
      id: generateId('task'),
      title: payload.title,
      dateISO: iso,
      subjectId: payload.subjectId,
      priority: payload.priority,
      completed: false,
      reminderEnabled: payload.reminderEnabled,
      reminderTime: payload.reminderTime,
      createdAt: nowISO,
    }));
    setTasks((prev) => [...prev, ...createdList]);
    if (createdList.length > 1) {
      showTimedFeedback(
        `تکلیف «${payload.title}» برای تمام ۷ روز هفته (شنبه تا جمعه) ثبت شد.`,
      );
    }
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
    const target = tasks.find((t) => t.id === taskId);
    if (!target) return;
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTrashTasks((prev) => [{ ...target, deletedAt: new Date().toISOString() }, ...prev]);
  };

  const handleRestoreFromTrash = (taskId: string) => {
    const target = trashTasks.find((t) => t.id === taskId);
    if (!target) return;
    const { deletedAt: _deleted, ...restored } = target;
    setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
    setTasks((prev) => [...prev, restored]);
  };

  const handlePermanentDelete = (taskId: string) => {
    setTrashTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleEmptyTrash = () => {
    setTrashTasks([]);
  };

  const handleConfirmDeleteAll = ({
    scope,
    permanent,
  }: {
    scope: 'all' | 'week';
    permanent: boolean;
  }) => {
    const result = removeTasksByScope(tasks, trashTasks, {
      scope,
      weekDateISOs,
      permanent,
    });
    if (result.removedCount === 0) return;
    setTasks(result.nextTasks);
    setTrashTasks(result.nextTrash);
    if (permanent) {
      showTimedFeedback(`${toPersianDigits(result.removedCount)} تکلیف به‌صورت دائمی حذف شد.`);
    } else {
      showTimedFeedback(
        `${toPersianDigits(result.removedCount)} تکلیف حذف و به بخش «اخیراً حذف‌شده» منتقل شد.`,
      );
    }
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
    setViewMode('board');
    setFilters({
      subjectId: 'all',
      priority: 'all',
      completion: 'all',
      search: '',
      dateISO: undefined,
      onlyReminders: false,
    });
  };

  const handleApplySidebarPreset = (
    preset: 'today' | 'completed' | 'high' | 'all' | 'reminders',
  ) => {
    setViewMode('board');
    if (preset === 'today') {
      setWeekOffset(0);
      setFilters({
        subjectId: 'all',
        priority: 'all',
        completion: 'all',
        search: filters.search,
        dateISO: todayISO,
        onlyReminders: false,
      });
      return;
    }
    if (preset === 'completed') {
      setFilters({
        subjectId: 'all',
        priority: 'all',
        completion: 'completed',
        search: filters.search,
        dateISO: undefined,
        onlyReminders: false,
      });
      return;
    }
    if (preset === 'high') {
      setFilters({
        subjectId: 'all',
        priority: 'high',
        completion: 'pending',
        search: filters.search,
        dateISO: undefined,
        onlyReminders: false,
      });
      return;
    }
    if (preset === 'reminders') {
      setFilters({
        subjectId: 'all',
        priority: 'all',
        completion: 'all',
        search: filters.search,
        dateISO: undefined,
        onlyReminders: true,
      });
      return;
    }
    setFilters({
      subjectId: 'all',
      priority: 'all',
      completion: 'all',
      search: '',
      dateISO: undefined,
      onlyReminders: false,
    });
  };

  const handleSelectSubject = (subjectId: string) => {
    setViewMode('board');
    setFilters((prev) => ({
      ...prev,
      subjectId,
      dateISO: undefined,
      onlyReminders: false,
      completion: 'all',
    }));
  };

  const handleSelectPriorityTag = (priority: PriorityLevel | 'all') => {
    setViewMode('board');
    setFilters((prev) => ({
      ...prev,
      priority,
      dateISO: undefined,
      onlyReminders: false,
    }));
  };

  const handleJumpToAnalytics = () => {
    setViewMode('board');
    window.setTimeout(() => {
      const el = document.getElementById('analytics-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  return (
    <>
      <div className="min-h-screen flex bg-white dark:bg-[#121214] text-zinc-900 dark:text-zinc-100 print:hidden">
        <PlannerSidebar
          isOpen={sidebarOpen}
          isMobileDrawerOpen={mobileDrawerOpen}
          onCloseMobileDrawer={() => setMobileDrawerOpen(false)}
          onToggleDesktopSidebar={() => setSidebarOpen(false)}
          viewMode={viewMode}
          onSelectViewMode={setViewMode}
          filters={filters}
          todayISO={todayISO}
          counts={sidebarCounts}
          trashCount={trashTasks.length}
          subjects={subjects}
          theme={theme}
          onToggleTheme={() => setTheme((prev) => getNextTheme(prev))}
          onOpenSubjectModal={() => setSubjectModalOpen(true)}
          onApplyPreset={handleApplySidebarPreset}
          onSelectSubject={handleSelectSubject}
          onSelectPriorityTag={handleSelectPriorityTag}
          onJumpToAnalytics={handleJumpToAnalytics}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          {/* Crisp Apple-style top workspace bar: compact 1-row on mobile and desktop */}
          <header className="sticky top-0 z-30 bg-white/95 dark:bg-[#121214]/95 backdrop-blur-sm border-b border-zinc-200/70 dark:border-zinc-800/80">
            <div className="max-w-[1180px] mx-auto px-3 sm:px-8 h-14 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  aria-label="باز کردن منوی دسته‌بندی‌ها"
                  className="lg:hidden p-2 rounded-xl text-zinc-700 dark:text-zinc-200 hover:bg-[#F4F4F6] dark:hover:bg-zinc-800 transition-colors"
                >
                  <Menu className="w-5 h-5" aria-hidden="true" />
                </button>

                {!sidebarOpen && (
                  <button
                    type="button"
                    onClick={() => setSidebarOpen(true)}
                    aria-label="نمایش نوار کناری"
                    title="نمایش نوار کناری"
                    className="hidden lg:inline-flex p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-[#F4F4F6] dark:hover:bg-zinc-800 transition-colors"
                  >
                    <PanelRightOpen className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}

                <div
                  className="inline-flex items-center gap-0.5 bg-[#F4F4F6] dark:bg-zinc-800/80 p-1 rounded-xl"
                  role="group"
                  aria-label="ناوبری هفته"
                >
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w - 1)}
                    aria-label="هفته قبل"
                    title="هفته قبل"
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset(0)}
                    className={`px-2 sm:px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      weekOffset === 0
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    هفته جاری
                  </button>
                  <button
                    type="button"
                    onClick={() => setWeekOffset((w) => w + 1)}
                    aria-label="هفته بعد"
                    title="هفته بعد"
                    className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end">
                <div className="hidden md:flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setPrintModalOpen(true)}
                    title="چاپ / ذخیره PDF"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>چاپ PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleExportBackup}
                    title="پشتیبان‌گیری JSON"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>خروجی JSON</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setImportModalOpen(true)}
                    title="ورودی و بازیابی JSON"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200/80 dark:hover:bg-zinc-700 transition-colors whitespace-nowrap shrink-0"
                  >
                    <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>ورودی JSON</span>
                  </button>

                  <PWAInstallButton />

                  {notificationPermission !== 'unsupported' && (
                    <button
                      type="button"
                      onClick={handleRequestNotification}
                      disabled={notificationPermission === 'granted'}
                      aria-label={
                        notificationPermission === 'granted'
                          ? 'اعلان مرورگر فعال است'
                          : 'فعال‌سازی اعلان مرورگر'
                      }
                      title={
                        notificationPermission === 'granted'
                          ? 'اعلان مرورگر فعال است'
                          : 'فعال‌سازی اعلان مرورگر'
                      }
                      className={`inline-flex items-center gap-1.5 p-2 rounded-xl transition-colors shrink-0 ${
                        notificationPermission === 'granted'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 cursor-default'
                          : 'bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/80 dark:hover:bg-zinc-700'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  )}
                </div>

                <div className="relative flex-1 sm:flex-initial min-w-[120px] sm:w-48 md:w-52">
                  <Search
                    className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={filters.search}
                    onChange={(e) => {
                      setViewMode('board');
                      setFilters((prev) => ({ ...prev, search: e.target.value }));
                    }}
                    placeholder="جستجو..."
                    aria-label="جستجو در تکالیف"
                    className="w-full pr-8 pl-2.5 py-1.5 text-xs sm:text-sm bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 rounded-xl focus:bg-white dark:focus:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-rose-500 border border-transparent focus:border-zinc-200 dark:focus:border-zinc-700"
                  />
                </div>
              </div>
            </div>
          </header>

          <main id="top" className="flex-1 max-w-[1180px] w-full mx-auto px-4 sm:px-8 py-5 pb-24 space-y-5">
            {/* Mobile-only compact utility action strip (non-sticky so header stays <= 56px) */}
            <div className="flex md:hidden flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setPrintModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200"
              >
                <Printer className="w-3.5 h-3.5" aria-hidden="true" />
                چاپ PDF
              </button>
              <button
                type="button"
                onClick={handleExportBackup}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200"
              >
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                خروجی JSON
              </button>
              <button
                type="button"
                onClick={() => setImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#F4F4F6] dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-200"
              >
                <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                ورودی JSON
              </button>
              <PWAInstallButton />
            </div>
            {/* Coral Red Main Display Heading matching NEW PROJECT in reference */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
              <div className="space-y-1">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#D9443C] dark:text-[#F87171]">
                  {boardHeading}
                </h1>
                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    {weekSpan.jalaliSpan}
                  </span>
                  <span aria-hidden="true">/</span>
                  <span dir="ltr" className="font-mono-nums">
                    {weekSpan.gregorianSpan}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>امروز: {formatJalaliLong(todayJalali)}</span>
                  <span aria-hidden="true">·</span>
                  <span dir="ltr" className="font-mono-nums">
                    {formatGregorianEnShort(todayGregorian)}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                <span>
                  کل هفته: <strong className="text-zinc-900 dark:text-zinc-100">{toPersianDigits(weeklyStats.total)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  تکمیل‌شده: <strong className="text-emerald-700 dark:text-emerald-400">{toPersianDigits(weeklyStats.completed)}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  باقی‌مانده: <strong className="text-zinc-900 dark:text-zinc-100">{toPersianDigits(weeklyStats.pending)}</strong>
                </span>

                {(hasActiveFilters || viewMode === 'trash') && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                    نمایش کل هفته
                  </button>
                )}

                {viewMode === 'board' && tasks.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeleteAllModalOpen(true)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-950/70 rounded-lg transition-colors whitespace-nowrap"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    حذف همه تکالیف
                  </button>
                )}
              </div>
            </div>

            {backupFeedback && (
              <p
                role="status"
                aria-live="polite"
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{backupFeedback}</span>
              </p>
            )}

            {viewMode === 'trash' ? (
              <section aria-label="تکالیف اخیراً حذف‌شده" className="space-y-4">
                <div className="flex items-center justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 pb-3">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    موارد حذف‌شده در اینجا نگهداری می‌شوند تا در صورت نیاز بازیابی شوند.
                  </p>
                  {trashTasks.length > 0 && (
                    <button
                      type="button"
                      onClick={handleEmptyTrash}
                      className="px-3 py-1.5 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors whitespace-nowrap"
                    >
                      خالی کردن سطل
                    </button>
                  )}
                </div>

                {trashTasks.length === 0 ? (
                  <div className="bg-[#F4F4F6]/80 dark:bg-zinc-900/60 rounded-2xl p-10 text-center space-y-2">
                    <Trash2 className="w-6 h-6 text-zinc-400 mx-auto" aria-hidden="true" />
                    <p className="text-sm font-medium text-zinc-600 dark:text-zinc-300">
                      مورد حذف‌شده‌ای وجود ندارد.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {trashTasks.map((task) => {
                      const sub = subjectsById[task.subjectId];
                      return (
                        <div
                          key={task.id}
                          className="bg-[#F2F2F7] dark:bg-zinc-800/80 rounded-xl p-3.5 flex flex-col justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {task.title}
                            </p>
                            {task.notes && (
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">{task.notes}</p>
                            )}
                            <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                              {sub?.name ?? 'عمومی'} · {formatJalaliLong(isoToJalali(task.dateISO))}
                            </p>
                          </div>

                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200/70 dark:border-zinc-700/70">
                            <button
                              type="button"
                              onClick={() => handleRestoreFromTrash(task.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors"
                            >
                              بازیابی
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePermanentDelete(task.id)}
                              className="px-3 py-1.5 text-xs font-medium rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 transition-colors"
                            >
                              حذف دائمی
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            ) : (
              <>
                <ReminderBanner
                  dueTasks={dueReminders}
                  subjectsById={subjectsById}
                  onComplete={handleToggleComplete}
                  onSnooze={handleSnoozeReminder}
                  onDismiss={handleDismissReminder}
                />

                {hasActiveFilters && totalMatchingInWeek === 0 ? (
                  <div className="bg-[#F4F4F6]/80 dark:bg-zinc-900/60 rounded-2xl p-10 text-center space-y-3">
                    <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                      در این هفته هیچ تکلیفی مطابق فیلترهای انتخاب‌شده یافت نشد.
                    </p>
                    <button
                      type="button"
                      onClick={resetFilters}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-600 rounded-xl hover:bg-rose-700 transition-colors"
                    >
                      نمایش همه تکالیف هفته
                    </button>
                  </div>
                ) : (
                  <div
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-x-7 gap-y-8"
                    data-testid="weekly-list"
                  >
                    {visibleWeekDays.map((day) => (
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

                <div className="pt-4">
                  <WeeklyProgressChart
                    summary={weeklyProgressSummary}
                    theme={theme}
                    onAddTask={() => handleOpenNewModal(weekDays[0]?.dateISO ?? todayISO)}
                  />
                </div>
              </>
            )}
          </main>
        </div>

        {/* Floating Coral Red '+' FAB matching reference bottom corner button */}
        <button
          type="button"
          onClick={() => handleOpenNewModal(todayISO)}
          aria-label="افزودن تکلیف جدید"
          title="افزودن تکلیف جدید"
          className="fixed bottom-6 left-6 z-40 w-12 h-12 rounded-full bg-[#E14842] hover:bg-[#C93933] text-white shadow-lg shadow-rose-600/25 inline-flex items-center justify-center transition-transform duration-150 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-600 dark:focus-visible:ring-offset-zinc-950"
        >
          <Plus className="w-6 h-6" aria-hidden="true" />
        </button>

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
          onSavePdf={handleSavePdf}
        />

        <ImportBackupModal
          isOpen={importModalOpen}
          existingSubjects={subjects}
          onClose={() => setImportModalOpen(false)}
          onApplyImport={handleApplyImport}
        />

        <ConfirmDeleteAllModal
          isOpen={deleteAllModalOpen}
          totalTaskCount={tasks.length}
          currentWeekTaskCount={weeklyStats.total}
          weekJalaliSpan={weekSpan.jalaliSpan}
          onClose={() => setDeleteAllModalOpen(false)}
          onConfirm={handleConfirmDeleteAll}
        />
      </div>

      <div className="hidden print:block bg-white" data-testid="printable-schedule-root">
        <PrintableWeekSheet data={printableData} />
      </div>

      <OfflineIndicator />
    </>
  );
}
