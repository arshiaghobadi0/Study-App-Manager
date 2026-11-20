use crate::jalali::get_today_iso;
use crate::models::{default_subjects, AppSettings, StudyTask, SubjectCategory, ThemeMode};
use crate::settings::normalize_settings;
use crate::tasks::create_initial_seed_tasks;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PersistedAppState {
    pub tasks: Vec<StudyTask>,
    pub trash_tasks: Vec<StudyTask>,
    pub subjects: Vec<SubjectCategory>,
    pub theme: ThemeMode,
    pub settings: AppSettings,
}

impl Default for PersistedAppState {
    fn default() -> Self {
        let today = get_today_iso();
        Self {
            tasks: create_initial_seed_tasks(&today),
            trash_tasks: Vec::new(),
            subjects: default_subjects(),
            theme: ThemeMode::Light,
            settings: AppSettings::default(),
        }
    }
}

fn state_file_path() -> Option<PathBuf> {
    let base = dirs::data_local_dir().or_else(dirs::home_dir)?;
    Some(base.join("WeeklyStudyPlanner").join("state.json"))
}

pub fn load_state() -> PersistedAppState {
    let Some(path) = state_file_path() else {
        return PersistedAppState::default();
    };
    let Ok(raw) = fs::read_to_string(&path) else {
        return PersistedAppState::default();
    };
    match serde_json::from_str::<PersistedAppState>(&raw) {
        Ok(mut parsed) => {
            if parsed.subjects.is_empty() {
                parsed.subjects = default_subjects();
            }
            parsed.settings = normalize_settings(parsed.settings);
            parsed
        }
        Err(_) => PersistedAppState::default(),
    }
}

pub fn save_state(state: &PersistedAppState) {
    let Some(path) = state_file_path() else {
        return;
    };
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }
    if let Ok(json) = serde_json::to_string_pretty(state) {
        let tmp_path = path.with_extension("json.tmp");
        if fs::write(&tmp_path, json.as_bytes()).is_ok() {
            let _ = fs::rename(&tmp_path, &path);
        } else {
            let _ = fs::write(&path, json.as_bytes());
        }
    }
}
