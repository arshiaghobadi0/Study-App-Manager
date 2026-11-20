use crate::jalali::parse_iso_date;
use crate::models::{default_subjects, PriorityLevel, StudyTask, SubjectCategory, ThemeMode};
use chrono::Local;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashSet;
use std::fs;
use std::path::PathBuf;

pub const APP_EXPORT_FOLDER: &str = "WeeklyStudyPlanner";

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImportMode {
    Replace,
    Merge,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSettingsBlock {
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub theme: Option<ThemeMode>,
    pub subjects: Vec<SubjectCategory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupSummary {
    pub task_count: usize,
    pub subject_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupPayloadV1 {
    pub schema_version: u32,
    pub exported_at: String,
    pub app: String,
    pub summary: BackupSummary,
    pub settings: BackupSettingsBlock,
    pub tasks: Vec<StudyTask>,
}

#[derive(Debug, Clone)]
pub struct ParsedBackupData {
    pub tasks: Vec<StudyTask>,
    pub subjects: Vec<SubjectCategory>,
    pub theme: Option<ThemeMode>,
}

#[derive(Debug, Clone)]
pub struct AppliedBackup {
    pub tasks: Vec<StudyTask>,
    pub subjects: Vec<SubjectCategory>,
}

pub fn sanitize_export_filename(raw: &str, default_stem: &str, ext: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        .collect();
    let mut normalized = cleaned.trim_start_matches('.').to_string();
    while normalized.contains("..") {
        normalized = normalized.replace("..", ".");
    }

    if normalized.is_empty() {
        format!("{default_stem}.{ext}")
    } else if normalized
        .to_ascii_lowercase()
        .ends_with(&format!(".{ext}"))
    {
        normalized
    } else {
        format!("{normalized}.{ext}")
    }
}

pub fn build_backup_filename(today_iso: &str) -> String {
    let stem = if parse_iso_date(today_iso).is_some() {
        format!("study-planner-backup-{today_iso}")
    } else {
        "study-planner-backup".to_string()
    };
    sanitize_export_filename(&stem, "study-planner-backup", "json")
}

pub fn resolve_export_dir() -> Result<PathBuf, String> {
    let base = dirs::download_dir()
        .or_else(dirs::home_dir)
        .or_else(dirs::data_local_dir)
        .ok_or_else(|| "مسیر پوشه دانلود سیستم یافت نشد.".to_string())?;
    let export_dir = base.join(APP_EXPORT_FOLDER);
    fs::create_dir_all(&export_dir)
        .map_err(|e| format!("خطا در ایجاد پوشه خروجی {APP_EXPORT_FOLDER}: {e}"))?;
    Ok(export_dir)
}

pub fn create_backup_payload(
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    theme: ThemeMode,
) -> BackupPayloadV1 {
    BackupPayloadV1 {
        schema_version: 1,
        exported_at: Local::now().to_rfc3339(),
        app: "weekly-study-planner-rust".to_string(),
        summary: BackupSummary {
            task_count: tasks.len(),
            subject_count: subjects.len(),
        },
        settings: BackupSettingsBlock {
            theme: Some(theme),
            subjects: subjects.to_vec(),
        },
        tasks: tasks.to_vec(),
    }
}

pub fn serialize_backup_json(payload: &BackupPayloadV1) -> Result<String, String> {
    serde_json::to_string_pretty(payload).map_err(|e| format!("خطا در تولید JSON: {e}"))
}

pub fn save_backup_to_downloads(
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    theme: ThemeMode,
    today_iso: &str,
) -> Result<(PathBuf, BackupSummary), String> {
    let payload = create_backup_payload(tasks, subjects, theme);
    let summary = payload.summary.clone();
    let json = serialize_backup_json(&payload)?;
    let filename = build_backup_filename(today_iso);
    let dir = resolve_export_dir()?;
    let target = dir.join(filename);
    fs::write(&target, json.as_bytes()).map_err(|e| format!("خطا در ذخیره فایل JSON: {e}"))?;
    Ok((target, summary))
}

pub fn find_latest_backup_file() -> Option<PathBuf> {
    let dir = resolve_export_dir().ok()?;
    let mut entries: Vec<(PathBuf, std::time::SystemTime)> = fs::read_dir(dir)
        .ok()?
        .filter_map(|e| e.ok())
        .map(|e| e.path())
        .filter(|p| {
            p.extension()
                .and_then(|ext| ext.to_str())
                .map(|ext| ext.eq_ignore_ascii_case("json"))
                .unwrap_or(false)
        })
        .filter_map(|p| {
            let modified = fs::metadata(&p).ok()?.modified().ok()?;
            Some((p, modified))
        })
        .collect();
    entries.sort_by(|a, b| b.1.cmp(&a.1));
    entries.into_iter().next().map(|(p, _)| p)
}

pub fn parse_backup_json(raw: &str) -> Result<ParsedBackupData, String> {
    let value: Value =
        serde_json::from_str(raw.trim()).map_err(|_| "ساختار JSON نامعتبر است.".to_string())?;

    let mut subjects: Vec<SubjectCategory> = Vec::new();
    let mut theme: Option<ThemeMode> = None;

    let raw_tasks: &Vec<Value> = if let Some(arr) = value.as_array() {
        arr
    } else if let Some(obj) = value.as_object() {
        if let Some(settings) = obj.get("settings").and_then(|v| v.as_object()) {
            if let Some(theme_val) = settings.get("theme").and_then(|v| v.as_str()) {
                theme = match theme_val {
                    "dark" => Some(ThemeMode::Dark),
                    "light" => Some(ThemeMode::Light),
                    _ => None,
                };
            }
            if let Some(sub_arr) = settings.get("subjects").and_then(|v| v.as_array()) {
                for item in sub_arr {
                    if let (Some(id), Some(name)) = (
                        item.get("id").and_then(|v| v.as_str()),
                        item.get("name").and_then(|v| v.as_str()),
                    ) {
                        let color = item
                            .get("color")
                            .and_then(|v| v.as_str())
                            .unwrap_or("#2563eb");
                        if !id.trim().is_empty() && !name.trim().is_empty() {
                            subjects.push(SubjectCategory {
                                id: id.trim().to_string(),
                                name: name.trim().to_string(),
                                color: color.trim().to_string(),
                            });
                        }
                    }
                }
            }
        }

        obj.get("tasks")
            .and_then(|v| v.as_array())
            .ok_or_else(|| "آرایه tasks در فایل پشتیبان یافت نشد.".to_string())?
    } else {
        return Err("فرمت پشتیبان JSON پشتیبانی نمی‌شود.".to_string());
    };

    let fallback_subject_id = subjects
        .first()
        .map(|s| s.id.clone())
        .unwrap_or_else(|| "math".to_string());

    let mut tasks = Vec::with_capacity(raw_tasks.len());
    let now_iso = Local::now().to_rfc3339();

    for (idx, item) in raw_tasks.iter().enumerate() {
        let obj = item
            .as_object()
            .ok_or_else(|| format!("ردیف {} در آرایه تکالیف نامعتبر است.", idx + 1))?;

        let title = obj
            .get("title")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .ok_or_else(|| format!("عنوان تکلیف ردیف {} خالی است.", idx + 1))?;

        let date_iso = obj
            .get("dateISO")
            .or_else(|| obj.get("dateIso"))
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|d| parse_iso_date(d).is_some())
            .ok_or_else(|| format!("تاریخ تکلیف ردیف {} نامعتبر است.", idx + 1))?;

        let id = obj
            .get("id")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
            .unwrap_or_else(|| format!("imported-{}", idx + 1));

        let notes = obj
            .get("notes")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string);

        let subject_id = obj
            .get("subjectId")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(ToString::to_string)
            .unwrap_or_else(|| fallback_subject_id.clone());

        let priority = match obj.get("priority").and_then(|v| v.as_str()) {
            Some("high") => PriorityLevel::High,
            Some("low") => PriorityLevel::Low,
            _ => PriorityLevel::Medium,
        };

        let completed = obj
            .get("completed")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let reminder_enabled = obj
            .get("reminderEnabled")
            .and_then(|v| v.as_bool())
            .unwrap_or(false);

        let reminder_time = obj
            .get("reminderTime")
            .and_then(|v| v.as_str())
            .map(str::trim)
            .filter(|s| s.len() == 5 && s.contains(':'))
            .unwrap_or("18:00")
            .to_string();

        let created_at = obj
            .get("createdAt")
            .and_then(|v| v.as_str())
            .unwrap_or(&now_iso)
            .to_string();

        tasks.push(StudyTask {
            id,
            title: title.to_string(),
            notes,
            date_iso: date_iso.to_string(),
            subject_id,
            priority,
            completed,
            reminder_enabled,
            reminder_time,
            reminder_dismissed_at: None,
            snoozed_until_iso: None,
            created_at,
            deleted_at: None,
        });
    }

    Ok(ParsedBackupData {
        tasks,
        subjects,
        theme,
    })
}

pub fn apply_imported_backup(
    mode: ImportMode,
    imported: &ParsedBackupData,
    current_tasks: &[StudyTask],
    current_subjects: &[SubjectCategory],
) -> AppliedBackup {
    let subjects = match mode {
        ImportMode::Replace => {
            if imported.subjects.is_empty() {
                if current_subjects.is_empty() {
                    default_subjects()
                } else {
                    current_subjects.to_vec()
                }
            } else {
                imported.subjects.clone()
            }
        }
        ImportMode::Merge => {
            let mut merged = current_subjects.to_vec();
            let mut seen: HashSet<String> = merged.iter().map(|s| s.id.clone()).collect();
            for sub in &imported.subjects {
                if seen.insert(sub.id.clone()) {
                    merged.push(sub.clone());
                }
            }
            if merged.is_empty() {
                default_subjects()
            } else {
                merged
            }
        }
    };

    let valid_subject_ids: HashSet<&str> = subjects.iter().map(|s| s.id.as_str()).collect();
    let fallback_subject = subjects[0].id.clone();

    let normalize_task = |mut t: StudyTask| -> StudyTask {
        if !valid_subject_ids.contains(t.subject_id.as_str()) {
            t.subject_id = fallback_subject.clone();
        }
        t
    };

    let tasks = match mode {
        ImportMode::Replace => imported.tasks.iter().cloned().map(normalize_task).collect(),
        ImportMode::Merge => {
            let mut merged: Vec<StudyTask> = current_tasks.to_vec();
            let mut existing_ids: HashSet<String> = merged.iter().map(|t| t.id.clone()).collect();
            for task in &imported.tasks {
                if existing_ids.insert(task.id.clone()) {
                    merged.push(normalize_task(task.clone()));
                }
            }
            merged
        }
    };

    AppliedBackup { tasks, subjects }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::tasks::create_initial_seed_tasks;

    #[test]
    fn backup_payload_round_trips_cleanly() {
        let subjects = default_subjects();
        let tasks = create_initial_seed_tasks("2026-11-16");
        let payload = create_backup_payload(&tasks, &subjects, ThemeMode::Dark);
        let json = serialize_backup_json(&payload).expect("serialize");

        let parsed = parse_backup_json(&json).expect("parse");
        assert_eq!(parsed.tasks.len(), tasks.len());
        assert_eq!(parsed.subjects.len(), subjects.len());
        assert_eq!(parsed.theme, Some(ThemeMode::Dark));
    }

    #[test]
    fn parses_simplified_task_array_and_rejects_bad_dates() {
        let simple = r#"[{"title":"مرور ریاضی","dateISO":"2026-11-16","priority":"high"}]"#;
        let parsed = parse_backup_json(simple).expect("valid simple array");
        assert_eq!(parsed.tasks.len(), 1);
        assert_eq!(parsed.tasks[0].priority, PriorityLevel::High);

        let invalid = r#"[{"title":"بد","dateISO":"not-a-date"}]"#;
        assert!(parse_backup_json(invalid).is_err());
    }

    #[test]
    fn sanitizes_export_filenames_safely() {
        assert_eq!(
            sanitize_export_filename("../evil/../../backup", "study-planner-backup", "json"),
            "evil.backup.json"
        );
        assert_eq!(
            build_backup_filename("2026-11-16"),
            "study-planner-backup-2026-11-16.json"
        );
    }
}
