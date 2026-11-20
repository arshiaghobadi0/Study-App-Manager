use crate::app::Message;
use crate::jalali::format_persian_usize;
use crate::models::{
    CompletionFilter, PriorityLevel, SidebarCounts, SidebarPreset, SubjectCategory,
    TaskFilterState, ThemeMode, WorkspaceViewMode,
};
use crate::settings::{hex_to_color, AppPalette};
use crate::ui::{
    fa_bold, fa_text, ghost_button_style, sidebar_container_style, surface_button_style,
    tile_button_style,
};
use iced::widget::{button, column, container, row, scrollable, Space};
use iced::{Alignment, Background, Border, Color, Element, Length, Padding};

#[allow(clippy::too_many_arguments)]
pub fn view_sidebar<'a>(
    view_mode: WorkspaceViewMode,
    filters: &'a TaskFilterState,
    today_iso: &'a str,
    counts: &'a SidebarCounts,
    trash_count: usize,
    subjects: &'a [SubjectCategory],
    theme_mode: ThemeMode,
    pal: AppPalette,
) -> Element<'a, Message> {
    let icon_btn = |label: &'static str, active: bool, msg: Message| {
        button(fa_bold(label).size(13))
            .padding(Padding::from([6.0, 9.0]))
            .style(ghost_button_style(pal, active, 99.0))
            .on_press(msg)
    };

    let top_actions = row![
        icon_btn("✕", false, Message::ToggleSidebar),
        Space::with_width(Length::Fill),
        icon_btn("⚙", false, Message::OpenSettingsModal),
        icon_btn(
            "📊",
            view_mode == WorkspaceViewMode::Analytics,
            Message::ToggleAnalyticsView,
        ),
        icon_btn(
            if theme_mode == ThemeMode::Dark {
                "☀"
            } else {
                "☾"
            },
            false,
            Message::ToggleTheme,
        ),
        icon_btn("+", false, Message::OpenSubjectsModal),
    ]
    .spacing(4)
    .align_y(Alignment::Center);

    let is_today_active = view_mode == WorkspaceViewMode::Board
        && filters.date_iso.as_deref() == Some(today_iso);
    let is_completed_active = view_mode == WorkspaceViewMode::Board
        && filters.completion == CompletionFilter::Completed;
    let is_high_active = view_mode == WorkspaceViewMode::Board
        && filters.priority == Some(PriorityLevel::High)
        && filters.completion == CompletionFilter::Pending;
    let is_all_active = view_mode == WorkspaceViewMode::Board && !filters.has_active_filters();

    let stat_tile = |title: &'static str, count: usize, bg: Color, selected: bool, preset: SidebarPreset| {
        button(
            column![
                row![
                    fa_bold(format_persian_usize(count))
                        .size(22)
                        .color(Color::WHITE),
                    Space::with_width(Length::Fill),
                ]
                .align_y(Alignment::Center),
                Space::with_height(6),
                fa_bold(title)
                    .size(12.5)
                    .color(Color::WHITE)
                    .width(Length::Fill),
            ]
            .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(Padding::from([10.0, 12.0]))
        .style(tile_button_style(bg, selected))
        .on_press(Message::ApplySidebarPreset(preset))
    };

    let tiles_grid = column![
        row![
            stat_tile(
                "تکمیل‌شده",
                counts.completed,
                pal.tile_emerald,
                is_completed_active,
                SidebarPreset::Completed,
            ),
            stat_tile(
                "امروز",
                counts.today,
                pal.tile_blue,
                is_today_active,
                SidebarPreset::Today,
            ),
        ]
        .spacing(10),
        row![
            stat_tile(
                "همه هفته",
                counts.all_week,
                pal.tile_amber,
                is_all_active,
                SidebarPreset::AllWeek,
            ),
            stat_tile(
                "اولویت بالا",
                counts.high_priority,
                pal.tile_coral,
                is_high_active,
                SidebarPreset::HighPriority,
            ),
        ]
        .spacing(10),
    ]
    .spacing(10);

    // My Lists section
    let mut lists_col = column![
        fa_bold("فهرست‌های من")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
    ]
    .spacing(4);

    let list_row_btn = |label: String, count: usize, dot_color: Color, active: bool, msg: Message| {
        button(
            row![
                fa_text(format_persian_usize(count))
                    .size(12)
                    .color(if active { pal.text_primary } else { pal.text_muted }),
                Space::with_width(Length::Fill),
                fa_text(label)
                    .size(13)
                    .color(if active { pal.text_primary } else { pal.text_secondary }),
                container(Space::with_width(9))
                    .height(9)
                    .style(move |_t| container::Style {
                        background: Some(Background::Color(dot_color)),
                        border: Border {
                            radius: 99.0.into(),
                            ..Border::default()
                        },
                        ..container::Style::default()
                    }),
            ]
            .spacing(8)
            .align_y(Alignment::Center)
            .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(Padding::from([7.0, 10.0]))
        .style(ghost_button_style(pal, active, 11.0))
        .on_press(msg)
    };

    lists_col = lists_col.push(list_row_btn(
        "برنامه کامل هفته".to_string(),
        counts.all_week,
        pal.accent.main,
        is_all_active,
        Message::ApplySidebarPreset(SidebarPreset::AllWeek),
    ));

    let is_reminders_active =
        view_mode == WorkspaceViewMode::Board && filters.only_reminders;
    lists_col = lists_col.push(list_row_btn(
        "یادآورها".to_string(),
        counts.reminders,
        pal.tile_coral,
        is_reminders_active,
        Message::ApplySidebarPreset(SidebarPreset::Reminders),
    ));

    for subject in subjects {
        let count = counts.by_subject.get(&subject.id).copied().unwrap_or(0);
        let active = view_mode == WorkspaceViewMode::Board
            && filters.subject_id.as_deref() == Some(subject.id.as_str());
        lists_col = lists_col.push(list_row_btn(
            subject.name.clone(),
            count,
            hex_to_color(&subject.color),
            active,
            Message::SelectSubjectFilter(subject.id.clone()),
        ));
    }

    let is_trash_active = view_mode == WorkspaceViewMode::Trash;
    lists_col = lists_col.push(list_row_btn(
        "اخیراً حذف‌شده".to_string(),
        trash_count,
        pal.text_muted,
        is_trash_active,
        Message::SelectViewMode(WorkspaceViewMode::Trash),
    ));

    // Priority tags section
    let tag_btn = |label: &'static str, active: bool, prio: Option<PriorityLevel>| {
        button(
            fa_text(label)
                .size(11.5)
                .color(if active { Color::WHITE } else { pal.text_secondary }),
        )
        .padding(Padding::from([5.0, 10.0]))
        .style(surface_button_style(pal, active, 99.0))
        .on_press(Message::SelectPriorityTag(prio))
    };

    let tags_section = column![
        fa_bold("برچسب‌ها")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
        row![
            tag_btn("#عادی", filters.priority == Some(PriorityLevel::Low), Some(PriorityLevel::Low)),
            tag_btn("#متوسط", filters.priority == Some(PriorityLevel::Medium), Some(PriorityLevel::Medium)),
            tag_btn("#فوری", filters.priority == Some(PriorityLevel::High), Some(PriorityLevel::High)),
        ]
        .spacing(6),
        row![
            Space::with_width(Length::Fill),
            tag_btn("همه برچسب‌ها", filters.priority.is_none(), None),
        ],
    ]
    .spacing(8);

    let scroll_body = scrollable(
        column![tiles_grid, lists_col, tags_section]
            .spacing(18)
            .width(Length::Fill),
    )
    .height(Length::Fill);

    container(
        column![top_actions, scroll_body]
            .spacing(14)
            .width(Length::Fill)
            .height(Length::Fill),
    )
    .width(Length::Fixed(272.0))
    .height(Length::Fill)
    .padding(Padding::from([14.0, 14.0]))
    .style(sidebar_container_style(pal))
    .into()
}
