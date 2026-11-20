pub mod analytics_view;
pub mod board;
pub mod modals;
pub mod sidebar;

use crate::settings::AppPalette;
use iced::alignment::Horizontal;
use iced::widget::{button, checkbox, container, text, text_input, toggler, Text};
use iced::{font, Background, Border, Color, Font, Shadow, Theme, Vector};

pub const FONT_REGULAR: Font = Font::with_name("Vazirmatn");
pub const FONT_BOLD: Font = Font {
    weight: font::Weight::Bold,
    ..Font::with_name("Vazirmatn")
};

/// Persian-safe text helper with Advanced HarfBuzz/BiDi shaping enabled by default.
pub fn fa_text<'a>(content: impl Into<String>) -> Text<'a> {
    text(content.into())
        .font(FONT_REGULAR)
        .shaping(text::Shaping::Advanced)
        .align_x(Horizontal::Right)
}

/// Bold Persian-safe text helper with Advanced HarfBuzz/BiDi shaping.
pub fn fa_bold<'a>(content: impl Into<String>) -> Text<'a> {
    text(content.into())
        .font(FONT_BOLD)
        .shaping(text::Shaping::Advanced)
        .align_x(Horizontal::Right)
}

pub fn card_container_style(pal: AppPalette, radius: f32) -> impl Fn(&Theme) -> container::Style {
    move |_theme| container::Style {
        text_color: Some(pal.text_primary),
        background: Some(Background::Color(pal.bg_surface)),
        border: Border {
            color: Color::TRANSPARENT,
            width: 0.0,
            radius: radius.into(),
        },
        shadow: Shadow::default(),
    }
}

pub fn sidebar_container_style(pal: AppPalette) -> impl Fn(&Theme) -> container::Style {
    move |_theme| container::Style {
        text_color: Some(pal.text_primary),
        background: Some(Background::Color(pal.bg_sidebar)),
        border: Border {
            color: pal.border_subtle,
            width: 1.0,
            radius: 20.0.into(),
        },
        shadow: Shadow {
            color: Color::from_rgba(0.0, 0.0, 0.0, if pal.is_dark { 0.25 } else { 0.06 }),
            offset: Vector::new(0.0, 6.0),
            blur_radius: 18.0,
        },
    }
}

pub fn modal_container_style(pal: AppPalette) -> impl Fn(&Theme) -> container::Style {
    move |_theme| container::Style {
        text_color: Some(pal.text_primary),
        background: Some(Background::Color(pal.bg_modal)),
        border: Border {
            color: pal.border_strong,
            width: 1.0,
            radius: 22.0.into(),
        },
        shadow: Shadow {
            color: Color::from_rgba(0.0, 0.0, 0.0, if pal.is_dark { 0.45 } else { 0.16 }),
            offset: Vector::new(0.0, 14.0),
            blur_radius: 36.0,
        },
    }
}

pub fn backdrop_container_style(pal: AppPalette) -> impl Fn(&Theme) -> container::Style {
    move |_theme| container::Style {
        text_color: None,
        background: Some(Background::Color(pal.bg_backdrop)),
        border: Border::default(),
        shadow: Shadow::default(),
    }
}

pub fn ghost_button_style(
    pal: AppPalette,
    active: bool,
    radius: f32,
) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme, status| {
        let bg = match status {
            button::Status::Hovered | button::Status::Pressed => Some(Background::Color(pal.bg_surface_hover)),
            _ if active => Some(Background::Color(pal.bg_surface)),
            _ => None,
        };
        button::Style {
            background: bg,
            text_color: if active {
                pal.text_primary
            } else {
                pal.text_secondary
            },
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: radius.into(),
            },
            shadow: Shadow::default(),
        }
    }
}

pub fn surface_button_style(
    pal: AppPalette,
    active: bool,
    radius: f32,
) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme, status| {
        let bg = if active {
            pal.accent.main
        } else {
            match status {
                button::Status::Hovered | button::Status::Pressed => pal.bg_surface_hover,
                _ => pal.bg_surface,
            }
        };
        button::Style {
            background: Some(Background::Color(bg)),
            text_color: if active { Color::WHITE } else { pal.text_primary },
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: radius.into(),
            },
            shadow: Shadow::default(),
        }
    }
}

pub fn accent_button_style(
    pal: AppPalette,
    radius: f32,
) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme, status| {
        let bg = match status {
            button::Status::Hovered | button::Status::Pressed => pal.accent.hover,
            button::Status::Disabled => Color {
                a: 0.45,
                ..pal.accent.main
            },
            button::Status::Active => pal.accent.main,
        };
        button::Style {
            background: Some(Background::Color(bg)),
            text_color: Color::WHITE,
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: radius.into(),
            },
            shadow: Shadow {
                color: Color {
                    a: 0.28,
                    ..pal.accent.main
                },
                offset: Vector::new(0.0, 4.0),
                blur_radius: 12.0,
            },
        }
    }
}

pub fn danger_button_style(
    pal: AppPalette,
    solid: bool,
    radius: f32,
) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme, status| {
        let (bg, fg) = if solid {
            let color = match status {
                button::Status::Hovered | button::Status::Pressed => Color::from_rgb8(185, 28, 28),
                _ => pal.danger,
            };
            (color, Color::WHITE)
        } else {
            let color = match status {
                button::Status::Hovered | button::Status::Pressed => Color {
                    a: 0.22,
                    ..pal.danger
                },
                _ => pal.danger_soft,
            };
            (color, pal.danger)
        };
        button::Style {
            background: Some(Background::Color(bg)),
            text_color: fg,
            border: Border {
                color: Color::TRANSPARENT,
                width: 0.0,
                radius: radius.into(),
            },
            shadow: Shadow::default(),
        }
    }
}

pub fn tile_button_style(
    tile_bg: Color,
    selected: bool,
) -> impl Fn(&Theme, button::Status) -> button::Style {
    move |_theme, status| {
        let bg = match status {
            button::Status::Hovered | button::Status::Pressed => Color {
                r: (tile_bg.r * 0.92).max(0.0),
                g: (tile_bg.g * 0.92).max(0.0),
                b: (tile_bg.b * 0.92).max(0.0),
                a: 1.0,
            },
            _ => tile_bg,
        };
        button::Style {
            background: Some(Background::Color(bg)),
            text_color: Color::WHITE,
            border: Border {
                color: if selected {
                    Color::from_rgba(1.0, 1.0, 1.0, 0.85)
                } else {
                    Color::TRANSPARENT
                },
                width: if selected { 2.0 } else { 0.0 },
                radius: 14.0.into(),
            },
            shadow: Shadow {
                color: Color { a: 0.22, ..tile_bg },
                offset: Vector::new(0.0, 4.0),
                blur_radius: 10.0,
            },
        }
    }
}

pub fn soft_input_style(
    pal: AppPalette,
    radius: f32,
) -> impl Fn(&Theme, text_input::Status) -> text_input::Style {
    move |_theme, status| {
        let (bg, border_color, border_width) = match status {
            text_input::Status::Active => (pal.bg_input, Color::TRANSPARENT, 1.0),
            text_input::Status::Hovered => (pal.bg_surface_hover, pal.border_subtle, 1.0),
            text_input::Status::Disabled => (pal.bg_surface, Color::TRANSPARENT, 1.0),
            text_input::Status::Focused => (pal.bg_modal, pal.accent.main, 1.5),
        };
        text_input::Style {
            background: Background::Color(bg),
            border: Border {
                color: border_color,
                width: border_width,
                radius: radius.into(),
            },
            icon: pal.text_muted,
            placeholder: pal.text_muted,
            value: pal.text_primary,
            selection: pal.accent.soft,
        }
    }
}

pub fn round_checkbox_style(
    pal: AppPalette,
) -> impl Fn(&Theme, checkbox::Status) -> checkbox::Style {
    move |_theme, status| {
        let is_checked = matches!(
            status,
            checkbox::Status::Active { is_checked: true }
                | checkbox::Status::Hovered { is_checked: true }
                | checkbox::Status::Disabled { is_checked: true }
        );
        checkbox::Style {
            background: Background::Color(if is_checked {
                pal.accent.main
            } else {
                Color::TRANSPARENT
            }),
            icon_color: Color::WHITE,
            border: Border {
                color: if is_checked {
                    pal.accent.main
                } else {
                    pal.border_strong
                },
                width: 1.5,
                radius: 99.0.into(),
            },
            text_color: Some(pal.text_primary),
        }
    }
}

pub fn smooth_toggler_style(
    pal: AppPalette,
) -> impl Fn(&Theme, toggler::Status) -> toggler::Style {
    move |_theme, status| {
        let is_toggled = matches!(
            status,
            toggler::Status::Active { is_toggled: true }
                | toggler::Status::Hovered { is_toggled: true }
                | toggler::Status::Disabled { is_toggled: true }
        );
        toggler::Style {
            background: if is_toggled {
                pal.accent.main
            } else {
                pal.border_strong
            },
            background_border_width: 0.0,
            background_border_color: Color::TRANSPARENT,
            foreground: Color::WHITE,
            foreground_border_width: 0.0,
            foreground_border_color: Color::TRANSPARENT,
        }
    }
}
