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

fn sanitize_backup_filename(raw: &str) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || matches!(c, '-' | '_' | '.'))
        .collect();
    if cleaned.is_empty() {
        "study-planner-backup.json".to_string()
    } else if cleaned.ends_with(".json") {
        cleaned
    } else {
        format!("{cleaned}.json")
    }
}

#[tauri::command]
fn save_json_backup(
    app: tauri::AppHandle,
    filename: String,
    content: String,
) -> Result<String, String> {
    let safe_name = sanitize_backup_filename(&filename);
    let base_dir: PathBuf = app
        .path()
        .download_dir()
        .or_else(|_| app.path().app_data_dir())
        .map_err(|e| format!("Failed to resolve target directory: {e}"))?;

    fs::create_dir_all(&base_dir)
        .map_err(|e| format!("Failed to create target directory: {e}"))?;

    let target_path = base_dir.join(safe_name);
    fs::write(&target_path, content.as_bytes())
        .map_err(|e| format!("Failed to write JSON backup: {e}"))?;

    Ok(target_path.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            convert_gregorian_to_jalali,
            get_runtime_platform,
            save_json_backup
        ])
        .run(tauri::generate_context!())
        .expect("error while running Weekly Study Planner Tauri application");
}
