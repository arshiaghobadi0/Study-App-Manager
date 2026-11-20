#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod analytics;
mod app;
mod backup;
mod jalali;
mod models;
mod notifier;
mod pdf_export;
mod settings;
mod storage;
mod tasks;
mod ui;

use app::StudyPlannerApp;
use iced::{window, Size};
use ui::FONT_REGULAR;

const VAZIR_REGULAR_BYTES: &[u8] = include_bytes!("../assets/fonts/Vazirmatn-Regular.ttf");
const VAZIR_BOLD_BYTES: &[u8] = include_bytes!("../assets/fonts/Vazirmatn-Bold.ttf");
const APP_ICON_PNG: &[u8] = include_bytes!("../assets/icon.png");

fn main() -> iced::Result {
    let icon = window::icon::from_file_data(APP_ICON_PNG, None).ok();

    iced::application(
        StudyPlannerApp::title,
        StudyPlannerApp::update,
        StudyPlannerApp::view,
    )
    .font(VAZIR_REGULAR_BYTES)
    .font(VAZIR_BOLD_BYTES)
    .default_font(FONT_REGULAR)
    .theme(StudyPlannerApp::theme)
    .subscription(StudyPlannerApp::subscription)
    .antialiasing(true)
    .window(window::Settings {
        size: Size::new(1280.0, 860.0),
        min_size: Some(Size::new(880.0, 620.0)),
        resizable: true,
        icon,
        ..window::Settings::default()
    })
    .centered()
    .run_with(StudyPlannerApp::new)
}
