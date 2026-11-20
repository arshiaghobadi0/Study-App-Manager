use crate::app::Message;
use crate::jalali::{
    format_jalali_long, format_persian_usize, iso_to_jalali, to_persian_digits, WeekDayInfo,
    WeekSpanSummary,
};
use crate::models::{
    AppSettings, CalendarDisplayMode, DensityMode, StudyTask, SubjectCategory, TaskFilterState,
    WeeklyProgressSummary, WorkspaceViewMode,
};
use crate::settings::{hex_to_color, AppPalette};
use crate::ui::analytics_view::view_analytics;
use crate::ui::{
    accent_button_style, card_container_style, danger_button_style, fa_bold, fa_text,
    ghost_button_style, round_checkbox_style, soft_input_style, surface_button_style,
};
use iced::alignment::Horizontal;
use iced::widget::{button, checkbox, column, container, row, scrollable, text_input, Space};
use iced::{Alignment, Background, Border, Color, Element, Length, Padding};
use std::collections::HashMap;

#[allow(clippy::too_many_arguments)]
pub fn view_workspace<'a>(
    sidebar_open: bool,
    view_mode: WorkspaceViewMode,
    week_offset: i32,
    week_days: &'a [WeekDayInfo],
    week_span: &'a WeekSpanSummary,
    today_iso: &'a str,
    board_heading: &'a str,
    filters: &'a TaskFilterState,
    tasks_by_date: &'a HashMap<String, Vec<StudyTask>>,
    due_reminders: &'a [StudyTask],
    trash_tasks: &'a [StudyTask],
    subjects_by_id: &'a HashMap<String, SubjectCategory>,
    quick_add_drafts: &'a HashMap<String, String>,
    quick_add_all_week: &'a HashMap<String, bool>,
    weekly_progress: &'a WeeklyProgressSummary,
    settings: &'a AppSettings,
    feedback_message: Option<&'a str>,
    pal: AppPalette,
) -> Element<'a, Message> {
    // Ultra-minimal borderless top bar (matching decluttered web design, NO ••• button!)
    let mut start_controls = row![].spacing(4).align_y(Alignment::Center);
    if week_offset != 0 {
        start_controls = start_controls.push(
            button(fa_text("امروز").size(12).color(pal.text_secondary))
                .padding(Padding::from([5.0, 10.0]))
                .style(ghost_button_style(pal, false, 99.0))
                .on_press(Message::ResetWeekOffset),
        );
    }
    start_controls = start_controls
        .push(
            button(fa_bold("‹").size(16).color(pal.text_secondary))
                .padding(Padding::from([4.0, 10.0]))
                .style(ghost_button_style(pal, false, 99.0))
                .on_press(Message::ChangeWeekOffset(1)),
        )
        .push(
            button(fa_bold("›").size(16).color(pal.text_secondary))
                .padding(Padding::from([4.0, 10.0]))
                .style(ghost_button_style(pal, false, 99.0))
                .on_press(Message::ChangeWeekOffset(-1)),
        );

    if !sidebar_open {
        start_controls = start_controls.push(
            button(fa_bold("☰").size(14).color(pal.text_secondary))
                .padding(Padding::from([5.0, 10.0]))
                .style(ghost_button_style(pal, false, 99.0))
                .on_press(Message::ToggleSidebar),
        );
    }

    let search_input = text_input("جستجو در تکالیف...", &filters.search)
        .on_input(Message::SearchChanged)
        .align_x(Horizontal::Right)
        .size(13)
        .padding(Padding::from([7.0, 14.0]))
        .width(Length::Fixed(220.0))
        .style(soft_input_style(pal, 99.0));

    let end_controls = row![
        search_input,
        button(fa_text("🖨 چاپ / PDF").size(12).color(pal.text_secondary))
            .padding(Padding::from([6.0, 12.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::OpenPrintModal),
    ]
    .spacing(8)
    .align_y(Alignment::Center);

    let top_bar = row![end_controls, Space::with_width(Length::Fill), start_controls]
        .align_y(Alignment::Center)
        .width(Length::Fill);

    // Display heading + quiet dual/single calendar line
    let date_subtitle = match settings.calendar_display {
        CalendarDisplayMode::Dual => {
            format!("{}  ·  {}", week_span.gregorian_span, week_span.jalali_span)
        }
        CalendarDisplayMode::Jalali => week_span.jalali_span.clone(),
        CalendarDisplayMode::Gregorian => week_span.gregorian_span.clone(),
    };

    let mut heading_row = row![].align_y(Alignment::End).width(Length::Fill);
    if filters.has_active_filters() || view_mode != WorkspaceViewMode::Board {
        heading_row = heading_row.push(
            button(fa_text("بازگشت به هفته").size(12).color(pal.text_secondary))
                .padding(Padding::from([6.0, 12.0]))
                .style(ghost_button_style(pal, false, 99.0))
                .on_press(Message::ResetFilters),
        );
    }
    heading_row = heading_row.push(Space::with_width(Length::Fill)).push(
        column![
            fa_bold(board_heading)
                .size(28)
                .color(pal.accent.main)
                .width(Length::Fill),
            fa_text(date_subtitle)
                .size(12)
                .color(pal.text_muted)
                .width(Length::Fill),
        ]
        .spacing(4)
        .align_x(Alignment::End),
    );

    let mut content_col = column![heading_row].spacing(18).width(Length::Fill);

    // Timed status toast
    if let Some(msg) = feedback_message {
        content_col = content_col.push(
            container(
                row![
                    button(fa_text("✕").size(11).color(pal.success))
                        .padding(Padding::from([2.0, 6.0]))
                        .style(ghost_button_style(pal, false, 8.0))
                        .on_press(Message::ClearFeedback),
                    Space::with_width(Length::Fill),
                    fa_text(msg).size(12.5).color(pal.success),
                ]
                .align_y(Alignment::Center),
            )
            .width(Length::Fill)
            .padding(Padding::from([9.0, 14.0]))
            .style(move |_t| container::Style {
                background: Some(Background::Color(Color {
                    a: 0.12,
                    ..pal.success
                })),
                border: Border {
                    color: Color {
                        a: 0.30,
                        ..pal.success
                    },
                    width: 1.0,
                    radius: 12.0.into(),
                },
                ..container::Style::default()
            }),
        );
    }

    match view_mode {
        WorkspaceViewMode::Analytics => {
            content_col = content_col.push(view_analytics(weekly_progress, pal));
        }
        WorkspaceViewMode::Trash => {
            content_col = content_col.push(view_trash(trash_tasks, subjects_by_id, pal));
        }
        WorkspaceViewMode::Board => {
            // Due Reminders banner
            if !due_reminders.is_empty() {
                content_col = content_col.push(view_reminder_banner(
                    due_reminders,
                    subjects_by_id,
                    pal,
                ));
            }

            let visible_days: Vec<&WeekDayInfo> = if let Some(ref only_date) = filters.date_iso {
                let matched: Vec<&WeekDayInfo> = week_days
                    .iter()
                    .filter(|d| &d.date_iso == only_date)
                    .collect();
                if matched.is_empty() {
                    week_days.iter().collect()
                } else {
                    matched
                }
            } else {
                week_days.iter().collect()
            };

            let total_matching: usize = visible_days
                .iter()
                .map(|d| tasks_by_date.get(&d.date_iso).map_or(0, Vec::len))
                .sum();

            if filters.has_active_filters() && total_matching == 0 {
                content_col = content_col.push(
                    container(
                        column![
                            fa_text("در این هفته هیچ تکلیفی مطابق فیلترهای انتخاب‌شده یافت نشد.")
                                .size(13.5)
                                .color(pal.text_secondary),
                            button(fa_bold("نمایش همه تکالیف هفته").size(12.5).color(Color::WHITE))
                                .padding(Padding::from([8.0, 16.0]))
                                .style(accent_button_style(pal, 99.0))
                                .on_press(Message::ResetFilters),
                        ]
                        .spacing(12)
                        .align_x(Alignment::Center),
                    )
                    .width(Length::Fill)
                    .padding(36)
                    .center_x(Length::Fill)
                    .style(card_container_style(pal, 18.0)),
                );
            } else {
                // 3-column RTL weekly grid (chunked into rows of 3, ordered right-to-left)
                let row_gap = if settings.density == DensityMode::Compact {
                    18.0
                } else {
                    26.0
                };
                let col_gap = if settings.density == DensityMode::Compact {
                    16.0
                } else {
                    24.0
                };

                let mut grid_rows = column![].spacing(row_gap).width(Length::Fill);

                for chunk in visible_days.chunks(3) {
                    let mut r = row![].spacing(col_gap).width(Length::Fill);

                    // Fill empty slots on the LEFT for partial last row so RTL columns align to the RIGHT
                    let empty_slots = 3usize.saturating_sub(chunk.len());
                    for _ in 0..empty_slots {
                        r = r.push(Space::with_width(Length::Fill));
                    }

                    // Push chunk in reverse so index 0 (Saturday) sits on the far RIGHT
                    for day in chunk.iter().rev() {
                        let day_tasks = tasks_by_date
                            .get(&day.date_iso)
                            .map(Vec::as_slice)
                            .unwrap_or(&[]);
                        let draft = quick_add_drafts
                            .get(&day.date_iso)
                            .map(String::as_str)
                            .unwrap_or("");
                        let all_week_checked = quick_add_all_week
                            .get(&day.date_iso)
                            .copied()
                            .unwrap_or(false);

                        r = r.push(view_day_column(
                            day,
                            day.date_iso == today_iso,
                            day_tasks,
                            subjects_by_id,
                            draft,
                            all_week_checked,
                            settings,
                            pal,
                        ));
                    }

                    grid_rows = grid_rows.push(r);
                }

                content_col = content_col.push(grid_rows);
            }
        }
    }

    let main_scroll = scrollable(
        container(content_col)
            .width(Length::Fill)
            .padding(Padding {
                top: 10.0,
                right: 12.0,
                bottom: 78.0,
                left: 12.0,
            }),
    )
    .height(Length::Fill)
    .width(Length::Fill);

    column![top_bar, main_scroll]
        .spacing(10)
        .width(Length::Fill)
        .height(Length::Fill)
        .padding(Padding::from([12.0, 22.0]))
        .into()
}

#[allow(clippy::too_many_arguments)]
fn view_day_column<'a>(
    day: &'a WeekDayInfo,
    is_today: bool,
    tasks: &'a [StudyTask],
    subjects_by_id: &'a HashMap<String, SubjectCategory>,
    draft: &'a str,
    all_week_checked: bool,
    settings: &'a AppSettings,
    pal: AppPalette,
) -> Element<'a, Message> {
    let date_label = match settings.calendar_display {
        CalendarDisplayMode::Dual => format!("{} · {}", day.gregorian_short, day.jalali_short),
        CalendarDisplayMode::Jalali => day.jalali_short.clone(),
        CalendarDisplayMode::Gregorian => day.gregorian_short.clone(),
    };

    let day_header = row![
        button(fa_bold("+").size(14).color(pal.text_muted))
            .padding(Padding::from([2.0, 8.0]))
            .style(ghost_button_style(pal, false, 8.0))
            .on_press(Message::OpenNewTaskModal(Some(day.date_iso.clone()))),
        Space::with_width(Length::Fill),
        fa_text(date_label).size(11.5).color(pal.text_muted),
        fa_bold(day.weekday_fa)
            .size(14.5)
            .color(if is_today {
                pal.accent.main
            } else {
                pal.text_primary
            }),
    ]
    .spacing(8)
    .align_y(Alignment::Center)
    .width(Length::Fill);

    let card_pad = if settings.density == DensityMode::Compact {
        Padding::from([8.0, 10.0])
    } else {
        Padding::from([11.0, 12.0])
    };
    let card_gap = if settings.density == DensityMode::Compact {
        6.0
    } else {
        9.0
    };

    let mut list_col = column![day_header].spacing(card_gap).width(Length::Fill);

    for task in tasks {
        let subject = subjects_by_id.get(&task.subject_id);
        let subj_name = subject.map(|s| s.name.as_str()).unwrap_or("عمومی");
        let subj_color = subject
            .map(|s| hex_to_color(&s.color))
            .unwrap_or(pal.text_muted);

        let title_str = format!("{}{}", task.priority.prefix_bangs(), task.title);
        let title_color = if task.completed {
            pal.text_muted
        } else {
            pal.text_primary
        };

        let mut meta_row = row![].spacing(6).align_y(Alignment::Center);
        if task.reminder_enabled {
            meta_row = meta_row
                .push(
                    fa_text(to_persian_digits(&task.reminder_time))
                        .size(11)
                        .color(if task.completed {
                            pal.text_muted
                        } else {
                            pal.accent.main
                        }),
                )
                .push(fa_text("·").size(11).color(pal.text_muted));
        }
        meta_row = meta_row.push(fa_text(subj_name).size(11).color(pal.text_muted)).push(
            container(Space::with_width(7))
                .height(7)
                .style(move |_t| container::Style {
                    background: Some(Background::Color(subj_color)),
                    border: Border {
                        radius: 99.0.into(),
                        ..Border::default()
                    },
                    ..container::Style::default()
                }),
        );

        let action_row = row![
            button(fa_text("حذف").size(10.5).color(pal.danger))
                .padding(Padding::from([2.0, 6.0]))
                .style(ghost_button_style(pal, false, 6.0))
                .on_press(Message::DeleteTask(task.id.clone())),
            button(fa_text("ویرایش").size(10.5).color(pal.text_secondary))
                .padding(Padding::from([2.0, 6.0]))
                .style(ghost_button_style(pal, false, 6.0))
                .on_press(Message::OpenEditTaskModal(task.id.clone())),
            button(
                fa_text(if task.reminder_enabled { "🔔" } else { "🔕" })
                    .size(11)
                    .color(pal.text_muted),
            )
            .padding(Padding::from([2.0, 5.0]))
            .style(ghost_button_style(pal, false, 6.0))
            .on_press(Message::ToggleTaskReminder(task.id.clone())),
            Space::with_width(Length::Fill),
            meta_row,
        ]
        .spacing(4)
        .align_y(Alignment::Center)
        .width(Length::Fill);

        let mut text_col = column![fa_text(title_str)
            .size(13)
            .color(title_color)
            .width(Length::Fill),]
        .spacing(4)
        .width(Length::Fill);

        if settings.show_task_notes {
            if let Some(ref notes) = task.notes {
                text_col = text_col.push(
                    fa_text(notes.clone())
                        .size(11.5)
                        .color(pal.text_muted)
                        .width(Length::Fill),
                );
            }
        }
        text_col = text_col.push(action_row);

        let task_id_toggle = task.id.clone();
        let check = checkbox("", task.completed)
            .size(18)
            .style(round_checkbox_style(pal))
            .on_toggle(move |_| Message::ToggleTaskComplete(task_id_toggle.clone()));

        let card = container(
            row![text_col, check]
                .spacing(10)
                .align_y(Alignment::Start)
                .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(card_pad)
        .style(card_container_style(pal, 13.0));

        list_col = list_col.push(card);
    }

    // Inline quick-add bar at the bottom of each day column
    let iso_for_input = day.date_iso.clone();
    let iso_for_submit = day.date_iso.clone();
    let iso_for_week = day.date_iso.clone();

    let quick_input = text_input("افزودن سریع...", draft)
        .on_input(move |val| Message::QuickAddDraftChanged(iso_for_input.clone(), val))
        .on_submit(Message::SubmitQuickAdd(iso_for_submit.clone()))
        .align_x(Horizontal::Right)
        .size(12.5)
        .padding(Padding::from([8.0, 10.0]))
        .width(Length::Fill)
        .style(soft_input_style(pal, 12.0));

    let mut quick_col = column![quick_input].spacing(6).width(Length::Fill);

    if !draft.trim().is_empty() {
        quick_col = quick_col.push(
            row![
                button(fa_bold("ثبت").size(11.5).color(Color::WHITE))
                    .padding(Padding::from([4.0, 12.0]))
                    .style(accent_button_style(pal, 8.0))
                    .on_press(Message::SubmitQuickAdd(day.date_iso.clone())),
                Space::with_width(Length::Fill),
                checkbox("برای تمام روزهای هفته", all_week_checked)
                    .text_shaping(iced::widget::text::Shaping::Advanced)
                    .size(14)
                    .style(round_checkbox_style(pal))
                    .on_toggle(move |v| Message::QuickAddAllWeekToggled(iso_for_week.clone(), v)),
            ]
            .spacing(6)
            .align_y(Alignment::Center)
            .width(Length::Fill),
        );
    }

    list_col = list_col.push(quick_col);

    list_col.into()
}

fn view_reminder_banner<'a>(
    due_tasks: &'a [StudyTask],
    subjects_by_id: &'a HashMap<String, SubjectCategory>,
    pal: AppPalette,
) -> Element<'a, Message> {
    let mut rows = column![fa_bold(format!(
        "🔔 {} یادآور مطالعه سررسید شده است",
        format_persian_usize(due_tasks.len())
    ))
    .size(13)
    .color(pal.accent.main)
    .width(Length::Fill)]
    .spacing(8);

    for task in due_tasks {
        let subj = subjects_by_id
            .get(&task.subject_id)
            .map(|s| s.name.as_str())
            .unwrap_or("تکلیف درسی");

        rows = rows.push(
            row![
                button(fa_text("بستن").size(11.5).color(pal.text_secondary))
                    .padding(Padding::from([4.0, 10.0]))
                    .style(ghost_button_style(pal, false, 8.0))
                    .on_press(Message::DismissReminder(task.id.clone())),
                button(fa_text("۱۰ دقیقه بعد").size(11.5).color(pal.text_primary))
                    .padding(Padding::from([4.0, 10.0]))
                    .style(surface_button_style(pal, false, 8.0))
                    .on_press(Message::SnoozeReminder(task.id.clone(), 10)),
                button(fa_bold("انجام شد").size(11.5).color(Color::WHITE))
                    .padding(Padding::from([4.0, 10.0]))
                    .style(accent_button_style(pal, 8.0))
                    .on_press(Message::ToggleTaskComplete(task.id.clone())),
                Space::with_width(Length::Fill),
                column![
                    fa_bold(task.title.clone()).size(12.5).color(pal.text_primary),
                    fa_text(format!("{} · ساعت {}", subj, to_persian_digits(&task.reminder_time)))
                        .size(11)
                        .color(pal.text_muted),
                ]
                .align_x(Alignment::End),
            ]
            .spacing(6)
            .align_y(Alignment::Center)
            .width(Length::Fill),
        );
    }

    container(rows)
        .width(Length::Fill)
        .padding(Padding::from([12.0, 16.0]))
        .style(move |_t| container::Style {
            background: Some(Background::Color(pal.accent.soft)),
            border: Border {
                color: Color {
                    a: 0.35,
                    ..pal.accent.main
                },
                width: 1.0,
                radius: 16.0.into(),
            },
            ..container::Style::default()
        })
        .into()
}

fn view_trash<'a>(
    trash_tasks: &'a [StudyTask],
    subjects_by_id: &'a HashMap<String, SubjectCategory>,
    pal: AppPalette,
) -> Element<'a, Message> {
    let mut header = row![].align_y(Alignment::Center).width(Length::Fill);
    if !trash_tasks.is_empty() {
        header = header.push(
            button(fa_text("خالی کردن سطل").size(12).color(pal.danger))
                .padding(Padding::from([6.0, 12.0]))
                .style(danger_button_style(pal, false, 99.0))
                .on_press(Message::EmptyTrash),
        );
    }
    header = header.push(Space::with_width(Length::Fill)).push(
        fa_text("موارد حذف‌شده در اینجا نگهداری می‌شوند تا در صورت نیاز بازیابی شوند.")
            .size(12)
            .color(pal.text_muted),
    );

    if trash_tasks.is_empty() {
        return column![
            header,
            container(
                fa_text("مورد حذف‌شده‌ای وجود ندارد.")
                    .size(14)
                    .color(pal.text_muted)
            )
            .width(Length::Fill)
            .padding(44)
            .center_x(Length::Fill)
            .style(card_container_style(pal, 18.0)),
        ]
        .spacing(16)
        .into();
    }

    let mut grid = column![header].spacing(14).width(Length::Fill);

    for chunk in trash_tasks.chunks(3) {
        let mut r = row![].spacing(14).width(Length::Fill);
        let empty = 3usize.saturating_sub(chunk.len());
        for _ in 0..empty {
            r = r.push(Space::with_width(Length::Fill));
        }
        for task in chunk.iter().rev() {
            let subj = subjects_by_id
                .get(&task.subject_id)
                .map(|s| s.name.as_str())
                .unwrap_or("عمومی");
            let date_str = iso_to_jalali(&task.date_iso)
                .map(format_jalali_long)
                .unwrap_or_else(|| task.date_iso.clone());

            let card = container(
                column![
                    fa_bold(task.title.clone())
                        .size(13)
                        .color(pal.text_primary)
                        .width(Length::Fill),
                    fa_text(format!("{subj} · {date_str}"))
                        .size(11.5)
                        .color(pal.text_muted)
                        .width(Length::Fill),
                    Space::with_height(6),
                    row![
                        button(fa_text("حذف دائمی").size(11.5).color(pal.danger))
                            .padding(Padding::from([5.0, 10.0]))
                            .style(danger_button_style(pal, false, 8.0))
                            .on_press(Message::PermanentDeleteFromTrash(task.id.clone())),
                        button(fa_bold("بازیابی").size(11.5).color(pal.text_primary))
                            .padding(Padding::from([5.0, 12.0]))
                            .style(surface_button_style(pal, false, 8.0))
                            .on_press(Message::RestoreFromTrash(task.id.clone())),
                        Space::with_width(Length::Fill),
                    ]
                    .spacing(8),
                ]
                .spacing(6),
            )
            .width(Length::Fill)
            .padding(14)
            .style(card_container_style(pal, 14.0));

            r = r.push(card);
        }
        grid = grid.push(r);
    }

    grid.into()
}
