use crate::jalali::WeekDayInfo;
use crate::models::{DailyProgressPoint, StudyTask, WeeklyProgressSummary};

pub fn build_weekly_progress_series(
    week_days: &[WeekDayInfo],
    tasks: &[StudyTask],
) -> WeeklyProgressSummary {
    let mut days = Vec::with_capacity(week_days.len());
    let mut total_tasks = 0usize;
    let mut completed_tasks = 0usize;
    let mut max_daily_tasks = 0usize;

    for day in week_days {
        let mut completed = 0usize;
        let mut total = 0usize;

        for task in tasks {
            if task.date_iso == day.date_iso {
                total += 1;
                if task.completed {
                    completed += 1;
                }
            }
        }

        let remaining = total.saturating_sub(completed);
        let completion_rate = if total == 0 {
            0
        } else {
            ((completed as f64 / total as f64) * 100.0).round() as u32
        };

        total_tasks += total;
        completed_tasks += completed;
        if total > max_daily_tasks {
            max_daily_tasks = total;
        }

        days.push(DailyProgressPoint {
            date_iso: day.date_iso.clone(),
            weekday_fa: day.weekday_fa.to_string(),
            jalali_short: day.jalali_short.clone(),
            gregorian_short: day.gregorian_short.clone(),
            completed,
            remaining,
            total,
            completion_rate,
        });
    }

    let remaining_tasks = total_tasks.saturating_sub(completed_tasks);
    let completion_rate = if total_tasks == 0 {
        0
    } else {
        ((completed_tasks as f64 / total_tasks as f64) * 100.0).round() as u32
    };

    WeeklyProgressSummary {
        days,
        total_tasks,
        completed_tasks,
        remaining_tasks,
        completion_rate,
        max_daily_tasks,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jalali::get_week_days;
    use crate::tasks::create_initial_seed_tasks;

    #[test]
    fn builds_seven_day_progress_summary() {
        let week = get_week_days(0, "2026-11-16");
        let tasks = create_initial_seed_tasks("2026-11-16");
        let summary = build_weekly_progress_series(&week, &tasks);

        assert_eq!(summary.days.len(), 7);
        assert_eq!(summary.total_tasks, 8);
        assert_eq!(summary.completed_tasks, 1);
        assert_eq!(summary.remaining_tasks, 7);
        assert_eq!(summary.completion_rate, 13);
        assert_eq!(summary.max_daily_tasks, 2);
    }

    #[test]
    fn handles_empty_week_gracefully() {
        let week = get_week_days(0, "2026-11-16");
        let summary = build_weekly_progress_series(&week, &[]);
        assert_eq!(summary.total_tasks, 0);
        assert_eq!(summary.completion_rate, 0);
        assert_eq!(summary.max_daily_tasks, 0);
    }
}
