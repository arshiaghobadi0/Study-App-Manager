use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PriorityLevel {
    High,
    Medium,
    Low,
}

impl PriorityLevel {
    pub const ALL: [PriorityLevel; 3] = [
        PriorityLevel::High,
        PriorityLevel::Medium,
        PriorityLevel::Low,
    ];

    pub fn weight(self) -> u8 {
        match self {
            PriorityLevel::High => 0,
            PriorityLevel::Medium => 1,
            PriorityLevel::Low => 2,
        }
    }

    pub fn label_fa(self) -> &'static str {
        match self {
            PriorityLevel::High => "بالا",
            PriorityLevel::Medium => "متوسط",
            PriorityLevel::Low => "عادی",
        }
    }

    pub fn tag_fa(self) -> &'static str {
        match self {
            PriorityLevel::High => "#فوری",
            PriorityLevel::Medium => "#متوسط",
            PriorityLevel::Low => "#عادی",
        }
    }

    pub fn prefix_bangs(self) -> &'static str {
        match self {
            PriorityLevel::High => "!!! ",
            PriorityLevel::Medium => "!! ",
            PriorityLevel::Low => "",
        }
    }
}

impl fmt::Display for PriorityLevel {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.label_fa())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubjectCategory {
    pub id: String,
    pub name: String,
    pub color: String,
}

impl fmt::Display for SubjectCategory {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.name)
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StudyTask {
    pub id: String,
    pub title: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(rename = "dateISO")]
    pub date_iso: String,
    pub subject_id: String,
    pub priority: PriorityLevel,
    pub completed: bool,
    pub reminder_enabled: bool,
    pub reminder_time: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub reminder_dismissed_at: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none", rename = "snoozedUntilISO")]
    pub snoozed_until_iso: Option<String>,
    pub created_at: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub deleted_at: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum CompletionFilter {
    All,
    Pending,
    Completed,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TaskFilterState {
    pub subject_id: Option<String>,
    pub priority: Option<PriorityLevel>,
    pub completion: CompletionFilter,
    pub search: String,
    pub date_iso: Option<String>,
    pub only_reminders: bool,
}

impl Default for TaskFilterState {
    fn default() -> Self {
        Self {
            subject_id: None,
            priority: None,
            completion: CompletionFilter::All,
            search: String::new(),
            date_iso: None,
            only_reminders: false,
        }
    }
}

impl TaskFilterState {
    pub fn has_active_filters(&self) -> bool {
        self.subject_id.is_some()
            || self.priority.is_some()
            || self.completion != CompletionFilter::All
            || self.date_iso.is_some()
            || self.only_reminders
            || !self.search.trim().is_empty()
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WorkspaceViewMode {
    Board,
    Analytics,
    Trash,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SidebarPreset {
    Today,
    Completed,
    HighPriority,
    AllWeek,
    Reminders,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ThemeMode {
    Light,
    Dark,
}

impl ThemeMode {
    pub fn toggled(self) -> Self {
        match self {
            ThemeMode::Light => ThemeMode::Dark,
            ThemeMode::Dark => ThemeMode::Light,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccentPresetId {
    Coral,
    Blue,
    Emerald,
    Violet,
    Amber,
    Slate,
}

impl AccentPresetId {
    pub const ALL: [AccentPresetId; 6] = [
        AccentPresetId::Coral,
        AccentPresetId::Blue,
        AccentPresetId::Emerald,
        AccentPresetId::Violet,
        AccentPresetId::Amber,
        AccentPresetId::Slate,
    ];

    pub fn label_fa(self) -> &'static str {
        match self {
            AccentPresetId::Coral => "مرجانی",
            AccentPresetId::Blue => "آبی",
            AccentPresetId::Emerald => "زمردی",
            AccentPresetId::Violet => "بنفش",
            AccentPresetId::Amber => "کهربایی",
            AccentPresetId::Slate => "ذغالی",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum CalendarDisplayMode {
    Dual,
    Jalali,
    Gregorian,
}

impl CalendarDisplayMode {
    pub const ALL: [CalendarDisplayMode; 3] = [
        CalendarDisplayMode::Dual,
        CalendarDisplayMode::Jalali,
        CalendarDisplayMode::Gregorian,
    ];

    pub fn label_fa(self) -> &'static str {
        match self {
            CalendarDisplayMode::Dual => "دوگانه",
            CalendarDisplayMode::Jalali => "فقط شمسی",
            CalendarDisplayMode::Gregorian => "فقط میلادی",
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum DensityMode {
    Airy,
    Compact,
}

impl DensityMode {
    pub const ALL: [DensityMode; 2] = [DensityMode::Airy, DensityMode::Compact];

    pub fn label_fa(self) -> &'static str {
        match self {
            DensityMode::Airy => "خلوت",
            DensityMode::Compact => "فشرده",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub accent_color: AccentPresetId,
    pub calendar_display: CalendarDisplayMode,
    pub density: DensityMode,
    pub show_completed_tasks: bool,
    pub show_task_notes: bool,
    pub smooth_animations: bool,
    pub reminder_sound_enabled: bool,
    pub os_notifications_enabled: bool,
    pub default_priority: PriorityLevel,
    pub default_reminder_enabled: bool,
    pub default_reminder_time: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            accent_color: AccentPresetId::Coral,
            calendar_display: CalendarDisplayMode::Dual,
            density: DensityMode::Airy,
            show_completed_tasks: true,
            show_task_notes: true,
            smooth_animations: true,
            reminder_sound_enabled: true,
            os_notifications_enabled: true,
            default_priority: PriorityLevel::Medium,
            default_reminder_enabled: false,
            default_reminder_time: "18:00".to_string(),
        }
    }
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct WeeklyStats {
    pub total: usize,
    pub completed: usize,
    pub remaining: usize,
    pub high_priority: usize,
    pub completion_rate: u32,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct SidebarCounts {
    pub today: usize,
    pub completed: usize,
    pub high_priority: usize,
    pub all_week: usize,
    pub reminders: usize,
    pub by_subject: HashMap<String, usize>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DailyProgressPoint {
    pub date_iso: String,
    pub weekday_fa: String,
    pub jalali_short: String,
    pub gregorian_short: String,
    pub completed: usize,
    pub remaining: usize,
    pub total: usize,
    pub completion_rate: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WeeklyProgressSummary {
    pub days: Vec<DailyProgressPoint>,
    pub total_tasks: usize,
    pub completed_tasks: usize,
    pub remaining_tasks: usize,
    pub completion_rate: u32,
    pub max_daily_tasks: usize,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct PrintScheduleOptions {
    pub include_completed: bool,
    pub include_notes: bool,
}

impl Default for PrintScheduleOptions {
    fn default() -> Self {
        Self {
            include_completed: true,
            include_notes: true,
        }
    }
}

pub fn default_subjects() -> Vec<SubjectCategory> {
    vec![
        SubjectCategory {
            id: "math".to_string(),
            name: "ریاضی".to_string(),
            color: "#2563eb".to_string(),
        },
        SubjectCategory {
            id: "physics".to_string(),
            name: "فیزیک".to_string(),
            color: "#0891b2".to_string(),
        },
        SubjectCategory {
            id: "literature".to_string(),
            name: "ادبیات فارسی".to_string(),
            color: "#d97706".to_string(),
        },
        SubjectCategory {
            id: "english".to_string(),
            name: "زبان انگلیسی".to_string(),
            color: "#059669".to_string(),
        },
        SubjectCategory {
            id: "chemistry".to_string(),
            name: "شیمی و علوم".to_string(),
            color: "#7c3aed".to_string(),
        },
        SubjectCategory {
            id: "cs".to_string(),
            name: "برنامه‌نویسی".to_string(),
            color: "#dc2626".to_string(),
        },
    ]
}

pub const SUBJECT_COLOR_SWATCHES: [&str; 8] = [
    "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#7c3aed", "#db2777", "#4f46e5",
];
