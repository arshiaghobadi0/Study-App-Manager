use crate::models::{AccentPresetId, AppSettings, ThemeMode};
use iced::Color;

#[derive(Debug, Clone, Copy)]
pub struct AccentPalette {
    pub main: Color,
    pub hover: Color,
    pub soft: Color,
}

#[derive(Debug, Clone, Copy)]
pub struct AppPalette {
    pub is_dark: bool,
    pub bg_canvas: Color,
    pub bg_sidebar: Color,
    pub bg_surface: Color,
    pub bg_surface_hover: Color,
    pub bg_input: Color,
    pub bg_modal: Color,
    pub bg_backdrop: Color,
    pub border_subtle: Color,
    pub border_strong: Color,
    pub text_primary: Color,
    pub text_secondary: Color,
    pub text_muted: Color,
    pub accent: AccentPalette,
    pub danger: Color,
    pub danger_soft: Color,
    pub success: Color,
    pub tile_blue: Color,
    pub tile_emerald: Color,
    pub tile_coral: Color,
    pub tile_amber: Color,
}

pub fn hex_to_color(hex: &str) -> Color {
    let cleaned = hex.trim().trim_start_matches('#');
    if cleaned.len() != 6 {
        return Color::from_rgb(0.45, 0.45, 0.50);
    }
    let r = u8::from_str_radix(&cleaned[0..2], 16).unwrap_or(120);
    let g = u8::from_str_radix(&cleaned[2..4], 16).unwrap_or(120);
    let b = u8::from_str_radix(&cleaned[4..6], 16).unwrap_or(130);
    Color::from_rgb8(r, g, b)
}

pub fn accent_palette(preset: AccentPresetId, is_dark: bool) -> AccentPalette {
    let (light_hex, dark_hex, hover_hex) = match preset {
        AccentPresetId::Coral => ("#E14E43", "#F06055", "#CC3F35"),
        AccentPresetId::Blue => ("#0A84FF", "#3B9EFF", "#006EE6"),
        AccentPresetId::Emerald => ("#10B981", "#34D399", "#059669"),
        AccentPresetId::Violet => ("#7C3AED", "#A78BFA", "#6D28D9"),
        AccentPresetId::Amber => ("#D97706", "#FBBF24", "#B45309"),
        AccentPresetId::Slate => ("#3F3F46", "#D4D4D8", "#27272A"),
    };
    let main = hex_to_color(if is_dark { dark_hex } else { light_hex });
    let hover = hex_to_color(hover_hex);
    let soft = Color { a: if is_dark { 0.22 } else { 0.12 }, ..main };
    AccentPalette { main, hover, soft }
}

pub fn build_palette(theme: ThemeMode, accent: AccentPresetId) -> AppPalette {
    let is_dark = matches!(theme, ThemeMode::Dark);
    let accent_pal = accent_palette(accent, is_dark);

    if is_dark {
        AppPalette {
            is_dark: true,
            bg_canvas: hex_to_color("#111113"),
            bg_sidebar: hex_to_color("#18181B"),
            bg_surface: hex_to_color("#1F1F23"),
            bg_surface_hover: hex_to_color("#27272C"),
            bg_input: hex_to_color("#242429"),
            bg_modal: hex_to_color("#1A1A1E"),
            bg_backdrop: Color::from_rgba(0.0, 0.0, 0.0, 0.65),
            border_subtle: Color::from_rgba(1.0, 1.0, 1.0, 0.08),
            border_strong: Color::from_rgba(1.0, 1.0, 1.0, 0.16),
            text_primary: hex_to_color("#F4F4F5"),
            text_secondary: hex_to_color("#A1A1AA"),
            text_muted: hex_to_color("#71717A"),
            accent: accent_pal,
            danger: hex_to_color("#F87171"),
            danger_soft: Color::from_rgba(0.97, 0.44, 0.44, 0.15),
            success: hex_to_color("#34D399"),
            tile_blue: hex_to_color("#2E8CE6"),
            tile_emerald: hex_to_color("#25B874"),
            tile_coral: hex_to_color("#E2574C"),
            tile_amber: hex_to_color("#E09338"),
        }
    } else {
        AppPalette {
            is_dark: false,
            bg_canvas: hex_to_color("#FFFFFF"),
            bg_sidebar: hex_to_color("#F7F7FA"),
            bg_surface: hex_to_color("#F4F4F8"),
            bg_surface_hover: hex_to_color("#ECECF2"),
            bg_input: hex_to_color("#F2F2F7"),
            bg_modal: hex_to_color("#FFFFFF"),
            bg_backdrop: Color::from_rgba(0.05, 0.05, 0.08, 0.36),
            border_subtle: Color::from_rgba(0.0, 0.0, 0.0, 0.07),
            border_strong: Color::from_rgba(0.0, 0.0, 0.0, 0.14),
            text_primary: hex_to_color("#18181B"),
            text_secondary: hex_to_color("#52525B"),
            text_muted: hex_to_color("#8E8E93"),
            accent: accent_pal,
            danger: hex_to_color("#DC2626"),
            danger_soft: Color::from_rgba(0.88, 0.11, 0.28, 0.09),
            success: hex_to_color("#10B981"),
            tile_blue: hex_to_color("#4AA3F0"),
            tile_emerald: hex_to_color("#4CC38A"),
            tile_coral: hex_to_color("#EE6C62"),
            tile_amber: hex_to_color("#EFA548"),
        }
    }
}

pub fn is_valid_time_hhmm(value: &str) -> bool {
    let parts: Vec<&str> = value.trim().split(':').collect();
    if parts.len() != 2 || parts[0].len() != 2 || parts[1].len() != 2 {
        return false;
    }
    match (parts[0].parse::<u32>(), parts[1].parse::<u32>()) {
        (Ok(h), Ok(m)) => h <= 23 && m <= 59,
        _ => false,
    }
}

pub fn normalize_settings(mut settings: AppSettings) -> AppSettings {
    if !is_valid_time_hhmm(&settings.default_reminder_time) {
        settings.default_reminder_time = "18:00".to_string();
    }
    settings
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn validates_hhmm_times_correctly() {
        assert!(is_valid_time_hhmm("00:00"));
        assert!(is_valid_time_hhmm("18:30"));
        assert!(is_valid_time_hhmm("23:59"));
        assert!(!is_valid_time_hhmm("24:00"));
        assert!(!is_valid_time_hhmm("18:60"));
        assert!(!is_valid_time_hhmm("8:30"));
        assert!(!is_valid_time_hhmm("bad"));
    }

    #[test]
    fn normalizes_invalid_reminder_time_to_default() {
        let mut s = AppSettings::default();
        s.default_reminder_time = "99:99".to_string();
        let normalized = normalize_settings(s);
        assert_eq!(normalized.default_reminder_time, "18:00");
    }

    #[test]
    fn builds_light_and_dark_palettes_without_panicking() {
        for preset in AccentPresetId::ALL {
            let light = build_palette(ThemeMode::Light, preset);
            let dark = build_palette(ThemeMode::Dark, preset);
            assert!(!light.is_dark);
            assert!(dark.is_dark);
        }
    }
}
