import {
  BarChart3,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  Flame,
  Inbox,
  ListTodo,
  Moon,
  PanelRightClose,
  Plus,
  Sun,
  Trash2,
  X,
} from 'lucide-react';
import type { PriorityLevel, SubjectCategory, TaskFilterState } from '../types/study';
import { toPersianDigits } from '../utils/jalali';
import type { SidebarCounts } from '../utils/tasks';
import type { ThemeMode } from '../utils/theme';

export type WorkspaceViewMode = 'board' | 'trash';

interface PlannerSidebarProps {
  isOpen: boolean;
  isMobileDrawerOpen: boolean;
  onCloseMobileDrawer: () => void;
  onToggleDesktopSidebar: () => void;
  viewMode: WorkspaceViewMode;
  onSelectViewMode: (mode: WorkspaceViewMode) => void;
  filters: TaskFilterState;
  todayISO: string;
  counts: SidebarCounts;
  trashCount: number;
  subjects: SubjectCategory[];
  theme: ThemeMode;
  onToggleTheme: () => void;
  onOpenSubjectModal: () => void;
  onApplyPreset: (preset: 'today' | 'completed' | 'high' | 'all' | 'reminders') => void;
  onSelectSubject: (subjectId: string) => void;
  onSelectPriorityTag: (priority: PriorityLevel | 'all') => void;
  onJumpToAnalytics: () => void;
}

export function PlannerSidebar({
  isOpen,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
  onToggleDesktopSidebar,
  viewMode,
  onSelectViewMode,
  filters,
  todayISO,
  counts,
  trashCount,
  subjects,
  theme,
  onToggleTheme,
  onOpenSubjectModal,
  onApplyPreset,
  onSelectSubject,
  onSelectPriorityTag,
  onJumpToAnalytics,
}: PlannerSidebarProps) {
  const isTodayActive =
    viewMode === 'board' &&
    filters.dateISO === todayISO &&
    filters.subjectId === 'all' &&
    filters.priority === 'all' &&
    filters.completion === 'all' &&
    !filters.onlyReminders;

  const isCompletedActive =
    viewMode === 'board' &&
    filters.completion === 'completed' &&
    !filters.dateISO &&
    filters.subjectId === 'all' &&
    filters.priority === 'all' &&
    !filters.onlyReminders;

  const isHighActive =
    viewMode === 'board' &&
    filters.priority === 'high' &&
    filters.completion !== 'completed' &&
    !filters.dateISO &&
    filters.subjectId === 'all' &&
    !filters.onlyReminders;

  const isAllActive =
    viewMode === 'board' &&
    !filters.dateISO &&
    !filters.onlyReminders &&
    filters.subjectId === 'all' &&
    filters.priority === 'all' &&
    filters.completion === 'all';

  const isRemindersActive = viewMode === 'board' && Boolean(filters.onlyReminders);

  const sidebarBody = (
    <div className="flex flex-col h-full bg-[#F4F4F6] dark:bg-[#1C1C1E] text-zinc-900 dark:text-zinc-100 select-none">
      {/* Top sidebar utility icons matching reference header strip */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onOpenSubjectModal}
            aria-label="مدیریت و افزودن درس جدید"
            title="افزودن / مدیریت درس‌ها"
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-4 h-4" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onJumpToAnalytics();
              onCloseMobileDrawer();
            }}
            aria-label="پرش به نمودار پیشرفت هفتگی"
            title="نمودار پیشرفت هفتگی"
            className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <BarChart3 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={isMobileDrawerOpen ? onCloseMobileDrawer : onToggleDesktopSidebar}
          aria-label="بستن نوار کناری"
          title="بستن نوار کناری"
          className="p-2 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200/70 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {isMobileDrawerOpen ? (
            <X className="w-4 h-4 lg:hidden" aria-hidden="true" />
          ) : null}
          <PanelRightClose className="w-4 h-4 hidden lg:block" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto planner-scroll px-3.5 pb-5 space-y-5">
        {/* 2x2 Smart Summary Tile Grid matching reference screenshot */}
        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="فیلترهای سریع برنامه">
          <button
            type="button"
            onClick={() => {
              onApplyPreset('today');
              onCloseMobileDrawer();
            }}
            aria-pressed={isTodayActive}
            className={`group rounded-2xl p-3 text-right text-white transition-all duration-150 active:scale-[0.98] bg-[#2563EB] hover:bg-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-600 dark:focus-visible:ring-offset-zinc-900 ${
              isTodayActive ? 'shadow-md ring-2 ring-blue-600/35 dark:ring-white/60 ring-offset-2 dark:ring-offset-[#1C1C1E]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="w-7 h-7 rounded-lg bg-white/20 inline-flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold tabular-nums leading-none">
                {toPersianDigits(counts.todayPending)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-2.5 truncate">امروز</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('completed');
              onCloseMobileDrawer();
            }}
            aria-pressed={isCompletedActive}
            className={`group rounded-2xl p-3 text-right text-white transition-all duration-150 active:scale-[0.98] bg-[#1E8A4C] hover:bg-[#16733E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-600 dark:focus-visible:ring-offset-zinc-900 ${
              isCompletedActive ? 'shadow-md ring-2 ring-emerald-600/35 dark:ring-white/60 ring-offset-2 dark:ring-offset-[#1C1C1E]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="w-7 h-7 rounded-lg bg-white/20 inline-flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekCompleted)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-2.5 truncate">تکمیل‌شده</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('high');
              onCloseMobileDrawer();
            }}
            aria-pressed={isHighActive}
            className={`group rounded-2xl p-3 text-right text-white transition-all duration-150 active:scale-[0.98] bg-[#D9483B] hover:bg-[#C2382C] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-rose-600 dark:focus-visible:ring-offset-zinc-900 ${
              isHighActive ? 'shadow-md ring-2 ring-rose-600/35 dark:ring-white/60 ring-offset-2 dark:ring-offset-[#1C1C1E]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="w-7 h-7 rounded-lg bg-white/20 inline-flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekHighPriorityPending)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-2.5 truncate">اولویت بالا</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('all');
              onCloseMobileDrawer();
            }}
            aria-pressed={isAllActive}
            className={`group rounded-2xl p-3 text-right text-white transition-all duration-150 active:scale-[0.98] bg-[#C26D0A] hover:bg-[#A65B06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-amber-600 dark:focus-visible:ring-offset-zinc-900 ${
              isAllActive ? 'shadow-md ring-2 ring-amber-600/35 dark:ring-white/60 ring-offset-2 dark:ring-offset-[#1C1C1E]' : ''
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="w-7 h-7 rounded-lg bg-white/20 inline-flex items-center justify-center shrink-0">
                <Inbox className="w-4 h-4 text-white" aria-hidden="true" />
              </span>
              <span className="text-xl font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekTotal)}
              </span>
            </div>
            <p className="text-xs font-semibold mt-2.5 truncate">همه هفته</p>
          </button>
        </div>

        {/* My Lists / درس‌های من */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between px-1.5">
            <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">فهرست‌ها و درس‌های من</h2>
            <button
              type="button"
              onClick={onOpenSubjectModal}
              className="text-[11px] font-medium text-rose-600 dark:text-rose-400 hover:underline whitespace-nowrap"
            >
              مدیریت درس‌ها
            </button>
          </div>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onApplyPreset('all');
                onCloseMobileDrawer();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                isAllActive
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 inline-flex items-center justify-center shrink-0">
                  <ListTodo className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="truncate">برنامه کامل هفته</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                {toPersianDigits(counts.weekTotal)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyPreset('reminders');
                onCloseMobileDrawer();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                isRemindersActive
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/70 text-rose-600 dark:text-rose-400 inline-flex items-center justify-center shrink-0">
                  <Bell className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="truncate">یادآورهای فعال</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                {toPersianDigits(counts.weekActiveReminders)}
              </span>
            </button>

            {subjects.map((sub) => {
              const active = viewMode === 'board' && filters.subjectId === sub.id;
              const subCount = counts.bySubject[sub.id] ?? 0;
              return (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => {
                    onSelectSubject(sub.id);
                    onCloseMobileDrawer();
                  }}
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                    active
                      ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-6 h-6 rounded-lg inline-flex items-center justify-center shrink-0 text-white"
                      style={{ backgroundColor: sub.color }}
                      aria-hidden="true"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                    </span>
                    <span className="truncate">{sub.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                    <span>{toPersianDigits(subCount)}</span>
                    <ChevronLeft className="w-3.5 h-3.5 opacity-60" aria-hidden="true" />
                  </span>
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => {
                onSelectViewMode('trash');
                onCloseMobileDrawer();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors ${
                viewMode === 'trash'
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="w-6 h-6 rounded-lg bg-zinc-200/80 dark:bg-zinc-700/80 text-zinc-600 dark:text-zinc-300 inline-flex items-center justify-center shrink-0">
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </span>
                <span className="truncate">اخیراً حذف‌شده</span>
              </span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
                {toPersianDigits(trashCount)}
              </span>
            </button>
          </div>
        </div>

        {/* Tags / برچسب‌ها (Interactive Priority Filter Controls matching screenshot bottom section) */}
        <div className="space-y-2 pt-1 border-t border-zinc-200/80 dark:border-zinc-800">
          <h2 className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 px-1.5 pt-1">
            برچسب‌های اولویت
          </h2>
          <div className="flex flex-wrap gap-1.5 px-1" role="group" aria-label="فیلتر بر اساس اولویت">
            {(
              [
                { value: 'all', label: 'همه برچسب‌ها' },
                { value: 'high', label: '#فوری' },
                { value: 'medium', label: '#متوسط' },
                { value: 'low', label: '#عادی' },
              ] as const
            ).map((tag) => {
              const selected = viewMode === 'board' && filters.priority === tag.value;
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => {
                    onSelectPriorityTag(tag.value);
                    onCloseMobileDrawer();
                  }}
                  aria-pressed={selected}
                  className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                    selected
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300/70 dark:hover:bg-zinc-700'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop persistent / collapsible sidebar */}
      {isOpen && (
        <aside
          aria-label="نوار کناری دسته‌بندی‌ها"
          className="hidden lg:block w-[276px] xl:w-[292px] shrink-0 border-l border-zinc-200/80 dark:border-zinc-800 h-screen sticky top-0"
        >
          {sidebarBody}
        </aside>
      )}

      {/* Mobile slide-over drawer */}
      {isMobileDrawerOpen && (
        <div
          className="fixed inset-0 z-50 lg:hidden flex"
          role="dialog"
          aria-modal="true"
          aria-label="منوی فهرست‌ها و درس‌ها"
        >
          <div className="w-[290px] max-w-[85vw] h-full shadow-2xl border-l border-zinc-200 dark:border-zinc-800 z-10">
            {sidebarBody}
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            aria-label="بستن منو"
            className="flex-1 bg-zinc-950/45"
          />
        </div>
      )}
    </>
  );
}
