import {
  Bell,
  BookOpen,
  Check,
  Download,
  Moon,
  RotateCcw,
  Sun,
  Trash2,
  Upload,
  Volume2,
  X,
} from 'lucide-react';
import { useEffect } from 'react';
import type { PriorityLevel } from '../types/study';
import { PWAInstallButton } from './PWAInstallButton';
import {
  ACCENT_PRESET_LIST,
  DEFAULT_APP_SETTINGS,
  type AppSettings,
  type CalendarDisplayMode,
  type DensityMode,
} from '../utils/settings';
import { playReminderChime } from '../utils/sound';
import type { ThemeMode } from '../utils/theme';

interface SettingsModalProps {
  isOpen: boolean;
  settings: AppSettings;
  theme: ThemeMode;
  notificationPermission: NotificationPermission | 'unsupported';
  taskCount: number;
  onClose: () => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onResetSettings: () => void;
  onChangeTheme: (theme: ThemeMode) => void;
  onRequestNotification: () => void;
  onOpenSubjects: () => void;
  onExportBackup: () => void;
  onOpenImport: () => void;
  onOpenDeleteAll: () => void;
}

function SmoothSwitch({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">{label}</p>
        {description && (
          <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-0.5 leading-relaxed">
            {description}
          </p>
        )}
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full transition-colors duration-200 ease-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900 ${
          checked ? 'bg-accent' : 'bg-zinc-200 dark:bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-xs transition-transform duration-200 ease-spring ${
            checked ? '-translate-x-[21px]' : '-translate-x-[3px]'
          }`}
        />
      </button>
    </div>
  );
}

export function SettingsModal({
  isOpen,
  settings,
  theme,
  notificationPermission,
  taskCount,
  onClose,
  onUpdateSettings,
  onResetSettings,
  onChangeTheme,
  onRequestNotification,
  onOpenSubjects,
  onExportBackup,
  onOpenImport,
  onOpenDeleteAll,
}: SettingsModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isDefault =
    JSON.stringify(settings) === JSON.stringify(DEFAULT_APP_SETTINGS);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/35 dark:bg-black/65 backdrop-blur-[3px] p-4 anim-backdrop-enter"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white dark:bg-[#1A1A1D] border border-zinc-200/80 dark:border-zinc-800 rounded-[22px] w-full max-w-xl max-h-[88vh] flex flex-col shadow-[0_24px_60px_rgba(0,0,0,0.16)] overflow-hidden anim-modal-enter">
        {/* Minimal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <div>
            <h2 id="settings-modal-title" className="text-[16px] font-bold text-zinc-900 dark:text-zinc-100">
              تنظیمات
            </h2>
            <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
              شخصی‌سازی ظاهر، تقویم، انیمیشن‌ها و پیش‌فرض تکالیف
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="بستن تنظیمات"
            className="p-2 rounded-full text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors duration-200"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Grouped Apple-style settings body */}
        <div className="flex-1 overflow-y-auto planner-scroll px-6 py-5 space-y-6">
          {/* Section 1: ظاهر و نمایش */}
          <section className="space-y-3" aria-label="ظاهر و نمایش">
            <h3 className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">
              ظاهر و نمایش
            </h3>

            <div className="rounded-2xl bg-[#F6F6F9] dark:bg-zinc-900/70 px-4 py-1 divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
              {/* Theme segmented toggle */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  تم برنامه
                </span>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800">
                  <button
                    type="button"
                    onClick={() => onChangeTheme('light')}
                    aria-pressed={theme === 'light'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ease-smooth ${
                      theme === 'light'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Sun className="w-3.5 h-3.5" aria-hidden="true" />
                    روشن
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeTheme('dark')}
                    aria-pressed={theme === 'dark'}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ease-smooth ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Moon className="w-3.5 h-3.5" aria-hidden="true" />
                    تاریک
                  </button>
                </div>
              </div>

              {/* Accent color swatches */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  رنگ اصلی
                </span>
                <div className="flex items-center gap-2" role="radiogroup" aria-label="انتخاب رنگ اصلی برنامه">
                  {ACCENT_PRESET_LIST.map((preset) => {
                    const selected = settings.accentColor === preset.id;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={`رنگ ${preset.label}`}
                        title={preset.label}
                        onClick={() => onUpdateSettings({ accentColor: preset.id })}
                        className={`w-6 h-6 rounded-full inline-flex items-center justify-center transition-transform duration-200 ease-spring hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-offset-zinc-900 ${
                          selected ? 'scale-110 ring-2 ring-offset-2 ring-zinc-300 dark:ring-zinc-600 dark:ring-offset-zinc-900' : ''
                        }`}
                        style={{ backgroundColor: preset.light }}
                      >
                        {selected && <Check className="w-3.5 h-3.5 text-white stroke-[3]" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Calendar display mode */}
              <div className="flex flex-wrap items-center justify-between gap-3 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  نمایش تاریخ
                </span>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800">
                  {(
                    [
                      { id: 'dual', label: 'دوگانه' },
                      { id: 'jalali', label: 'فقط شمسی' },
                      { id: 'gregorian', label: 'فقط میلادی' },
                    ] as Array<{ id: CalendarDisplayMode; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateSettings({ calendarDisplay: opt.id })}
                      aria-pressed={settings.calendarDisplay === opt.id}
                      className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-all duration-200 ease-smooth whitespace-nowrap ${
                        settings.calendarDisplay === opt.id
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Card density */}
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  فاصله و تراکم کارت‌ها
                </span>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800">
                  {(
                    [
                      { id: 'airy', label: 'خلوت' },
                      { id: 'compact', label: 'فشرده' },
                    ] as Array<{ id: DensityMode; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateSettings({ density: opt.id })}
                      aria-pressed={settings.density === opt.id}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ease-smooth whitespace-nowrap ${
                        settings.density === opt.id
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <SmoothSwitch
                checked={settings.showCompletedTasks}
                onChange={(next) => onUpdateSettings({ showCompletedTasks: next })}
                label="نمایش تکالیف تکمیل‌شده"
                description="در صورت غیرفعال بودن، موارد انجام‌شده از ستون روزها پنهان می‌شوند."
              />

              <SmoothSwitch
                checked={settings.showTaskNotes}
                onChange={(next) => onUpdateSettings({ showTaskNotes: next })}
                label="نمایش یادداشت در کارت‌ها"
                description="برای خلوت‌تر شدن صفحه می‌توانید یادداشت زیر تکالیف را مخفی کنید."
              />

              <SmoothSwitch
                checked={settings.smoothAnimations}
                onChange={(next) => onUpdateSettings({ smoothAnimations: next })}
                label="انیمیشن‌های نرم"
                description="حرکت روان پنجره‌ها، تیک‌ها و تغییر نماها"
              />
            </div>
          </section>

          {/* Section 2: پیش‌فرض تکلیف جدید */}
          <section className="space-y-3" aria-label="پیش‌فرض تکلیف جدید">
            <h3 className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">
              پیش‌فرض تکلیف جدید
            </h3>

            <div className="rounded-2xl bg-[#F6F6F9] dark:bg-zinc-900/70 px-4 py-1 divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  اولویت پیش‌فرض
                </span>
                <div className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-200/70 dark:bg-zinc-800">
                  {(
                    [
                      { id: 'high', label: 'بالا' },
                      { id: 'medium', label: 'متوسط' },
                      { id: 'low', label: 'عادی' },
                    ] as Array<{ id: PriorityLevel; label: string }>
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => onUpdateSettings({ defaultPriority: opt.id })}
                      aria-pressed={settings.defaultPriority === opt.id}
                      className={`px-3 py-1 text-xs font-medium rounded-lg transition-all duration-200 ease-smooth whitespace-nowrap ${
                        settings.defaultPriority === opt.id
                          ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                          : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <SmoothSwitch
                checked={settings.defaultReminderEnabled}
                onChange={(next) => onUpdateSettings({ defaultReminderEnabled: next })}
                label="فعال بودن یادآور به‌صورت پیش‌فرض"
              />

              <div className="flex items-center justify-between gap-4 py-3">
                <label
                  htmlFor="settings-default-time"
                  className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100"
                >
                  ساعت یادآور پیش‌فرض
                </label>
                <input
                  id="settings-default-time"
                  type="time"
                  dir="ltr"
                  value={settings.defaultReminderTime}
                  onChange={(e) => {
                    if (e.target.value) {
                      onUpdateSettings({ defaultReminderTime: e.target.value });
                    }
                  }}
                  className="px-2.5 py-1.5 text-xs font-mono-nums bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-zinc-400"
                />
              </div>
            </div>
          </section>

          {/* Section 3: اعلان و صدا */}
          <section className="space-y-3" aria-label="اعلان و صدا">
            <h3 className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">
              اعلان و صدا
            </h3>

            <div className="rounded-2xl bg-[#F6F6F9] dark:bg-zinc-900/70 px-4 py-1 divide-y divide-zinc-200/60 dark:divide-zinc-800/80">
              <SmoothSwitch
                checked={settings.reminderSoundEnabled}
                onChange={(next) => onUpdateSettings({ reminderSoundEnabled: next })}
                label="صدای زنگ یادآور"
                description="پخش صدای ملایم هنگام فرارسیدن زمان مطالعه"
              />

              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                  پیش‌نمایش صدای یادآور
                </span>
                <button
                  type="button"
                  onClick={() => playReminderChime()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors duration-200 active:scale-[0.97]"
                >
                  <Volume2 className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                  تست صدا
                </button>
              </div>

              {notificationPermission !== 'unsupported' && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-zinc-800 dark:text-zinc-100">
                      اعلان سیستمی مرورگر
                    </p>
                    <p className="text-[11.5px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      {notificationPermission === 'granted'
                        ? 'مجوز اعلان فعال است.'
                        : notificationPermission === 'denied'
                          ? 'دسترسی اعلان در مرورگر مسدود شده است.'
                          : 'برای دریافت نوتیفیکیشن، دسترسی را فعال کنید.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={notificationPermission === 'granted'}
                    onClick={onRequestNotification}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-700 disabled:opacity-50 transition-colors duration-200 whitespace-nowrap"
                  >
                    <Bell className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                    {notificationPermission === 'granted' ? 'فعال' : 'فعال‌سازی'}
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Section 4: مدیریت داده‌ها */}
          <section className="space-y-3" aria-label="مدیریت داده‌ها">
            <h3 className="text-[11.5px] font-semibold text-zinc-400 dark:text-zinc-500 px-1">
              مدیریت درس‌ها و پشتیبان‌گیری
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSubjects();
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F6F6F9] dark:bg-zinc-900/70 hover:bg-[#ECECF2] dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-all duration-200 active:scale-[0.98]"
              >
                <BookOpen className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                مدیریت درس‌ها
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onExportBackup();
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F6F6F9] dark:bg-zinc-900/70 hover:bg-[#ECECF2] dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-all duration-200 active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                خروجی JSON
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[#F6F6F9] dark:bg-zinc-900/70 hover:bg-[#ECECF2] dark:hover:bg-zinc-800 text-xs font-medium text-zinc-700 dark:text-zinc-200 transition-all duration-200 active:scale-[0.98]"
              >
                <Upload className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
                ورودی JSON
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <PWAInstallButton variant="button" />

              {taskCount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDeleteAll();
                  }}
                  className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50/80 dark:bg-rose-950/30 hover:bg-rose-100/80 dark:hover:bg-rose-950/50 text-xs font-medium text-rose-600 dark:text-rose-400 transition-all duration-200 active:scale-[0.98]"
                >
                  <Trash2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  حذف همه تکالیف
                </button>
              )}
            </div>
          </section>
        </div>

        {/* Clean footer */}
        <div className="flex items-center justify-between gap-3 px-6 py-3.5 border-t border-zinc-100 dark:border-zinc-800/80 shrink-0">
          <button
            type="button"
            disabled={isDefault}
            onClick={onResetSettings}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-40 rounded-xl transition-colors duration-200"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            بازگردانی پیش‌فرض‌ها
          </button>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center px-5 py-2 text-xs font-semibold text-white bg-accent rounded-full transition-all duration-200 ease-smooth active:scale-[0.97]"
          >
            تأیید و بستن
          </button>
        </div>
      </div>
    </div>
  );
}
