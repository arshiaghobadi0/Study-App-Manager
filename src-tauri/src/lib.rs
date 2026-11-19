pub mod jalali;

use jalali::{gregorian_to_jalali, JalaliDate};
use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

#[derive(Debug, Serialize)]
pub struct RuntimeInfo {
    pub backend: &'static str,
    pub os: &'static str,
    pub arch: &'static str,
    pub version: &'static str,
}

#[tauri::command]
fn convert_gregorian_to_jalali(year: i32, month: u32, day: u32) -> Result<JalaliDate, String> {
    if !(1..=12).contains(&month) || !(1..=31).contains(&day) {
        return Err("Invalid Gregorian month or day".to_string());
    }
    Ok(gregorian_to_jalali(year, month, day))
}

#[tauri::command]
fn get_runtime_platform() -> RuntimeInfo {
    RuntimeInfo {
        backend: "rust-tauri",
        os: std::env::consts::OS,
        arch: std::env::consts::ARCH,
        version: env!("CARGO_PKG_VERSION"),
    }
}

const APP_EXPORT_FOLDER: &str = "WeeklyStudyPlanner";

fn sanitize_export_filename(raw: &str, default_stem: &str, ext: &str) -> String {
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
    } else if normalized.to_ascii_lowercase().ends_with(&format!(".{ext}")) {
        normalized
    } else {
        format!("{normalized}.{ext}")
    }
}

fn resolve_export_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let base_dir: PathBuf = app
        .path()
        .download_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Failed to resolve downloads directory: {e}"))?;

    let app_export_dir = base_dir.join(APP_EXPORT_FOLDER);
    fs::create_dir_all(&app_export_dir)
        .map_err(|e| format!("Failed to create export folder {APP_EXPORT_FOLDER}: {e}"))?;

    Ok(app_export_dir)
}

#[tauri::command]
fn ensure_export_folder(app: tauri::AppHandle) -> Result<String, String> {
    let export_dir = resolve_export_dir(&app)?;
    Ok(export_dir.to_string_lossy().into_owned())
}

#[tauri::command]
fn save_json_backup(
    app: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<String, String> {
    let safe_name = sanitize_export_filename(&filename, "study-planner-backup", "json");
    let export_dir = resolve_export_dir(&app)?;

    let target_path = export_dir.join(safe_name);
    fs::write(&target_path, content.as_bytes())
        .map_err(|e| format!("Failed to write JSON backup: {e}"))?;

    Ok(target_path.to_string_lossy().into_owned())
}

#[tauri::command]
fn save_pdf_export(
    app: tauri::AppHandle,
    filename: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    if bytes.is_empty() {
        return Err("PDF content is empty".to_string());
    }
    let safe_name = sanitize_export_filename(&filename, "study-planner-schedule", "pdf");
    let export_dir = resolve_export_dir(&app)?;

    let target_path = export_dir.join(safe_name);
    fs::write(&target_path, &bytes)
        .map_err(|e| format!("Failed to write PDF export: {e}"))?;

    Ok(target_path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            convert_gregorian_to_jalali,
            get_runtime_platform,
            ensure_export_folder,
            save_json_backup,
            save_pdf_export
        ])
        .run(tauri::generate_context!())
        .expect("error while running Weekly Study Planner Tauri application");
}

#[cfg(test)]
mod tests {
    use super::sanitize_export_filename;

    #[test]
    fn sanitizes_json_and_pdf_filenames() {
        assert_eq!(
            sanitize_export_filename("study-planner-backup-2026-11-19.json", "study-planner-backup", "json"),
            "study-planner-backup-2026-11-19.json"
        );
        assert_eq!(
            sanitize_export_filename("../evil/../../backup", "study-planner-backup", "json"),
            "evil.backup.json"
        );
        assert_eq!(
            sanitize_export_filename("study-planner-week-2026-11-19", "study-planner-schedule", "pdf"),
            "study-planner-week-2026-11-19.pdf"
        );
        assert_eq!(
            sanitize_export_filename("   ", "study-planner-schedule", "pdf"),
            "study-planner-schedule.pdf"
        );
    }
}
