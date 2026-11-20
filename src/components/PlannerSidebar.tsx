import {
  BarChart3,
  Bell,
  Calendar,
  CheckCircle2,
  ChevronDown,
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
import { useState } from 'react';
import type { PriorityLevel, SubjectCategory, TaskFilterState } from '../types/study';
import { toPersianDigits } from '../utils/jalali';
import type { SidebarCounts } from '../utils/tasks';
import type { ThemeMode } from '../utils/theme';

export type WorkspaceViewMode = 'board' | 'trash' | 'analytics';

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
  onOpenAnalytics: () => void;
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
  onOpenAnalytics,
}: PlannerSidebarProps) {
  const [tagsExpanded, setTagsExpanded] = useState(true);

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

  const sidebarCard = (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1A1D] text-zinc-900 dark:text-zinc-100 select-none lg:rounded-[22px] lg:shadow-[0_4px_24px_rgba(0,0,0,0.055)] lg:border lg:border-zinc-200/60 dark:lg:border-zinc-800/90 overflow-hidden">
      {/* Whisper-clean top utility icon strip matching iPadOS Reminders */}
      <div className="flex items-center justify-between px-4 pt-3.5 pb-2.5">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={onOpenSubjectModal}
            aria-label="مدیریت و افزودن درس جدید"
            title="مدیریت درس‌ها"
            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            <Plus className="w-[17px] h-[17px]" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'تغییر به حالت روشن' : 'تغییر به حالت تاریک'}
            title={theme === 'dark' ? 'حالت روشن' : 'حالت تاریک'}
            className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
          >
            {theme === 'dark' ? (
              <Sun className="w-[17px] h-[17px] text-amber-400" aria-hidden="true" />
            ) : (
              <Moon className="w-[17px] h-[17px]" aria-hidden="true" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenAnalytics();
              onCloseMobileDrawer();
            }}
            aria-pressed={viewMode === 'analytics'}
            aria-label="نمایش نمودار پیشرفت هفتگی"
            title="نمودار پیشرفت هفتگی"
            className={`p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              viewMode === 'analytics'
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            <BarChart3 className="w-[17px] h-[17px]" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={isMobileDrawerOpen ? onCloseMobileDrawer : onToggleDesktopSidebar}
          aria-label="بستن نوار کناری"
          title="بستن نوار کناری"
          className="p-2 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
        >
          {isMobileDrawerOpen ? (
            <X className="w-[17px] h-[17px] lg:hidden" aria-hidden="true" />
          ) : null}
          <PanelRightClose className="w-[17px] h-[17px] hidden lg:block" aria-hidden="true" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto planner-scroll px-3.5 pb-5 space-y-6">
        {/* Soft luminous pastel 2x2 Smart Summary Tiles matching reference screenshot */}
        <div className="grid grid-cols-2 gap-2.5" role="group" aria-label="فیلترهای سریع برنامه">
          <button
            type="button"
            onClick={() => {
              onApplyPreset('today');
              onCloseMobileDrawer();
            }}
            aria-pressed={isTodayActive}
            className={`rounded-[16px] px-3 py-2.5 text-right text-white transition-all duration-150 active:scale-[0.98] bg-gradient-to-br from-[#5CA8EC] to-[#4793DF] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
              isTodayActive ? 'shadow-[0_4px_14px_rgba(71,147,223,0.38)]' : 'opacity-95 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Calendar className="w-4 h-4 text-white/95 shrink-0" aria-hidden="true" />
              <span className="text-[22px] font-bold tabular-nums leading-none">
                {toPersianDigits(counts.todayPending)}
              </span>
            </div>
            <p className="text-[12px] font-medium mt-2.5 text-white/95 truncate">امروز</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('completed');
              onCloseMobileDrawer();
            }}
            aria-pressed={isCompletedActive}
            className={`rounded-[16px] px-3 py-2.5 text-right text-white transition-all duration-150 active:scale-[0.98] bg-gradient-to-br from-[#62C98A] to-[#49B574] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
              isCompletedActive ? 'shadow-[0_4px_14px_rgba(73,181,116,0.38)]' : 'opacity-95 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <CheckCircle2 className="w-4 h-4 text-white/95 shrink-0" aria-hidden="true" />
              <span className="text-[22px] font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekCompleted)}
              </span>
            </div>
            <p className="text-[12px] font-medium mt-2.5 text-white/95 truncate">تکمیل‌شده</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('high');
              onCloseMobileDrawer();
            }}
            aria-pressed={isHighActive}
            className={`rounded-[16px] px-3 py-2.5 text-right text-white transition-all duration-150 active:scale-[0.98] bg-gradient-to-br from-[#EE7B74] to-[#E2645D] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 ${
              isHighActive ? 'shadow-[0_4px_14px_rgba(226,100,93,0.38)]' : 'opacity-95 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Flame className="w-4 h-4 text-white/95 shrink-0" aria-hidden="true" />
              <span className="text-[22px] font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekHighPriorityPending)}
              </span>
            </div>
            <p className="text-[12px] font-medium mt-2.5 text-white/95 truncate">اولویت بالا</p>
          </button>

          <button
            type="button"
            onClick={() => {
              onApplyPreset('all');
              onCloseMobileDrawer();
            }}
            aria-pressed={isAllActive}
            className={`rounded-[16px] px-3 py-2.5 text-right text-white transition-all duration-150 active:scale-[0.98] bg-gradient-to-br from-[#F3B562] to-[#E59D44] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              isAllActive ? 'shadow-[0_4px_14px_rgba(229,157,68,0.38)]' : 'opacity-95 hover:opacity-100'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <Inbox className="w-4 h-4 text-white/95 shrink-0" aria-hidden="true" />
              <span className="text-[22px] font-bold tabular-nums leading-none">
                {toPersianDigits(counts.weekTotal)}
              </span>
            </div>
            <p className="text-[12px] font-medium mt-2.5 text-white/95 truncate">همه هفته</p>
          </button>
        </div>

        {/* My Lists / فهرست‌های من — ultra-clean unboxed minimal rows */}
        <div className="space-y-1">
          <h2 className="text-[11.5px] font-medium text-zinc-400 dark:text-zinc-500 px-2 pb-1">
            فهرست‌های من
          </h2>

          <div className="space-y-0.5">
            <button
              type="button"
              onClick={() => {
                onApplyPreset('all');
                onCloseMobileDrawer();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-colors ${
                isAllActive
                  ? 'bg-[#F3F3F6] dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 font-normal hover:bg-[#F7F7FA] dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ListTodo className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
                <span className="truncate">برنامه کامل هفته</span>
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                {toPersianDigits(counts.weekTotal)}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                onApplyPreset('reminders');
                onCloseMobileDrawer();
              }}
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-colors ${
                isRemindersActive
                  ? 'bg-[#F3F3F6] dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-700 dark:text-zinc-300 font-normal hover:bg-[#F7F7FA] dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                <span className="truncate">یادآورها</span>
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
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
                  className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-colors ${
                    active
                      ? 'bg-[#F3F3F6] dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold'
                      : 'text-zinc-700 dark:text-zinc-300 font-normal hover:bg-[#F7F7FA] dark:hover:bg-zinc-800/50'
                  }`}
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-[5px] border-[1.5px] shrink-0"
                      style={{ borderColor: sub.color, backgroundColor: `${sub.color}1A` }}
                      aria-hidden="true"
                    />
                    <span className="truncate">{sub.name}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                    <span>{toPersianDigits(subCount)}</span>
                    <ChevronLeft className="w-3 h-3 opacity-50" aria-hidden="true" />
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
              className={`w-full flex items-center justify-between gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-colors ${
                viewMode === 'trash'
                  ? 'bg-[#F3F3F6] dark:bg-zinc-800/80 text-zinc-900 dark:text-white font-semibold'
                  : 'text-zinc-600 dark:text-zinc-400 font-normal hover:bg-[#F7F7FA] dark:hover:bg-zinc-800/50'
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <Trash2 className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0" aria-hidden="true" />
                <span className="truncate">اخیراً حذف‌شده</span>
              </span>
              <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                {toPersianDigits(trashCount)}
              </span>
            </button>
          </div>
        </div>

        {/* Collapsible Tags section matching bottom of reference sidebar */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={() => setTagsExpanded((prev) => !prev)}
            aria-expanded={tagsExpanded}
            className="w-full flex items-center justify-between px-2 text-[11.5px] font-medium text-zinc-400 dark:text-zinc-500 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors"
          >
            <span>برچسب‌ها</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${tagsExpanded ? '' : 'rotate-90'}`}
              aria-hidden="true"
            />
          </button>

          {tagsExpanded && (
            <div className="flex flex-wrap gap-1.5 px-1.5" role="group" aria-label="فیلتر بر اساس اولویت">
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
                    className={`px-2.5 py-1 text-[11.5px] font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                      selected
                        ? 'bg-zinc-200/90 dark:bg-zinc-700 text-zinc-900 dark:text-white'
                        : 'bg-[#F4F4F7] dark:bg-zinc-800/70 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70 dark:hover:bg-zinc-800'
                    }`}
                  >
                    {tag.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop floating rounded sidebar card */}
      {isOpen && (
        <aside
          aria-label="نوار کناری دسته‌بندی‌ها"
          className="hidden lg:block w-[292px] xl:w-[304px] shrink-0 h-screen sticky top-0 p-3.5"
        >
          {sidebarCard}
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
          <div className="w-[290px] max-w-[85vw] h-full shadow-2xl border-l border-zinc-200/80 dark:border-zinc-800 z-10">
            {sidebarCard}
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            aria-label="بستن منو"
            className="flex-1 bg-zinc-950/35 backdrop-blur-[1px]"
          />
        </div>
      )}
    </>
  );
}
