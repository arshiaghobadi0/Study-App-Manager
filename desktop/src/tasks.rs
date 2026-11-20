use crate::jalali::{get_week_days, parse_iso_date};
use crate::models::{
    CompletionFilter, PriorityLevel, SidebarCounts, StudyTask, TaskFilterState, WeeklyStats,
};
use chrono::{DateTime, Duration, Local, NaiveDateTime, NaiveTime, TimeZone};
use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DeleteScope {
    All,
    Week,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct BulkDeleteResult {
    pub next_tasks: Vec<StudyTask>,
    pub next_trash: Vec<StudyTask>,
    pub removed_count: usize,
}

pub fn sort_tasks_for_day(tasks: &mut [StudyTask]) {
    tasks.sort_by(|a, b| {
        a.completed
            .cmp(&b.completed)
            .then_with(|| a.priority.weight().cmp(&b.priority.weight()))
            .then_with(|| b.reminder_enabled.cmp(&a.reminder_enabled))
            .then_with(|| a.reminder_time.cmp(&b.reminder_time))
            .then_with(|| a.created_at.cmp(&b.created_at))
    });
}

pub fn filter_tasks(
    tasks: &[StudyTask],
    filters: &TaskFilterState,
    show_completed_setting: bool,
) -> Vec<StudyTask> {
    let query = filters.search.trim().to_lowercase();

    tasks
        .iter()
        .filter(|task| {
            if !show_completed_setting && filters.completion != CompletionFilter::Completed && task.completed {
                return false;
            }
            if let Some(ref sub_id) = filters.subject_id {
                if &task.subject_id != sub_id {
                    return false;
                }
            }
            if let Some(prio) = filters.priority {
                if task.priority != prio {
                    return false;
                }
            }
            match filters.completion {
                CompletionFilter::All => {}
                CompletionFilter::Completed => {
                    if !task.completed {
                        return false;
                    }
                }
                CompletionFilter::Pending => {
                    if task.completed {
                        return false;
                    }
                }
            }
            if let Some(ref date_iso) = filters.date_iso {
                if &task.date_iso != date_iso {
                    return false;
                }
            }
            if filters.only_reminders && (!task.reminder_enabled || task.completed) {
                return false;
            }
            if !query.is_empty() {
                let in_title = task.title.to_lowercase().contains(&query);
                let in_notes = task
                    .notes
                    .as_deref()
                    .map(|n| n.to_lowercase().contains(&query))
                    .unwrap_or(false);
                if !in_title && !in_notes {
                    return false;
                }
            }
            true
        })
        .cloned()
        .collect()
}

pub fn compute_weekly_stats(tasks: &[StudyTask], week_date_isos: &[String]) -> WeeklyStats {
    let week_set: HashSet<&str> = week_date_isos.iter().map(String::as_str).collect();
    let mut total = 0usize;
    let mut completed = 0usize;
    let mut high_priority = 0usize;

    for task in tasks {
        if week_set.contains(task.date_iso.as_str()) {
            total += 1;
            if task.completed {
                completed += 1;
            } else if task.priority == PriorityLevel::High {
                high_priority += 1;
            }
        }
    }

    let remaining = total.saturating_sub(completed);
    let completion_rate = if total == 0 {
        0
    } else {
        ((completed as f64 / total as f64) * 100.0).round() as u32
    };

    WeeklyStats {
        total,
        completed,
        remaining,
        high_priority,
        completion_rate,
    }
}

pub fn compute_sidebar_counts(
    tasks: &[StudyTask],
    week_date_isos: &[String],
    today_iso: &str,
) -> SidebarCounts {
    let week_set: HashSet<&str> = week_date_isos.iter().map(String::as_str).collect();
    let mut counts = SidebarCounts::default();

    for task in tasks {
        if task.date_iso == today_iso {
            counts.today += 1;
        }
        if week_set.contains(task.date_iso.as_str()) {
            counts.all_week += 1;
            if task.completed {
                counts.completed += 1;
            }
            if !task.completed && task.priority == PriorityLevel::High {
                counts.high_priority += 1;
            }
            if !task.completed && task.reminder_enabled {
                counts.reminders += 1;
            }
            *counts.by_subject.entry(task.subject_id.clone()).or_insert(0) += 1;
        }
    }

    counts
}

pub fn expand_task_dates_for_week(date_iso: &str, repeat_all_week: bool) -> Vec<String> {
    if !repeat_all_week {
        return vec![date_iso.to_string()];
    }
    get_week_days(0, date_iso)
        .into_iter()
        .map(|d| d.date_iso)
        .collect()
}

pub fn remove_tasks_by_scope(
    tasks: &[StudyTask],
    trash: &[StudyTask],
    scope: DeleteScope,
    week_date_isos: &[String],
    permanent: bool,
    deleted_at_iso: &str,
) -> BulkDeleteResult {
    let week_set: HashSet<&str> = week_date_isos.iter().map(String::as_str).collect();
    let mut kept = Vec::new();
    let mut removed = Vec::new();

    for task in tasks {
        let matches_scope = match scope {
            DeleteScope::All => true,
            DeleteScope::Week => week_set.contains(task.date_iso.as_str()),
        };
        if matches_scope {
            removed.push(task.clone());
        } else {
            kept.push(task.clone());
        }
    }

    let removed_count = removed.len();
    let mut next_trash = trash.to_vec();
    if !permanent && removed_count > 0 {
        let mut trashed_items: Vec<StudyTask> = removed
            .into_iter()
            .map(|mut t| {
                t.deleted_at = Some(deleted_at_iso.to_string());
                t
            })
            .collect();
        trashed_items.extend(next_trash);
        next_trash = trashed_items;
    }

    BulkDeleteResult {
        next_tasks: kept,
        next_trash,
        removed_count,
    }
}

pub fn compute_snooze_until_iso(minutes: i64) -> String {
    (Local::now() + Duration::minutes(minutes)).to_rfc3339()
}

pub fn get_due_reminder_tasks(tasks: &[StudyTask], now_local: DateTime<Local>) -> Vec<StudyTask> {
    tasks
        .iter()
        .filter(|task| {
            if task.completed || !task.reminder_enabled || task.reminder_dismissed_at.is_some() {
                return false;
            }
            if let Some(ref snoozed_str) = task.snoozed_until_iso {
                if let Ok(snoozed_dt) = DateTime::parse_from_rfc3339(snoozed_str) {
                    if now_local.timestamp_millis() < snoozed_dt.timestamp_millis() {
                        return false;
                    }
                }
            }
            let date = match parse_iso_date(&task.date_iso) {
                Some(d) => d,
                None => return false,
            };
            let parts: Vec<&str> = task.reminder_time.split(':').collect();
            if parts.len() != 2 {
                return false;
            }
            let (hour, min) = match (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
                (Ok(h), Ok(m)) => (h, m),
                _ => return false,
            };
            let time = match NaiveTime::from_hms_opt(hour, min, 0) {
                Some(t) => t,
                None => return false,
            };
            let naive_dt = NaiveDateTime::new(date, time);
            let scheduled = match Local.from_local_datetime(&naive_dt).single() {
                Some(dt) => dt,
                None => return false,
            };
            let diff_ms = now_local.timestamp_millis() - scheduled.timestamp_millis();
            // Trigger if scheduled time arrived within the last 12 hours
            (0..=(12 * 60 * 60 * 1000)).contains(&diff_ms)
        })
        .cloned()
        .collect()
}

pub fn group_tasks_by_date(
    filtered_tasks: &[StudyTask],
    week_date_isos: &[String],
) -> HashMap<String, Vec<StudyTask>> {
    let mut grouped: HashMap<String, Vec<StudyTask>> = HashMap::new();
    for iso in week_date_isos {
        grouped.insert(iso.clone(), Vec::new());
    }
    for task in filtered_tasks {
        if let Some(bucket) = grouped.get_mut(&task.date_iso) {
            bucket.push(task.clone());
        }
    }
    for bucket in grouped.values_mut() {
        sort_tasks_for_day(bucket);
    }
    grouped
}

pub fn create_initial_seed_tasks(today_iso: &str) -> Vec<StudyTask> {
    let week = get_week_days(0, today_iso);
    let now_iso = Local::now().to_rfc3339();
    let day = |idx: usize| -> String {
        week.get(idx)
            .map(|d| d.date_iso.clone())
            .unwrap_or_else(|| today_iso.to_string())
    };

    vec![
        StudyTask {
            id: "seed-1".to_string(),
            title: "حل ۱۵ تست مبحث انتگرال و کاربرد مشتق".to_string(),
            notes: Some("تمرکز بر سوالات کنکور سه سال اخیر و یادداشت نکات سرعتی".to_string()),
            date_iso: day(0),
            subject_id: "math".to_string(),
            priority: PriorityLevel::High,
            completed: true,
            reminder_enabled: true,
            reminder_time: "16:30".to_string(),
            reminder_dismissed_at: Some(now_iso.clone()),
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-2".to_string(),
            title: "مرور فصل حرکت‌شناسی و نمودار سرعت-زمان".to_string(),
            notes: Some("خلاصه‌نویسی فرمول‌های شتاب ثابت".to_string()),
            date_iso: day(1),
            subject_id: "physics".to_string(),
            priority: PriorityLevel::High,
            completed: false,
            reminder_enabled: true,
            reminder_time: "18:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-3".to_string(),
            title: "تمرین لغات درس سوم و درک مطلب انگلیسی".to_string(),
            notes: Some("مرور فلش‌کارت‌های واژگان آکادمیک".to_string()),
            date_iso: day(1),
            subject_id: "english".to_string(),
            priority: PriorityLevel::Medium,
            completed: false,
            reminder_enabled: false,
            reminder_time: "20:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-4".to_string(),
            title: "خواندن آرایه‌های ادبی و تحلیل دو غزل حافظ".to_string(),
            notes: None,
            date_iso: day(2),
            subject_id: "literature".to_string(),
            priority: PriorityLevel::Low,
            completed: false,
            reminder_enabled: true,
            reminder_time: "17:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-5".to_string(),
            title: "پیاده‌سازی الگوریتم مرتب‌سازی ادغامی و تحلیل پیچیدگی".to_string(),
            notes: Some("نوشتن تست واحد برای آرایه‌های خالی و مرتب‌شده".to_string()),
            date_iso: day(3),
            subject_id: "cs".to_string(),
            priority: PriorityLevel::High,
            completed: false,
            reminder_enabled: true,
            reminder_time: "19:30".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-6".to_string(),
            title: "حل مسائل استوکیومتری و موازنه واکنش‌ها".to_string(),
            notes: None,
            date_iso: day(4),
            subject_id: "chemistry".to_string(),
            priority: PriorityLevel::Medium,
            completed: false,
            reminder_enabled: true,
            reminder_time: "15:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-7".to_string(),
            title: "مرور جمع‌بندی نکات ریاضی و آزمون زمان‌دار ۳۰ دقیقه‌ای".to_string(),
            notes: None,
            date_iso: day(5),
            subject_id: "math".to_string(),
            priority: PriorityLevel::High,
            completed: false,
            reminder_enabled: true,
            reminder_time: "10:30".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso.clone(),
            deleted_at: None,
        },
        StudyTask {
            id: "seed-8".to_string(),
            title: "مطالعه آزاد و جبران تکالیف عقب‌مانده هفته".to_string(),
            notes: None,
            date_iso: day(6),
            subject_id: "literature".to_string(),
            priority: PriorityLevel::Low,
            completed: false,
            reminder_enabled: false,
            reminder_time: "18:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: now_iso,
            deleted_at: None,
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_task(id: &str, date_iso: &str, priority: PriorityLevel, completed: bool) -> StudyTask {
        StudyTask {
            id: id.to_string(),
            title: format!("تکلیف {id}"),
            notes: None,
            date_iso: date_iso.to_string(),
            subject_id: "math".to_string(),
            priority,
            completed,
            reminder_enabled: true,
            reminder_time: "18:00".to_string(),
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at: "2026-11-14T10:00:00Z".to_string(),
            deleted_at: None,
        }
    }

    #[test]
    fn sorts_incomplete_high_priority_first() {
        let mut items = vec![
            sample_task("1", "2026-11-14", PriorityLevel::High, true),
            sample_task("2", "2026-11-14", PriorityLevel::Low, false),
            sample_task("3", "2026-11-14", PriorityLevel::High, false),
        ];
        sort_tasks_for_day(&mut items);
        assert_eq!(items[0].id, "3");
        assert_eq!(items[1].id, "2");
        assert_eq!(items[2].id, "1");
    }

    #[test]
    fn expands_dates_for_all_seven_days_of_week() {
        let single = expand_task_dates_for_week("2026-11-16", false);
        assert_eq!(single, vec!["2026-11-16"]);

        let full = expand_task_dates_for_week("2026-11-16", true);
        assert_eq!(full.len(), 7);
        assert_eq!(full[0], "2026-11-14");
        assert_eq!(full[6], "2026-11-20");
    }

    #[test]
    fn removes_tasks_by_scope_with_soft_and_permanent_modes() {
        let tasks = vec![
            sample_task("a", "2026-11-14", PriorityLevel::High, false),
            sample_task("b", "2026-11-28", PriorityLevel::Low, false),
        ];
        let week = vec!["2026-11-14".to_string(), "2026-11-15".to_string()];

        let soft_week = remove_tasks_by_scope(
            &tasks,
            &[],
            DeleteScope::Week,
            &week,
            false,
            "2026-11-16T12:00:00Z",
        );
        assert_eq!(soft_week.removed_count, 1);
        assert_eq!(soft_week.next_tasks.len(), 1);
        assert_eq!(soft_week.next_trash.len(), 1);
        assert_eq!(soft_week.next_trash[0].id, "a");

        let perm_all = remove_tasks_by_scope(
            &tasks,
            &[],
            DeleteScope::All,
            &week,
            true,
            "2026-11-16T12:00:00Z",
        );
        assert_eq!(perm_all.removed_count, 2);
        assert!(perm_all.next_tasks.is_empty());
        assert!(perm_all.next_trash.is_empty());
    }

    #[test]
    fn computes_weekly_and_sidebar_stats() {
        let seeds = create_initial_seed_tasks("2026-11-16");
        let week: Vec<String> = get_week_days(0, "2026-11-16")
            .into_iter()
            .map(|d| d.date_iso)
            .collect();

        let stats = compute_weekly_stats(&seeds, &week);
        assert_eq!(stats.total, 8);
        assert_eq!(stats.completed, 1);
        assert_eq!(stats.remaining, 7);

        let counts = compute_sidebar_counts(&seeds, &week, "2026-11-16");
        assert_eq!(counts.all_week, 8);
        assert_eq!(counts.completed, 1);
        assert_eq!(counts.high_priority, 3);
    }
}
