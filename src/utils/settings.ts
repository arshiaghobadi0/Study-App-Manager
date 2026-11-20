import type { PriorityLevel } from '../types/study';

export type AccentColorId = 'coral' | 'blue' | 'emerald' | 'violet' | 'amber';
export type CalendarDisplayMode = 'dual' | 'jalali' | 'gregorian';
export type DensityMode = 'airy' | 'compact';

export interface AppSettings {
  accentColor: AccentColorId;
  calendarDisplay: CalendarDisplayMode;
  density: DensityMode;
  showCompletedTasks: boolean;
  showTaskNotes: boolean;
  defaultPriority: PriorityLevel;
  defaultReminderEnabled: boolean;
  defaultReminderTime: string;
  reminderSoundEnabled: boolean;
  smoothAnimations: boolean;
}

export interface AccentPreset {
  id: AccentColorId;
  label: string;
  light: string;
  lightHover: string;
  dark: string;
  shadow: string;
}

export const SETTINGS_STORAGE_KEY = 'study_planner_settings_v1';

export const ACCENT_PRESETS: Record<AccentColorId, AccentPreset> = {
  coral: {
    id: 'coral',
    label: 'مرجانی',
    light: '#E14E43',
    lightHover: '#CC3F35',
    dark: '#F87171',
    shadow: 'rgba(225, 78, 67, 0.32)',
  },
  blue: {
    id: 'blue',
    label: 'آبی',
    light: '#2F7CE6',
    lightHover: '#2368C9',
    dark: '#60A5FA',
    shadow: 'rgba(47, 124, 230, 0.32)',
  },
  emerald: {
    id: 'emerald',
    label: 'زمردی',
    light: '#169663',
    lightHover: '#117D52',
    dark: '#34D399',
    shadow: 'rgba(22, 150, 99, 0.32)',
  },
  violet: {
    id: 'violet',
    label: 'بنفش',
    light: '#7C5CE6',
    lightHover: '#6746D4',
    dark: '#A78BFA',
    shadow: 'rgba(124, 92, 230, 0.32)',
  },
  amber: {
    id: 'amber',
    label: 'کهربایی',
    light: '#D97706',
    lightHover: '#B86204',
    dark: '#FBBF24',
    shadow: 'rgba(217, 119, 6, 0.32)',
  },
};

export const ACCENT_PRESET_LIST: AccentPreset[] = [
  ACCENT_PRESETS.coral,
  ACCENT_PRESETS.blue,
  ACCENT_PRESETS.emerald,
  ACCENT_PRESETS.violet,
  ACCENT_PRESETS.amber,
];

export const DEFAULT_APP_SETTINGS: AppSettings = {
  accentColor: 'coral',
  calendarDisplay: 'dual',
  density: 'airy',
  showCompletedTasks: true,
  showTaskNotes: true,
  defaultPriority: 'medium',
  defaultReminderEnabled: true,
  defaultReminderTime: '18:00',
  reminderSoundEnabled: true,
  smoothAnimations: true,
};

const VALID_ACCENTS = new Set<AccentColorId>(['coral', 'blue', 'emerald', 'violet', 'amber']);
const VALID_CALENDARS = new Set<CalendarDisplayMode>(['dual', 'jalali', 'gregorian']);
const VALID_DENSITIES = new Set<DensityMode>(['airy', 'compact']);
const VALID_PRIORITIES = new Set<PriorityLevel>(['high', 'medium', 'low']);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isValidTimeHHMM(value: unknown): value is string {
  return typeof value === 'string' && TIME_RE.test(value);
}

export function normalizeAppSettings(raw: unknown): AppSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_APP_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;

  const accentColor = VALID_ACCENTS.has(obj.accentColor as AccentColorId)
    ? (obj.accentColor as AccentColorId)
    : DEFAULT_APP_SETTINGS.accentColor;

  const calendarDisplay = VALID_CALENDARS.has(obj.calendarDisplay as CalendarDisplayMode)
    ? (obj.calendarDisplay as CalendarDisplayMode)
    : DEFAULT_APP_SETTINGS.calendarDisplay;

  const density = VALID_DENSITIES.has(obj.density as DensityMode)
    ? (obj.density as DensityMode)
    : DEFAULT_APP_SETTINGS.density;

  const defaultPriority = VALID_PRIORITIES.has(obj.defaultPriority as PriorityLevel)
    ? (obj.defaultPriority as PriorityLevel)
    : DEFAULT_APP_SETTINGS.defaultPriority;

  return {
    accentColor,
    calendarDisplay,
    density,
    showCompletedTasks:
      typeof obj.showCompletedTasks === 'boolean'
        ? obj.showCompletedTasks
        : DEFAULT_APP_SETTINGS.showCompletedTasks,
    showTaskNotes:
      typeof obj.showTaskNotes === 'boolean'
        ? obj.showTaskNotes
        : DEFAULT_APP_SETTINGS.showTaskNotes,
    defaultPriority,
    defaultReminderEnabled:
      typeof obj.defaultReminderEnabled === 'boolean'
        ? obj.defaultReminderEnabled
        : DEFAULT_APP_SETTINGS.defaultReminderEnabled,
    defaultReminderTime: isValidTimeHHMM(obj.defaultReminderTime)
      ? obj.defaultReminderTime
      : DEFAULT_APP_SETTINGS.defaultReminderTime,
    reminderSoundEnabled:
      typeof obj.reminderSoundEnabled === 'boolean'
        ? obj.reminderSoundEnabled
        : DEFAULT_APP_SETTINGS.reminderSoundEnabled,
    smoothAnimations:
      typeof obj.smoothAnimations === 'boolean'
        ? obj.smoothAnimations
        : DEFAULT_APP_SETTINGS.smoothAnimations,
  };
}

export function getAccentPreset(id: AccentColorId): AccentPreset {
  return ACCENT_PRESETS[id] ?? ACCENT_PRESETS.coral;
}

export function loadAppSettings(): AppSettings {
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_APP_SETTINGS };
    return normalizeAppSettings(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_APP_SETTINGS };
  }
}

export function saveAppSettings(settings: AppSettings): void {
  try {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

export function applySettingsToDocument(settings: AppSettings): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const preset = getAccentPreset(settings.accentColor);
  root.style.setProperty('--accent', preset.light);
  root.style.setProperty('--accent-hover', preset.lightHover);
  root.style.setProperty('--accent-dark', preset.dark);
  root.style.setProperty('--accent-shadow', preset.shadow);
  root.dataset.motion = settings.smoothAnimations ? 'smooth' : 'reduced';
}
