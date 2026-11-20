use crate::analytics::build_weekly_progress_series;
use crate::backup::{
    apply_imported_backup, find_latest_backup_file, parse_backup_json, save_backup_to_downloads,
    ImportMode,
};
use crate::jalali::{
    format_persian_usize, format_week_span_summary, get_today_iso, get_week_days,
    to_persian_digits, WeekDayInfo, WeekSpanSummary,
};
use crate::models::{
    AccentPresetId, AppSettings, CalendarDisplayMode, CompletionFilter, DensityMode, PriorityLevel,
    PrintScheduleOptions, SidebarCounts, SidebarPreset, StudyTask, SubjectCategory,
    TaskFilterState, ThemeMode, WeeklyProgressSummary, WeeklyStats, WorkspaceViewMode,
    SUBJECT_COLOR_SWATCHES,
};
use crate::notifier::{open_path_in_os, play_system_chime, send_desktop_notification};
use crate::pdf_export::{save_pdf_to_downloads, save_printable_html_to_downloads};
use crate::settings::{build_palette, is_valid_time_hhmm};
use crate::storage::{load_state, save_state, PersistedAppState};
use crate::tasks::{
    compute_sidebar_counts, compute_snooze_until_iso, compute_weekly_stats,
    expand_task_dates_for_week, filter_tasks, get_due_reminder_tasks, group_tasks_by_date,
    remove_tasks_by_scope, DeleteScope,
};
use crate::ui::board::view_workspace;
use crate::ui::modals::view_active_modal;
use crate::ui::sidebar::view_sidebar;
use crate::ui::{accent_button_style, fa_bold};
use chrono::Local;
use iced::alignment::Horizontal;
use iced::widget::{button, container, row, stack};
use iced::{Alignment, Background, Color, Element, Length, Padding, Subscription, Task, Theme};
use std::collections::{HashMap, HashSet};
use std::fs;
use std::time::Duration;
use uuid::Uuid;

#[derive(Debug, Clone)]
pub struct TaskFormState {
    pub editing_id: Option<String>,
    pub title: String,
    pub notes: String,
    pub date_iso: String,
    pub repeat_all_week: bool,
    pub subject_id: String,
    pub priority: PriorityLevel,
    pub reminder_enabled: bool,
    pub reminder_time: String,
    pub error: Option<String>,
}

#[derive(Debug, Clone)]
pub enum ActiveModal {
    TaskForm(TaskFormState),
    Settings,
    Subjects {
        name: String,
        color: String,
    },
    ImportBackup {
        raw_json: String,
        file_path: String,
        mode: ImportMode,
        apply_theme: bool,
        error: Option<String>,
    },
    PrintExport,
    ConfirmDeleteAll {
        scope: DeleteScope,
        permanent: bool,
    },
}

#[derive(Debug, Clone)]
pub enum Message {
    NoOp,
    ReminderTick,
    ToggleSidebar,
    ToggleTheme,
    SetTheme(ThemeMode),
    ToggleAnalyticsView,
    SelectViewMode(WorkspaceViewMode),
    ChangeWeekOffset(i32),
    ResetWeekOffset,
    SearchChanged(String),
    ApplySidebarPreset(SidebarPreset),
    SelectSubjectFilter(String),
    SelectPriorityTag(Option<PriorityLevel>),
    ResetFilters,

    // Inline quick-add
    QuickAddDraftChanged(String, String),
    QuickAddAllWeekToggled(String, bool),
    SubmitQuickAdd(String),

    // Task CRUD
    OpenNewTaskModal(Option<String>),
    OpenEditTaskModal(String),
    TaskFormTitleChanged(String),
    TaskFormNotesChanged(String),
    TaskFormDateChanged(String),
    TaskFormAllWeekToggled(bool),
    TaskFormSubjectChanged(String),
    TaskFormPriorityChanged(PriorityLevel),
    TaskFormReminderToggled(bool),
    TaskFormReminderTimeChanged(String),
    SubmitTaskForm,
    ToggleTaskComplete(String),
    ToggleTaskReminder(String),
    DeleteTask(String),
    RestoreFromTrash(String),
    PermanentDeleteFromTrash(String),
    EmptyTrash,

    // Reminders
    SnoozeReminder(String, i64),
    DismissReminder(String),

    // Settings
    OpenSettingsModal,
    SetAccentColor(AccentPresetId),
    SetCalendarDisplay(CalendarDisplayMode),
    SetDensity(DensityMode),
    SetShowCompletedTasks(bool),
    SetShowTaskNotes(bool),
    SetSmoothAnimations(bool),
    SetDefaultPriority(PriorityLevel),
    SetDefaultReminderEnabled(bool),
    SetDefaultReminderTime(String),
    SetReminderSoundEnabled(bool),
    SetOsNotificationsEnabled(bool),
    TestReminderNotification,
    ResetSettings,

    // Subjects
    OpenSubjectsModal,
    SubjectDraftNameChanged(String),
    SubjectDraftColorChanged(String),
    AddSubject,
    DeleteSubject(String),

    // Backup / Import
    ExportJsonBackup,
    OpenImportModal,
    ImportPathChanged(String),
    ImportRawJsonChanged(String),
    ImportModeChanged(ImportMode),
    ImportApplyThemeToggled(bool),
    LoadLatestBackupFile,
    LoadBackupFromPath,
    ApplyImportBackup,

    // Print / PDF
    OpenPrintModal,
    PrintIncludeCompletedToggled(bool),
    PrintIncludeNotesToggled(bool),
    ExportPdfSchedule,
    ExportPrintableHtml,

    // Delete All
    OpenDeleteAllModal,
    DeleteAllScopeChanged(DeleteScope),
    DeleteAllPermanentToggled(bool),
    ConfirmDeleteAll,

    CloseModal,
    ClearFeedback,
}

struct DerivedViewCache {
    today_iso: String,
    week_days: Vec<WeekDayInfo>,
    week_span: WeekSpanSummary,
    subjects_by_id: HashMap<String, SubjectCategory>,
    sidebar_counts: SidebarCounts,
    weekly_stats: WeeklyStats,
    weekly_progress: WeeklyProgressSummary,
    tasks_by_date: HashMap<String, Vec<StudyTask>>,
    due_reminders: Vec<StudyTask>,
    board_heading: String,
}

pub struct StudyPlannerApp {
    tasks: Vec<StudyTask>,
    trash_tasks: Vec<StudyTask>,
    subjects: Vec<SubjectCategory>,
    theme: ThemeMode,
    settings: AppSettings,

    week_offset: i32,
    view_mode: WorkspaceViewMode,
    sidebar_open: bool,
    filters: TaskFilterState,
    print_options: PrintScheduleOptions,

    quick_add_drafts: HashMap<String, String>,
    quick_add_all_week: HashMap<String, bool>,
    active_modal: Option<ActiveModal>,
    feedback_message: Option<String>,
    announced_reminders: HashSet<String>,
    derived: DerivedViewCache,
}

impl StudyPlannerApp {
    pub fn new() -> (Self, Task<Message>) {
        let persisted = load_state();
        let initial_cache = Self::build_derived(
            &persisted.tasks,
            &persisted.subjects,
            &persisted.settings,
            0,
            WorkspaceViewMode::Board,
            &TaskFilterState::default(),
        );
        let app = Self {
            tasks: persisted.tasks,
            trash_tasks: persisted.trash_tasks,
            subjects: persisted.subjects,
            theme: persisted.theme,
            settings: persisted.settings,
            week_offset: 0,
            view_mode: WorkspaceViewMode::Board,
            sidebar_open: true,
            filters: TaskFilterState::default(),
            print_options: PrintScheduleOptions::default(),
            quick_add_drafts: HashMap::new(),
            quick_add_all_week: HashMap::new(),
            active_modal: None,
            feedback_message: None,
            announced_reminders: HashSet::new(),
            derived: initial_cache,
        };
        (app, Task::none())
    }

    fn build_derived(
        tasks: &[StudyTask],
        subjects: &[SubjectCategory],
        settings: &AppSettings,
        week_offset: i32,
        view_mode: WorkspaceViewMode,
        filters: &TaskFilterState,
    ) -> DerivedViewCache {
        let today_iso = get_today_iso();
        let week_days = get_week_days(week_offset, &today_iso);
        let week_isos: Vec<String> = week_days.iter().map(|d| d.date_iso.clone()).collect();
        let week_span = format_week_span_summary(&week_days);

        let subjects_by_id: HashMap<String, SubjectCategory> = subjects
            .iter()
            .map(|s| (s.id.clone(), s.clone()))
            .collect();

        let sidebar_counts = compute_sidebar_counts(tasks, &week_isos, &today_iso);
        let weekly_stats = compute_weekly_stats(tasks, &week_isos);
        let weekly_progress = build_weekly_progress_series(&week_days, tasks);

        let filtered = filter_tasks(tasks, filters, settings.show_completed_tasks);
        let tasks_by_date = group_tasks_by_date(&filtered, &week_isos);
        let due_reminders = get_due_reminder_tasks(tasks, Local::now());

        let board_heading = if view_mode == WorkspaceViewMode::Trash {
            "اخیراً حذف‌شده".to_string()
        } else if view_mode == WorkspaceViewMode::Analytics {
            "آمار پیشرفت هفتگی".to_string()
        } else if filters.only_reminders {
            "یادآورهای فعال".to_string()
        } else if filters.date_iso.as_deref() == Some(today_iso.as_str()) {
            "تکالیف امروز".to_string()
        } else if let Some(ref sub_id) = filters.subject_id {
            subjects_by_id
                .get(sub_id)
                .map(|s| s.name.clone())
                .unwrap_or_else(|| "برنامه درسی هفتگی".to_string())
        } else if filters.completion == CompletionFilter::Completed {
            "تکمیل‌شده‌ها".to_string()
        } else {
            match filters.priority {
                Some(PriorityLevel::High) => "اولویت بالا".to_string(),
                Some(PriorityLevel::Medium) => "اولویت متوسط".to_string(),
                Some(PriorityLevel::Low) => "اولویت عادی".to_string(),
                None => "برنامه درسی هفتگی".to_string(),
            }
        };

        DerivedViewCache {
            today_iso,
            week_days,
            week_span,
            subjects_by_id,
            sidebar_counts,
            weekly_stats,
            weekly_progress,
            tasks_by_date,
            due_reminders,
            board_heading,
        }
    }

    fn refresh_derived(&mut self) {
        self.derived = Self::build_derived(
            &self.tasks,
            &self.subjects,
            &self.settings,
            self.week_offset,
            self.view_mode,
            &self.filters,
        );
    }

    fn persist(&self) {
        save_state(&PersistedAppState {
            tasks: self.tasks.clone(),
            trash_tasks: self.trash_tasks.clone(),
            subjects: self.subjects.clone(),
            theme: self.theme,
            settings: self.settings.clone(),
        });
    }

    fn default_subject_id(&self) -> String {
        self.subjects
            .first()
            .map(|s| s.id.clone())
            .unwrap_or_else(|| "math".to_string())
    }

    fn check_due_reminders(&mut self) {
        let now = Local::now();
        let due = get_due_reminder_tasks(&self.tasks, now);
        for task in due {
            let key = format!(
                "{}:{}:{}",
                task.id,
                task.reminder_time,
                task.snoozed_until_iso.as_deref().unwrap_or("")
            );
            if self.announced_reminders.insert(key) {
                if self.settings.reminder_sound_enabled {
                    play_system_chime();
                }
                if self.settings.os_notifications_enabled {
                    let subj_name = self
                        .subjects
                        .iter()
                        .find(|s| s.id == task.subject_id)
                        .map(|s| s.name.as_str())
                        .unwrap_or("تکلیف درسی");
                    send_desktop_notification(
                        &format!("یادآور مطالعه: {}", task.title),
                        &format!(
                            "{} · ساعت {}",
                            subj_name,
                            to_persian_digits(&task.reminder_time)
                        ),
                    );
                }
            }
        }
    }

    pub fn title(&self) -> String {
        "برنامه‌ریز درسی هفتگی — Weekly Study Planner (Rust)".to_string()
    }

    pub fn theme(&self) -> Theme {
        match self.theme {
            ThemeMode::Light => Theme::Light,
            ThemeMode::Dark => Theme::Dark,
        }
    }

    pub fn subscription(&self) -> Subscription<Message> {
        iced::time::every(Duration::from_secs(10)).map(|_| Message::ReminderTick)
    }

    pub fn update(&mut self, message: Message) -> Task<Message> {
        let mut needs_refresh = true;
        match message {
            Message::NoOp => {
                needs_refresh = false;
            }
            Message::ReminderTick => {
                self.check_due_reminders();
            }
            Message::ToggleSidebar => {
                self.sidebar_open = !self.sidebar_open;
                needs_refresh = false;
            }
            Message::ToggleTheme => {
                self.theme = self.theme.toggled();
                self.persist();
                needs_refresh = false;
            }
            Message::SetTheme(mode) => {
                self.theme = mode;
                self.persist();
                needs_refresh = false;
            }
            Message::ToggleAnalyticsView => {
                self.view_mode = if self.view_mode == WorkspaceViewMode::Analytics {
                    WorkspaceViewMode::Board
                } else {
                    WorkspaceViewMode::Analytics
                };
            }
            Message::SelectViewMode(mode) => {
                self.view_mode = mode;
            }
            Message::ChangeWeekOffset(delta) => {
                self.week_offset += delta;
            }
            Message::ResetWeekOffset => {
                self.week_offset = 0;
            }
            Message::SearchChanged(query) => {
                self.view_mode = WorkspaceViewMode::Board;
                self.filters.search = query;
            }
            Message::ApplySidebarPreset(preset) => {
                let today_iso = get_today_iso();
                self.view_mode = WorkspaceViewMode::Board;
                let keep_search = self.filters.search.clone();
                match preset {
                    SidebarPreset::Today => {
                        self.week_offset = 0;
                        self.filters = TaskFilterState {
                            date_iso: Some(today_iso),
                            search: keep_search,
                            ..TaskFilterState::default()
                        };
                    }
                    SidebarPreset::Completed => {
                        self.filters = TaskFilterState {
                            completion: CompletionFilter::Completed,
                            search: keep_search,
                            ..TaskFilterState::default()
                        };
                    }
                    SidebarPreset::HighPriority => {
                        self.filters = TaskFilterState {
                            priority: Some(PriorityLevel::High),
                            completion: CompletionFilter::Pending,
                            search: keep_search,
                            ..TaskFilterState::default()
                        };
                    }
                    SidebarPreset::Reminders => {
                        self.filters = TaskFilterState {
                            only_reminders: true,
                            search: keep_search,
                            ..TaskFilterState::default()
                        };
                    }
                    SidebarPreset::AllWeek => {
                        self.filters = TaskFilterState::default();
                    }
                }
            }
            Message::SelectSubjectFilter(subject_id) => {
                self.view_mode = WorkspaceViewMode::Board;
                self.filters.subject_id = Some(subject_id);
                self.filters.date_iso = None;
                self.filters.only_reminders = false;
                self.filters.completion = CompletionFilter::All;
            }
            Message::SelectPriorityTag(prio) => {
                self.view_mode = WorkspaceViewMode::Board;
                self.filters.priority = prio;
                self.filters.date_iso = None;
                self.filters.only_reminders = false;
            }
            Message::ResetFilters => {
                self.view_mode = WorkspaceViewMode::Board;
                self.filters = TaskFilterState::default();
            }

            // Inline quick-add
            Message::QuickAddDraftChanged(date_iso, value) => {
                self.quick_add_drafts.insert(date_iso, value);
                needs_refresh = false;
            }
            Message::QuickAddAllWeekToggled(date_iso, checked) => {
                self.quick_add_all_week.insert(date_iso, checked);
                needs_refresh = false;
            }
            Message::SubmitQuickAdd(date_iso) => {
                let title = self
                    .quick_add_drafts
                    .get(&date_iso)
                    .map(|s| s.trim().to_string())
                    .unwrap_or_default();
                if !title.is_empty() {
                    let repeat_all = self
                        .quick_add_all_week
                        .get(&date_iso)
                        .copied()
                        .unwrap_or(false);
                    let target_dates = expand_task_dates_for_week(&date_iso, repeat_all);
                    let now_iso = Local::now().to_rfc3339();
                    let subject_id = self
                        .filters
                        .subject_id
                        .clone()
                        .unwrap_or_else(|| self.default_subject_id());

                    for iso in &target_dates {
                        self.tasks.push(StudyTask {
                            id: format!("task-{}", Uuid::new_v4()),
                            title: title.clone(),
                            notes: None,
                            date_iso: iso.clone(),
                            subject_id: subject_id.clone(),
                            priority: self.settings.default_priority,
                            completed: false,
                            reminder_enabled: self.settings.default_reminder_enabled,
                            reminder_time: self.settings.default_reminder_time.clone(),
                            reminder_dismissed_at: None,
                            snoozed_until_iso: None,
                            created_at: now_iso.clone(),
                            deleted_at: None,
                        });
                    }
                    self.quick_add_drafts.remove(&date_iso);
                    self.quick_add_all_week.remove(&date_iso);
                    if target_dates.len() > 1 {
                        self.feedback_message = Some(format!(
                            "تکلیف «{title}» برای تمام ۷ روز هفته (شنبه تا جمعه) ثبت شد."
                        ));
                    }
                    self.persist();
                }
            }

            // Task modal CRUD
            Message::OpenNewTaskModal(initial_date) => {
                let date_iso = initial_date.unwrap_or_else(get_today_iso);
                let subject_id = self
                    .filters
                    .subject_id
                    .clone()
                    .unwrap_or_else(|| self.default_subject_id());
                self.active_modal = Some(ActiveModal::TaskForm(TaskFormState {
                    editing_id: None,
                    title: String::new(),
                    notes: String::new(),
                    date_iso,
                    repeat_all_week: false,
                    subject_id,
                    priority: self.settings.default_priority,
                    reminder_enabled: self.settings.default_reminder_enabled,
                    reminder_time: self.settings.default_reminder_time.clone(),
                    error: None,
                }));
                needs_refresh = false;
            }
            Message::OpenEditTaskModal(task_id) => {
                if let Some(task) = self.tasks.iter().find(|t| t.id == task_id).cloned() {
                    self.active_modal = Some(ActiveModal::TaskForm(TaskFormState {
                        editing_id: Some(task.id),
                        title: task.title,
                        notes: task.notes.unwrap_or_default(),
                        date_iso: task.date_iso,
                        repeat_all_week: false,
                        subject_id: task.subject_id,
                        priority: task.priority,
                        reminder_enabled: task.reminder_enabled,
                        reminder_time: task.reminder_time,
                        error: None,
                    }));
                }
                needs_refresh = false;
            }
            Message::TaskFormTitleChanged(val) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.title = val;
                    form.error = None;
                }
                needs_refresh = false;
            }
            Message::TaskFormNotesChanged(val) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.notes = val;
                }
                needs_refresh = false;
            }
            Message::TaskFormDateChanged(iso) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.date_iso = iso;
                }
                needs_refresh = false;
            }
            Message::TaskFormAllWeekToggled(checked) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.repeat_all_week = checked;
                }
                needs_refresh = false;
            }
            Message::TaskFormSubjectChanged(sub_id) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.subject_id = sub_id;
                }
                needs_refresh = false;
            }
            Message::TaskFormPriorityChanged(prio) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.priority = prio;
                }
                needs_refresh = false;
            }
            Message::TaskFormReminderToggled(enabled) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.reminder_enabled = enabled;
                }
                needs_refresh = false;
            }
            Message::TaskFormReminderTimeChanged(val) => {
                if let Some(ActiveModal::TaskForm(form)) = &mut self.active_modal {
                    form.reminder_time = val;
                    form.error = None;
                }
                needs_refresh = false;
            }
            Message::SubmitTaskForm => {
                let Some(ActiveModal::TaskForm(form)) = self.active_modal.clone() else {
                    return Task::none();
                };
                let title = form.title.trim().to_string();
                if title.is_empty() {
                    if let Some(ActiveModal::TaskForm(f)) = &mut self.active_modal {
                        f.error = Some("لطفاً عنوان تکلیف را وارد کنید.".to_string());
                    }
                    return Task::none();
                }
                let reminder_time = if is_valid_time_hhmm(&form.reminder_time) {
                    form.reminder_time.trim().to_string()
                } else if form.reminder_enabled {
                    if let Some(ActiveModal::TaskForm(f)) = &mut self.active_modal {
                        f.error =
                            Some("فرمت ساعت یادآور باید HH:MM باشد (مثلاً 18:30).".to_string());
                    }
                    return Task::none();
                } else {
                    self.settings.default_reminder_time.clone()
                };
                let notes = {
                    let trimmed = form.notes.trim();
                    if trimmed.is_empty() {
                        None
                    } else {
                        Some(trimmed.to_string())
                    }
                };

                if let Some(edit_id) = form.editing_id {
                    if let Some(task) = self.tasks.iter_mut().find(|t| t.id == edit_id) {
                        task.title = title;
                        task.notes = notes;
                        task.date_iso = form.date_iso;
                        task.subject_id = form.subject_id;
                        task.priority = form.priority;
                        task.reminder_enabled = form.reminder_enabled;
                        task.reminder_time = reminder_time;
                        task.reminder_dismissed_at = None;
                        task.snoozed_until_iso = None;
                    }
                } else {
                    let target_dates =
                        expand_task_dates_for_week(&form.date_iso, form.repeat_all_week);
                    let now_iso = Local::now().to_rfc3339();
                    for iso in &target_dates {
                        self.tasks.push(StudyTask {
                            id: format!("task-{}", Uuid::new_v4()),
                            title: title.clone(),
                            notes: notes.clone(),
                            date_iso: iso.clone(),
                            subject_id: form.subject_id.clone(),
                            priority: form.priority,
                            completed: false,
                            reminder_enabled: form.reminder_enabled,
                            reminder_time: reminder_time.clone(),
                            reminder_dismissed_at: None,
                            snoozed_until_iso: None,
                            created_at: now_iso.clone(),
                            deleted_at: None,
                        });
                    }
                    if target_dates.len() > 1 {
                        self.feedback_message = Some(format!(
                            "تکلیف «{title}» برای تمام ۷ روز هفته (شنبه تا جمعه) ثبت شد."
                        ));
                    }
                }
                self.active_modal = None;
                self.persist();
            }
            Message::ToggleTaskComplete(task_id) => {
                if let Some(task) = self.tasks.iter_mut().find(|t| t.id == task_id) {
                    task.completed = !task.completed;
                    task.reminder_dismissed_at = if task.completed {
                        Some(Local::now().to_rfc3339())
                    } else {
                        None
                    };
                    self.persist();
                }
            }
            Message::ToggleTaskReminder(task_id) => {
                if let Some(task) = self.tasks.iter_mut().find(|t| t.id == task_id) {
                    task.reminder_enabled = !task.reminder_enabled;
                    task.reminder_dismissed_at = None;
                    task.snoozed_until_iso = None;
                    self.persist();
                }
            }
            Message::DeleteTask(task_id) => {
                if let Some(pos) = self.tasks.iter().position(|t| t.id == task_id) {
                    let mut removed = self.tasks.remove(pos);
                    removed.deleted_at = Some(Local::now().to_rfc3339());
                    self.trash_tasks.insert(0, removed);
                    self.persist();
                }
            }
            Message::RestoreFromTrash(task_id) => {
                if let Some(pos) = self.trash_tasks.iter().position(|t| t.id == task_id) {
                    let mut restored = self.trash_tasks.remove(pos);
                    restored.deleted_at = None;
                    self.tasks.push(restored);
                    self.persist();
                }
            }
            Message::PermanentDeleteFromTrash(task_id) => {
                self.trash_tasks.retain(|t| t.id != task_id);
                self.persist();
            }
            Message::EmptyTrash => {
                self.trash_tasks.clear();
                self.persist();
            }

            // Reminders
            Message::SnoozeReminder(task_id, mins) => {
                if let Some(task) = self.tasks.iter_mut().find(|t| t.id == task_id) {
                    task.snoozed_until_iso = Some(compute_snooze_until_iso(mins));
                    self.persist();
                }
            }
            Message::DismissReminder(task_id) => {
                if let Some(task) = self.tasks.iter_mut().find(|t| t.id == task_id) {
                    task.reminder_dismissed_at = Some(Local::now().to_rfc3339());
                    self.persist();
                }
            }

            // Settings
            Message::OpenSettingsModal => {
                self.active_modal = Some(ActiveModal::Settings);
                needs_refresh = false;
            }
            Message::SetAccentColor(preset) => {
                self.settings.accent_color = preset;
                self.persist();
                needs_refresh = false;
            }
            Message::SetCalendarDisplay(mode) => {
                self.settings.calendar_display = mode;
                self.persist();
                needs_refresh = false;
            }
            Message::SetDensity(mode) => {
                self.settings.density = mode;
                self.persist();
                needs_refresh = false;
            }
            Message::SetShowCompletedTasks(val) => {
                self.settings.show_completed_tasks = val;
                self.persist();
            }
            Message::SetShowTaskNotes(val) => {
                self.settings.show_task_notes = val;
                self.persist();
                needs_refresh = false;
            }
            Message::SetSmoothAnimations(val) => {
                self.settings.smooth_animations = val;
                self.persist();
                needs_refresh = false;
            }
            Message::SetDefaultPriority(prio) => {
                self.settings.default_priority = prio;
                self.persist();
                needs_refresh = false;
            }
            Message::SetDefaultReminderEnabled(val) => {
                self.settings.default_reminder_enabled = val;
                self.persist();
                needs_refresh = false;
            }
            Message::SetDefaultReminderTime(val) => {
                self.settings.default_reminder_time = val;
                if is_valid_time_hhmm(&self.settings.default_reminder_time) {
                    self.persist();
                }
                needs_refresh = false;
            }
            Message::SetReminderSoundEnabled(val) => {
                self.settings.reminder_sound_enabled = val;
                self.persist();
                needs_refresh = false;
            }
            Message::SetOsNotificationsEnabled(val) => {
                self.settings.os_notifications_enabled = val;
                self.persist();
                needs_refresh = false;
            }
            Message::TestReminderNotification => {
                if self.settings.reminder_sound_enabled {
                    play_system_chime();
                }
                if self.settings.os_notifications_enabled {
                    send_desktop_notification(
                        "تست یادآور برنامه‌ریز درسی هفتگی",
                        "اعلان بومی دسکتاپ Rust با موفقیت فعال است.",
                    );
                }
                self.feedback_message = Some("پیش‌نمایش صدا و اعلان سیستمی اجرا شد.".to_string());
                needs_refresh = false;
            }
            Message::ResetSettings => {
                self.settings = AppSettings::default();
                self.feedback_message = Some("تنظیمات به حالت پیش‌فرض بازگردانی شد.".to_string());
                self.persist();
            }

            // Subjects
            Message::OpenSubjectsModal => {
                self.active_modal = Some(ActiveModal::Subjects {
                    name: String::new(),
                    color: SUBJECT_COLOR_SWATCHES[0].to_string(),
                });
                needs_refresh = false;
            }
            Message::SubjectDraftNameChanged(val) => {
                if let Some(ActiveModal::Subjects { name, .. }) = &mut self.active_modal {
                    *name = val;
                }
                needs_refresh = false;
            }
            Message::SubjectDraftColorChanged(val) => {
                if let Some(ActiveModal::Subjects { color, .. }) = &mut self.active_modal {
                    *color = val;
                }
                needs_refresh = false;
            }
            Message::AddSubject => {
                let Some(ActiveModal::Subjects { name, color }) = &mut self.active_modal else {
                    return Task::none();
                };
                let trimmed = name.trim().to_string();
                if !trimmed.is_empty() {
                    self.subjects.push(SubjectCategory {
                        id: format!("sub-{}", Uuid::new_v4()),
                        name: trimmed,
                        color: color.clone(),
                    });
                    name.clear();
                    self.persist();
                }
            }
            Message::DeleteSubject(subject_id) => {
                if self.subjects.len() <= 1 {
                    return Task::none();
                }
                self.subjects.retain(|s| s.id != subject_id);
                let fallback = self.default_subject_id();
                for task in &mut self.tasks {
                    if task.subject_id == subject_id {
                        task.subject_id = fallback.clone();
                    }
                }
                if self.filters.subject_id.as_deref() == Some(subject_id.as_str()) {
                    self.filters.subject_id = None;
                }
                self.persist();
            }

            // JSON Backup / Import
            Message::ExportJsonBackup => {
                let today_iso = get_today_iso();
                match save_backup_to_downloads(&self.tasks, &self.subjects, self.theme, &today_iso)
                {
                    Ok((path, summary)) => {
                        self.active_modal = None;
                        self.feedback_message = Some(format!(
                            "پشتیبان JSON ({} تکلیف و {} درس) در مسیر {} ذخیره شد.",
                            format_persian_usize(summary.task_count),
                            format_persian_usize(summary.subject_count),
                            path.display()
                        ));
                    }
                    Err(e) => {
                        self.feedback_message = Some(e);
                    }
                }
                needs_refresh = false;
            }
            Message::OpenImportModal => {
                let latest = find_latest_backup_file()
                    .map(|p| p.to_string_lossy().into_owned())
                    .unwrap_or_default();
                self.active_modal = Some(ActiveModal::ImportBackup {
                    raw_json: String::new(),
                    file_path: latest,
                    mode: ImportMode::Merge,
                    apply_theme: false,
                    error: None,
                });
                needs_refresh = false;
            }
            Message::ImportPathChanged(val) => {
                if let Some(ActiveModal::ImportBackup {
                    file_path, error, ..
                }) = &mut self.active_modal
                {
                    *file_path = val;
                    *error = None;
                }
                needs_refresh = false;
            }
            Message::ImportRawJsonChanged(val) => {
                if let Some(ActiveModal::ImportBackup {
                    raw_json, error, ..
                }) = &mut self.active_modal
                {
                    *raw_json = val;
                    *error = None;
                }
                needs_refresh = false;
            }
            Message::ImportModeChanged(next_mode) => {
                if let Some(ActiveModal::ImportBackup { mode, .. }) = &mut self.active_modal {
                    *mode = next_mode;
                }
                needs_refresh = false;
            }
            Message::ImportApplyThemeToggled(val) => {
                if let Some(ActiveModal::ImportBackup { apply_theme, .. }) = &mut self.active_modal
                {
                    *apply_theme = val;
                }
                needs_refresh = false;
            }
            Message::LoadLatestBackupFile => {
                if let Some(path) = find_latest_backup_file() {
                    match fs::read_to_string(&path) {
                        Ok(content) => {
                            if let Some(ActiveModal::ImportBackup {
                                raw_json,
                                file_path,
                                error,
                                ..
                            }) = &mut self.active_modal
                            {
                                *file_path = path.to_string_lossy().into_owned();
                                *raw_json = content;
                                *error = None;
                            }
                        }
                        Err(e) => {
                            if let Some(ActiveModal::ImportBackup { error, .. }) =
                                &mut self.active_modal
                            {
                                *error = Some(format!("خطا در خواندن فایل: {e}"));
                            }
                        }
                    }
                } else if let Some(ActiveModal::ImportBackup { error, .. }) = &mut self.active_modal
                {
                    *error = Some(
                        "هیچ فایل پشتیبانی در پوشه Downloads/WeeklyStudyPlanner یافت نشد."
                            .to_string(),
                    );
                }
                needs_refresh = false;
            }
            Message::LoadBackupFromPath => {
                let path_str = match &self.active_modal {
                    Some(ActiveModal::ImportBackup { file_path, .. }) => file_path.trim().to_string(),
                    _ => return Task::none(),
                };
                if !path_str.is_empty() {
                    match fs::read_to_string(&path_str) {
                        Ok(content) => {
                            if let Some(ActiveModal::ImportBackup {
                                raw_json, error, ..
                            }) = &mut self.active_modal
                            {
                                *raw_json = content;
                                *error = None;
                            }
                        }
                        Err(e) => {
                            if let Some(ActiveModal::ImportBackup { error, .. }) =
                                &mut self.active_modal
                            {
                                *error = Some(format!("خطا در خواندن مسیر فایل: {e}"));
                            }
                        }
                    }
                }
                needs_refresh = false;
            }
            Message::ApplyImportBackup => {
                let Some(ActiveModal::ImportBackup {
                    raw_json,
                    mode,
                    apply_theme,
                    ..
                }) = self.active_modal.clone()
                else {
                    return Task::none();
                };

                match parse_backup_json(&raw_json) {
                    Ok(parsed) => {
                        let applied =
                            apply_imported_backup(mode, &parsed, &self.tasks, &self.subjects);
                        let imported_count = parsed.tasks.len();
                        let subject_count = applied.subjects.len();
                        self.tasks = applied.tasks;
                        self.subjects = applied.subjects;
                        if apply_theme {
                            if let Some(t) = parsed.theme {
                                self.theme = t;
                            }
                        }
                        self.active_modal = None;
                        let mode_label = match mode {
                            ImportMode::Replace => "جایگزین",
                            ImportMode::Merge => "ادغام",
                        };
                        self.feedback_message = Some(format!(
                            "پشتیبان JSON با موفقیت {mode_label} شد ({} تکلیف و {} درس).",
                            format_persian_usize(imported_count),
                            format_persian_usize(subject_count)
                        ));
                        self.persist();
                    }
                    Err(err) => {
                        if let Some(ActiveModal::ImportBackup { error, .. }) =
                            &mut self.active_modal
                        {
                            *error = Some(err);
                        }
                        needs_refresh = false;
                    }
                }
            }

            // Print / PDF
            Message::OpenPrintModal => {
                self.active_modal = Some(ActiveModal::PrintExport);
                needs_refresh = false;
            }
            Message::PrintIncludeCompletedToggled(val) => {
                self.print_options.include_completed = val;
                needs_refresh = false;
            }
            Message::PrintIncludeNotesToggled(val) => {
                self.print_options.include_notes = val;
                needs_refresh = false;
            }
            Message::ExportPdfSchedule => {
                match save_pdf_to_downloads(
                    &self.derived.week_days,
                    &self.tasks,
                    &self.subjects,
                    self.print_options,
                ) {
                    Ok(path) => {
                        open_path_in_os(&path);
                        self.active_modal = None;
                        self.feedback_message = Some(format!(
                            "فایل PDF در مسیر {} ذخیره شد.",
                            path.display()
                        ));
                    }
                    Err(e) => {
                        self.feedback_message = Some(e);
                    }
                }
                needs_refresh = false;
            }
            Message::ExportPrintableHtml => {
                match save_printable_html_to_downloads(
                    &self.derived.week_days,
                    &self.tasks,
                    &self.subjects,
                    self.print_options,
                ) {
                    Ok(path) => {
                        open_path_in_os(&path);
                        self.active_modal = None;
                        self.feedback_message = Some(format!(
                            "برگه چاپ فارسی A4 در مسیر {} ذخیره و باز شد.",
                            path.display()
                        ));
                    }
                    Err(e) => {
                        self.feedback_message = Some(e);
                    }
                }
                needs_refresh = false;
            }

            // Delete All
            Message::OpenDeleteAllModal => {
                self.active_modal = Some(ActiveModal::ConfirmDeleteAll {
                    scope: DeleteScope::All,
                    permanent: false,
                });
                needs_refresh = false;
            }
            Message::DeleteAllScopeChanged(next_scope) => {
                if let Some(ActiveModal::ConfirmDeleteAll { scope, .. }) = &mut self.active_modal {
                    *scope = next_scope;
                }
                needs_refresh = false;
            }
            Message::DeleteAllPermanentToggled(val) => {
                if let Some(ActiveModal::ConfirmDeleteAll { permanent, .. }) =
                    &mut self.active_modal
                {
                    *permanent = val;
                }
                needs_refresh = false;
            }
            Message::ConfirmDeleteAll => {
                let Some(ActiveModal::ConfirmDeleteAll { scope, permanent }) =
                    self.active_modal.clone()
                else {
                    return Task::none();
                };
                let week_isos: Vec<String> = self
                    .derived
                    .week_days
                    .iter()
                    .map(|d| d.date_iso.clone())
                    .collect();
                let now_iso = Local::now().to_rfc3339();
                let result = remove_tasks_by_scope(
                    &self.tasks,
                    &self.trash_tasks,
                    scope,
                    &week_isos,
                    permanent,
                    &now_iso,
                );
                self.tasks = result.next_tasks;
                self.trash_tasks = result.next_trash;
                self.active_modal = None;
                if result.removed_count > 0 {
                    self.feedback_message = Some(if permanent {
                        format!(
                            "{} تکلیف به‌صورت دائمی حذف شد.",
                            format_persian_usize(result.removed_count)
                        )
                    } else {
                        format!(
                            "{} تکلیف حذف و به بخش «اخیراً حذف‌شده» منتقل شد.",
                            format_persian_usize(result.removed_count)
                        )
                    });
                    self.persist();
                }
            }

            Message::CloseModal => {
                self.active_modal = None;
                needs_refresh = false;
            }
            Message::ClearFeedback => {
                self.feedback_message = None;
                needs_refresh = false;
            }
        }

        if needs_refresh {
            self.refresh_derived();
        }
        Task::none()
    }

    pub fn view(&self) -> Element<'_, Message> {
        let pal = build_palette(self.theme, self.settings.accent_color);

        let workspace = view_workspace(
            self.sidebar_open,
            self.view_mode,
            self.week_offset,
            &self.derived.week_days,
            &self.derived.week_span,
            &self.derived.today_iso,
            &self.derived.board_heading,
            &self.filters,
            &self.derived.tasks_by_date,
            &self.derived.due_reminders,
            &self.trash_tasks,
            &self.derived.subjects_by_id,
            &self.quick_add_drafts,
            &self.quick_add_all_week,
            &self.derived.weekly_progress,
            &self.settings,
            self.feedback_message.as_deref(),
            pal,
        );

        let mut layout_row = row![workspace]
            .width(Length::Fill)
            .height(Length::Fill);

        if self.sidebar_open {
            let sidebar = view_sidebar(
                self.view_mode,
                &self.filters,
                &self.derived.today_iso,
                &self.derived.sidebar_counts,
                self.trash_tasks.len(),
                &self.subjects,
                self.theme,
                pal,
            );
            layout_row = layout_row.push(container(sidebar).padding(Padding {
                top: 12.0,
                right: 12.0,
                bottom: 12.0,
                left: 0.0,
            }));
        }

        let base_canvas = container(layout_row)
            .width(Length::Fill)
            .height(Length::Fill)
            .style(move |_t| container::Style {
                background: Some(Background::Color(pal.bg_canvas)),
                text_color: Some(pal.text_primary),
                ..container::Style::default()
            });

        // Floating Accent '+' FAB anchored bottom-left (matching RTL Reminders UI)
        let fab_layer = container(
            button(
                fa_bold("+")
                    .size(22)
                    .align_x(Horizontal::Center)
                    .color(Color::WHITE),
            )
            .width(Length::Fixed(46.0))
            .height(Length::Fixed(46.0))
            .padding(0)
            .style(accent_button_style(pal, 99.0))
            .on_press(Message::OpenNewTaskModal(None)),
        )
        .width(Length::Fill)
        .height(Length::Fill)
        .align_x(Alignment::Start)
        .align_y(Alignment::End)
        .padding(24);

        let mut layers: Vec<Element<'_, Message>> = vec![base_canvas.into(), fab_layer.into()];

        if let Some(ref modal) = self.active_modal {
            let modal_el = view_active_modal(
                modal,
                &self.derived.week_days,
                &self.derived.week_span,
                &self.subjects,
                &self.settings,
                self.theme,
                self.tasks.len(),
                self.derived.weekly_stats.total,
                self.print_options,
                pal,
            );
            layers.push(modal_el);
        }

        stack(layers)
            .width(Length::Fill)
            .height(Length::Fill)
            .into()
    }
}
