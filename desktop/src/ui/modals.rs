use crate::app::{ActiveModal, Message};
use crate::backup::ImportMode;
use crate::jalali::{format_persian_usize, WeekDayInfo, WeekSpanSummary};
use crate::models::{
    AccentPresetId, AppSettings, CalendarDisplayMode, DensityMode, PriorityLevel,
    PrintScheduleOptions, SubjectCategory, ThemeMode, SUBJECT_COLOR_SWATCHES,
};
use crate::settings::{accent_palette, hex_to_color, AppPalette};
use crate::tasks::DeleteScope;
use crate::ui::{
    accent_button_style, backdrop_container_style, card_container_style, danger_button_style,
    fa_bold, fa_text, ghost_button_style, modal_container_style, round_checkbox_style,
    smooth_toggler_style, soft_input_style, surface_button_style,
};
use iced::alignment::Horizontal;
use iced::widget::{
    button, checkbox, column, container, mouse_area, pick_list, row, scrollable, text_input,
    toggler, Space,
};
use iced::{Alignment, Background, Border, Color, Element, Length, Padding};

fn modal_shell<'a>(
    title: &'static str,
    subtitle: Option<&'static str>,
    body: Element<'a, Message>,
    footer: Element<'a, Message>,
    max_width: f32,
    pal: AppPalette,
) -> Element<'a, Message> {
    let mut header_text = column![fa_bold(title).size(16).color(pal.text_primary)]
        .spacing(2)
        .align_x(Alignment::End);
    if let Some(sub) = subtitle {
        header_text = header_text.push(fa_text(sub).size(11.5).color(pal.text_muted));
    }

    let header = row![
        button(fa_bold("✕").size(13).color(pal.text_muted))
            .padding(Padding::from([5.0, 9.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        header_text,
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    let divider = move || {
        container(Space::with_width(Length::Fill))
            .height(1)
            .style(move |_t| container::Style {
                background: Some(Background::Color(pal.border_subtle)),
                ..container::Style::default()
            })
    };

    let card = container(
        column![
            container(header).padding(Padding::from([14.0, 20.0])),
            divider(),
            scrollable(container(body).padding(Padding::from([16.0, 20.0])))
                .height(Length::Shrink),
            divider(),
            container(footer).padding(Padding::from([12.0, 20.0])),
        ]
        .width(Length::Fill),
    )
    .max_width(max_width)
    .max_height(680.0)
    .width(Length::Fill)
    .style(modal_container_style(pal));

    // Swallow clicks inside the modal card so only backdrop clicks dismiss it
    let guarded_card = mouse_area(card).on_press(Message::NoOp);

    mouse_area(
        container(guarded_card)
            .width(Length::Fill)
            .height(Length::Fill)
            .padding(24)
            .center_x(Length::Fill)
            .center_y(Length::Fill)
            .style(backdrop_container_style(pal)),
    )
    .on_press(Message::CloseModal)
    .into()
}

#[allow(clippy::too_many_arguments)]
pub fn view_active_modal<'a>(
    modal: &'a ActiveModal,
    week_days: &'a [WeekDayInfo],
    week_span: &'a WeekSpanSummary,
    subjects: &'a [SubjectCategory],
    settings: &'a AppSettings,
    theme_mode: ThemeMode,
    total_task_count: usize,
    week_task_count: usize,
    print_options: PrintScheduleOptions,
    pal: AppPalette,
) -> Element<'a, Message> {
    match modal {
        ActiveModal::TaskForm(form) => view_task_form_modal(form, week_days, subjects, pal),
        ActiveModal::Settings => {
            view_settings_modal(settings, theme_mode, total_task_count, pal)
        }
        ActiveModal::Subjects { name, color } => {
            view_subjects_modal(name, color, subjects, pal)
        }
        ActiveModal::ImportBackup {
            raw_json,
            file_path,
            mode,
            apply_theme,
            error,
        } => view_import_modal(raw_json, file_path, *mode, *apply_theme, error.as_deref(), pal),
        ActiveModal::PrintExport => {
            view_print_modal(week_span, week_task_count, print_options, pal)
        }
        ActiveModal::ConfirmDeleteAll { scope, permanent } => view_delete_all_modal(
            *scope,
            *permanent,
            total_task_count,
            week_task_count,
            week_span,
            pal,
        ),
    }
}

fn view_task_form_modal<'a>(
    form: &'a crate::app::TaskFormState,
    week_days: &'a [WeekDayInfo],
    subjects: &'a [SubjectCategory],
    pal: AppPalette,
) -> Element<'a, Message> {
    let is_editing = form.editing_id.is_some();

    let title_input = text_input("مثلاً: حل تمرین فصل انتگرال", &form.title)
        .on_input(Message::TaskFormTitleChanged)
        .on_submit(Message::SubmitTaskForm)
        .align_x(Horizontal::Right)
        .size(13.5)
        .padding(Padding::from([10.0, 12.0]))
        .width(Length::Fill)
        .style(soft_input_style(pal, 12.0));

    let notes_input = text_input("توضیحات یا نکات تکمیلی (اختیاری)...", &form.notes)
        .on_input(Message::TaskFormNotesChanged)
        .align_x(Horizontal::Right)
        .size(12.5)
        .padding(Padding::from([9.0, 12.0]))
        .width(Length::Fill)
        .style(soft_input_style(pal, 12.0));

    // Day selector pills for current week
    let mut day_row = row![].spacing(6).width(Length::Fill);
    for day in week_days.iter().rev() {
        let selected = form.date_iso == day.date_iso;
        day_row = day_row.push(
            button(
                fa_text(day.weekday_fa)
                    .size(11.5)
                    .align_x(Horizontal::Center)
                    .width(Length::Fill)
                    .color(if selected { Color::WHITE } else { pal.text_secondary }),
            )
            .width(Length::Fill)
            .padding(Padding::from([7.0, 4.0]))
            .style(surface_button_style(pal, selected, 10.0))
            .on_press(Message::TaskFormDateChanged(day.date_iso.clone())),
        );
    }

    let selected_subject = subjects
        .iter()
        .find(|s| s.id == form.subject_id)
        .cloned()
        .or_else(|| subjects.first().cloned());

    let subject_picker = pick_list(subjects, selected_subject, |sub| {
        Message::TaskFormSubjectChanged(sub.id)
    })
    .text_shaping(iced::widget::text::Shaping::Advanced)
    .padding(Padding::from([8.0, 12.0]))
    .width(Length::Fill);

    // Priority segmented buttons
    let mut prio_row = row![].spacing(6);
    for prio in PriorityLevel::ALL.iter().rev() {
        let selected = form.priority == *prio;
        prio_row = prio_row.push(
            button(
                fa_text(prio.label_fa())
                    .size(12)
                    .align_x(Horizontal::Center)
                    .width(Length::Fill)
                    .color(if selected { Color::WHITE } else { pal.text_secondary }),
            )
            .width(Length::Fill)
            .padding(Padding::from([7.0, 10.0]))
            .style(surface_button_style(pal, selected, 10.0))
            .on_press(Message::TaskFormPriorityChanged(*prio)),
        );
    }

    let reminder_row = row![
        text_input("18:00", &form.reminder_time)
            .on_input(Message::TaskFormReminderTimeChanged)
            .size(13)
            .padding(Padding::from([7.0, 10.0]))
            .width(Length::Fixed(90.0))
            .style(soft_input_style(pal, 10.0)),
        Space::with_width(Length::Fill),
        toggler(form.reminder_enabled)
            .label("فعال‌سازی یادآور مطالعه")
            .text_shaping(iced::widget::text::Shaping::Advanced)
            .spacing(10)
            .style(smooth_toggler_style(pal))
            .on_toggle(Message::TaskFormReminderToggled),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    let mut body = column![
        fa_bold("عنوان تکلیف")
            .size(12)
            .color(pal.text_secondary)
            .width(Length::Fill),
        title_input,
        fa_bold("یادداشت")
            .size(12)
            .color(pal.text_secondary)
            .width(Length::Fill),
        notes_input,
        fa_bold("روز هفته")
            .size(12)
            .color(pal.text_secondary)
            .width(Length::Fill),
        day_row,
    ]
    .spacing(10)
    .width(Length::Fill);

    if !is_editing {
        body = body.push(
            container(
                row![
                    Space::with_width(Length::Fill),
                    checkbox(
                        "ثبت برای تمام روزهای هفته (شنبه تا جمعه)",
                        form.repeat_all_week,
                    )
                    .text_shaping(iced::widget::text::Shaping::Advanced)
                    .size(17)
                    .style(round_checkbox_style(pal))
                    .on_toggle(Message::TaskFormAllWeekToggled),
                ]
                .align_y(Alignment::Center),
            )
            .width(Length::Fill)
            .padding(Padding::from([9.0, 12.0]))
            .style(card_container_style(pal, 12.0)),
        );
    }

    body = body
        .push(
            row![
                column![
                    fa_bold("اولویت")
                        .size(12)
                        .color(pal.text_secondary)
                        .width(Length::Fill),
                    prio_row,
                ]
                .spacing(6)
                .width(Length::Fill),
                column![
                    fa_bold("درس / دسته‌بندی")
                        .size(12)
                        .color(pal.text_secondary)
                        .width(Length::Fill),
                    subject_picker,
                ]
                .spacing(6)
                .width(Length::Fill),
            ]
            .spacing(12)
            .width(Length::Fill),
        )
        .push(
            container(reminder_row)
                .width(Length::Fill)
                .padding(Padding::from([10.0, 12.0]))
                .style(card_container_style(pal, 12.0)),
        );

    if let Some(ref err) = form.error {
        body = body.push(
            fa_text(err.clone())
                .size(12)
                .color(pal.danger)
                .width(Length::Fill),
        );
    }

    let footer = row![
        button(fa_text("انصراف").size(12.5).color(pal.text_secondary))
            .padding(Padding::from([8.0, 16.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        button(
            fa_bold(if is_editing {
                "ذخیره تغییرات"
            } else if form.repeat_all_week {
                "ثبت برای ۷ روز هفته"
            } else {
                "افزودن تکلیف"
            })
            .size(12.5)
            .color(Color::WHITE),
        )
        .padding(Padding::from([8.0, 20.0]))
        .style(accent_button_style(pal, 99.0))
        .on_press(Message::SubmitTaskForm),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    modal_shell(
        if is_editing {
            "ویرایش تکلیف"
        } else {
            "افزودن تکلیف جدید"
        },
        Some("مشخصات تکلیف درسی، روز هفته و یادآور را تنظیم کنید"),
        body.into(),
        footer.into(),
        540.0,
        pal,
    )
}

fn view_settings_modal<'a>(
    settings: &'a AppSettings,
    theme_mode: ThemeMode,
    total_task_count: usize,
    pal: AppPalette,
) -> Element<'a, Message> {
    let seg_btn = |label: &'static str, active: bool, msg: Message| {
        button(
            fa_text(label)
                .size(12)
                .color(if active { Color::WHITE } else { pal.text_secondary }),
        )
        .padding(Padding::from([6.0, 12.0]))
        .style(surface_button_style(pal, active, 10.0))
        .on_press(msg)
    };

    // Theme row
    let theme_row = row![
        row![
            seg_btn(
                "تاریک",
                theme_mode == ThemeMode::Dark,
                Message::SetTheme(ThemeMode::Dark),
            ),
            seg_btn(
                "روشن",
                theme_mode == ThemeMode::Light,
                Message::SetTheme(ThemeMode::Light),
            ),
        ]
        .spacing(6),
        Space::with_width(Length::Fill),
        fa_bold("تم برنامه").size(13).color(pal.text_primary),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    // Accent color swatches
    let mut swatch_row = row![].spacing(8).align_y(Alignment::Center);
    for preset in AccentPresetId::ALL {
        let swatch_color = accent_palette(preset, false).main;
        let selected = settings.accent_color == preset;
        swatch_row = swatch_row.push(
            button(
                fa_bold(if selected { "✓" } else { "" })
                    .size(12)
                    .align_x(Horizontal::Center)
                    .color(Color::WHITE),
            )
            .width(Length::Fixed(26.0))
            .height(Length::Fixed(26.0))
            .padding(0)
            .style(move |_t, _s| button::Style {
                background: Some(Background::Color(swatch_color)),
                text_color: Color::WHITE,
                border: Border {
                    color: if selected {
                        pal.text_primary
                    } else {
                        Color::TRANSPARENT
                    },
                    width: if selected { 2.0 } else { 0.0 },
                    radius: 99.0.into(),
                },
                shadow: iced::Shadow::default(),
            })
            .on_press(Message::SetAccentColor(preset)),
        );
    }

    let accent_row = row![
        swatch_row,
        Space::with_width(Length::Fill),
        fa_bold("رنگ اصلی").size(13).color(pal.text_primary),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    // Calendar display mode
    let mut cal_btns = row![].spacing(6);
    for mode in CalendarDisplayMode::ALL.iter().rev() {
        cal_btns = cal_btns.push(seg_btn(
            mode.label_fa(),
            settings.calendar_display == *mode,
            Message::SetCalendarDisplay(*mode),
        ));
    }
    let cal_row = row![
        cal_btns,
        Space::with_width(Length::Fill),
        fa_bold("نمایش تاریخ").size(13).color(pal.text_primary),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    // Density mode
    let mut density_btns = row![].spacing(6);
    for mode in DensityMode::ALL.iter().rev() {
        density_btns = density_btns.push(seg_btn(
            mode.label_fa(),
            settings.density == *mode,
            Message::SetDensity(*mode),
        ));
    }
    let density_row = row![
        density_btns,
        Space::with_width(Length::Fill),
        fa_bold("فاصله و تراکم کارت‌ها")
            .size(13)
            .color(pal.text_primary),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    let switch_row = |label: &'static str, checked: bool, on_toggle: fn(bool) -> Message| {
        row![
            toggler(checked)
                .style(smooth_toggler_style(pal))
                .on_toggle(on_toggle),
            Space::with_width(Length::Fill),
            fa_text(label).size(13).color(pal.text_primary),
        ]
        .align_y(Alignment::Center)
        .width(Length::Fill)
    };

    let appearance_card = container(
        column![
            theme_row,
            accent_row,
            cal_row,
            density_row,
            switch_row(
                "نمایش تکالیف تکمیل‌شده",
                settings.show_completed_tasks,
                Message::SetShowCompletedTasks,
            ),
            switch_row(
                "نمایش یادداشت در کارت‌ها",
                settings.show_task_notes,
                Message::SetShowTaskNotes,
            ),
            switch_row(
                "انیمیشن‌های نرم",
                settings.smooth_animations,
                Message::SetSmoothAnimations,
            ),
        ]
        .spacing(12),
    )
    .width(Length::Fill)
    .padding(14)
    .style(card_container_style(pal, 16.0));

    // Defaults section
    let mut def_prio_btns = row![].spacing(6);
    for prio in PriorityLevel::ALL.iter().rev() {
        def_prio_btns = def_prio_btns.push(seg_btn(
            prio.label_fa(),
            settings.default_priority == *prio,
            Message::SetDefaultPriority(*prio),
        ));
    }

    let defaults_card = container(
        column![
            row![
                def_prio_btns,
                Space::with_width(Length::Fill),
                fa_bold("اولویت پیش‌فرض").size(13).color(pal.text_primary),
            ]
            .align_y(Alignment::Center),
            switch_row(
                "فعال بودن یادآور به‌صورت پیش‌فرض",
                settings.default_reminder_enabled,
                Message::SetDefaultReminderEnabled,
            ),
            row![
                text_input("18:00", &settings.default_reminder_time)
                    .on_input(Message::SetDefaultReminderTime)
                    .size(12.5)
                    .padding(Padding::from([6.0, 10.0]))
                    .width(Length::Fixed(86.0))
                    .style(soft_input_style(pal, 10.0)),
                Space::with_width(Length::Fill),
                fa_text("ساعت یادآور پیش‌فرض")
                    .size(13)
                    .color(pal.text_primary),
            ]
            .align_y(Alignment::Center),
        ]
        .spacing(12),
    )
    .width(Length::Fill)
    .padding(14)
    .style(card_container_style(pal, 16.0));

    // Notifications & sound section
    let notif_card = container(
        column![
            switch_row(
                "صدای زنگ یادآور",
                settings.reminder_sound_enabled,
                Message::SetReminderSoundEnabled,
            ),
            switch_row(
                "اعلان سیستمی دسکتاپ",
                settings.os_notifications_enabled,
                Message::SetOsNotificationsEnabled,
            ),
            row![
                button(fa_text("تست صدا و اعلان").size(12).color(pal.text_primary))
                    .padding(Padding::from([6.0, 12.0]))
                    .style(surface_button_style(pal, false, 10.0))
                    .on_press(Message::TestReminderNotification),
                Space::with_width(Length::Fill),
                fa_text("پیش‌نمایش یادآور").size(13).color(pal.text_primary),
            ]
            .align_y(Alignment::Center),
        ]
        .spacing(12),
    )
    .width(Length::Fill)
    .padding(14)
    .style(card_container_style(pal, 16.0));

    // Data management section (including Delete All Tasks)
    let data_btns = row![
        button(
            fa_text("ورودی JSON")
                .size(12)
                .align_x(Horizontal::Center)
                .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(Padding::from([10.0, 8.0]))
        .style(surface_button_style(pal, false, 12.0))
        .on_press(Message::OpenImportModal),
        button(
            fa_text("خروجی JSON")
                .size(12)
                .align_x(Horizontal::Center)
                .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(Padding::from([10.0, 8.0]))
        .style(surface_button_style(pal, false, 12.0))
        .on_press(Message::ExportJsonBackup),
        button(
            fa_text("مدیریت درس‌ها")
                .size(12)
                .align_x(Horizontal::Center)
                .width(Length::Fill),
        )
        .width(Length::Fill)
        .padding(Padding::from([10.0, 8.0]))
        .style(surface_button_style(pal, false, 12.0))
        .on_press(Message::OpenSubjectsModal),
    ]
    .spacing(8)
    .width(Length::Fill);

    let mut data_col = column![data_btns].spacing(10).width(Length::Fill);
    if total_task_count > 0 {
        data_col = data_col.push(
            row![
                Space::with_width(Length::Fill),
                button(fa_bold("حذف همه تکالیف").size(12).color(pal.danger))
                    .padding(Padding::from([8.0, 14.0]))
                    .style(danger_button_style(pal, false, 12.0))
                    .on_press(Message::OpenDeleteAllModal),
            ]
            .width(Length::Fill),
        );
    }

    let body = column![
        fa_bold("ظاهر و نمایش")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
        appearance_card,
        fa_bold("پیش‌فرض تکلیف جدید")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
        defaults_card,
        fa_bold("اعلان و صدا")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
        notif_card,
        fa_bold("مدیریت درس‌ها و پشتیبان‌گیری")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
        data_col,
    ]
    .spacing(12)
    .width(Length::Fill);

    let footer = row![
        button(fa_bold("تأیید و بستن").size(12.5).color(Color::WHITE))
            .padding(Padding::from([8.0, 20.0]))
            .style(accent_button_style(pal, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        button(fa_text("بازگردانی پیش‌فرض‌ها").size(12).color(pal.text_secondary))
            .padding(Padding::from([7.0, 12.0]))
            .style(ghost_button_style(pal, false, 10.0))
            .on_press(Message::ResetSettings),
    ]
    .align_y(Alignment::Center)
    .width(Length::Fill);

    modal_shell(
        "تنظیمات",
        Some("شخصی‌سازی ظاهر، تقویم، انیمیشن‌ها و پیش‌فرض تکالیف (نسخه بومی Rust)"),
        body.into(),
        footer.into(),
        580.0,
        pal,
    )
}

fn view_subjects_modal<'a>(
    draft_name: &'a str,
    draft_color: &'a str,
    subjects: &'a [SubjectCategory],
    pal: AppPalette,
) -> Element<'a, Message> {
    let mut swatches = row![].spacing(8);
    for hex in SUBJECT_COLOR_SWATCHES {
        let color = hex_to_color(hex);
        let selected = draft_color.eq_ignore_ascii_case(hex);
        swatches = swatches.push(
            button(
                fa_bold(if selected { "✓" } else { "" })
                    .size(11)
                    .align_x(Horizontal::Center)
                    .color(Color::WHITE),
            )
            .width(Length::Fixed(24.0))
            .height(Length::Fixed(24.0))
            .padding(0)
            .style(move |_t, _s| button::Style {
                background: Some(Background::Color(color)),
                text_color: Color::WHITE,
                border: Border {
                    color: if selected {
                        pal.text_primary
                    } else {
                        Color::TRANSPARENT
                    },
                    width: if selected { 2.0 } else { 0.0 },
                    radius: 99.0.into(),
                },
                shadow: iced::Shadow::default(),
            })
            .on_press(Message::SubjectDraftColorChanged(hex.to_string())),
        );
    }

    let add_form = container(
        column![
            row![
                button(fa_bold("افزودن درس").size(12).color(Color::WHITE))
                    .padding(Padding::from([8.0, 14.0]))
                    .style(accent_button_style(pal, 10.0))
                    .on_press(Message::AddSubject),
                text_input("نام درس جدید (مثلاً: زیست‌شناسی)", draft_name)
                    .on_input(Message::SubjectDraftNameChanged)
                    .on_submit(Message::AddSubject)
                    .align_x(Horizontal::Right)
                    .size(13)
                    .padding(Padding::from([8.0, 12.0]))
                    .width(Length::Fill)
                    .style(soft_input_style(pal, 10.0)),
            ]
            .spacing(8)
            .align_y(Alignment::Center),
            row![
                swatches,
                Space::with_width(Length::Fill),
                fa_text("رنگ درس:").size(12).color(pal.text_secondary),
            ]
            .align_y(Alignment::Center),
        ]
        .spacing(10),
    )
    .width(Length::Fill)
    .padding(12)
    .style(card_container_style(pal, 14.0));

    let mut list_col = column![add_form].spacing(8).width(Length::Fill);
    let can_delete = subjects.len() > 1;

    for subject in subjects {
        let dot_color = hex_to_color(&subject.color);
        let mut r = row![].spacing(10).align_y(Alignment::Center).width(Length::Fill);
        if can_delete {
            r = r.push(
                button(fa_text("حذف").size(11.5).color(pal.danger))
                    .padding(Padding::from([4.0, 10.0]))
                    .style(danger_button_style(pal, false, 8.0))
                    .on_press(Message::DeleteSubject(subject.id.clone())),
            );
        }
        r = r
            .push(Space::with_width(Length::Fill))
            .push(fa_text(subject.name.clone()).size(13).color(pal.text_primary))
            .push(
                container(Space::with_width(10))
                    .height(10)
                    .style(move |_t| container::Style {
                        background: Some(Background::Color(dot_color)),
                        border: Border {
                            radius: 99.0.into(),
                            ..Border::default()
                        },
                        ..container::Style::default()
                    }),
            );
        list_col = list_col.push(
            container(r)
                .width(Length::Fill)
                .padding(Padding::from([8.0, 12.0]))
                .style(card_container_style(pal, 12.0)),
        );
    }

    let footer = row![
        button(fa_bold("بستن").size(12.5).color(Color::WHITE))
            .padding(Padding::from([8.0, 20.0]))
            .style(accent_button_style(pal, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
    ]
    .width(Length::Fill);

    modal_shell(
        "مدیریت درس‌ها",
        Some("ساخت یا حذف دسته‌بندی درس‌ها با رنگ اختصاصی"),
        list_col.into(),
        footer.into(),
        480.0,
        pal,
    )
}

fn view_import_modal<'a>(
    raw_json: &'a str,
    file_path: &'a str,
    mode: ImportMode,
    apply_theme: bool,
    error: Option<&'a str>,
    pal: AppPalette,
) -> Element<'a, Message> {
    let mode_row = row![
        button(
            fa_text("ادغام با داده‌های فعلی")
                .size(12)
                .align_x(Horizontal::Center)
                .width(Length::Fill)
                .color(if mode == ImportMode::Merge {
                    Color::WHITE
                } else {
                    pal.text_secondary
                }),
        )
        .width(Length::Fill)
        .padding(Padding::from([8.0, 10.0]))
        .style(surface_button_style(pal, mode == ImportMode::Merge, 10.0))
        .on_press(Message::ImportModeChanged(ImportMode::Merge)),
        button(
            fa_text("جایگزینی کامل")
                .size(12)
                .align_x(Horizontal::Center)
                .width(Length::Fill)
                .color(if mode == ImportMode::Replace {
                    Color::WHITE
                } else {
                    pal.text_secondary
                }),
        )
        .width(Length::Fill)
        .padding(Padding::from([8.0, 10.0]))
        .style(surface_button_style(pal, mode == ImportMode::Replace, 10.0))
        .on_press(Message::ImportModeChanged(ImportMode::Replace)),
    ]
    .spacing(8)
    .width(Length::Fill);

    let mut body = column![
        row![
            button(fa_bold("بارگذاری آخرین پشتیبان").size(12).color(Color::WHITE))
                .padding(Padding::from([8.0, 12.0]))
                .style(accent_button_style(pal, 10.0))
                .on_press(Message::LoadLatestBackupFile),
            Space::with_width(Length::Fill),
            fa_text("بارگذاری خودکار از پوشه Downloads/WeeklyStudyPlanner")
                .size(12)
                .color(pal.text_secondary),
        ]
        .align_y(Alignment::Center)
        .width(Length::Fill),
        row![
            button(fa_text("خواندن فایل").size(12).color(pal.text_primary))
                .padding(Padding::from([8.0, 12.0]))
                .style(surface_button_style(pal, false, 10.0))
                .on_press(Message::LoadBackupFromPath),
            text_input("مسیر فایل JSON پشتیبان...", file_path)
                .on_input(Message::ImportPathChanged)
                .size(12.5)
                .padding(Padding::from([8.0, 10.0]))
                .width(Length::Fill)
                .style(soft_input_style(pal, 10.0)),
        ]
        .spacing(8),
        fa_bold("یا چسباندن مستقیم متن JSON (سازگار با نسخه وب و اندروید)")
            .size(12)
            .color(pal.text_secondary)
            .width(Length::Fill),
        text_input("{ \"schemaVersion\": 1, \"tasks\": [...] }", raw_json)
            .on_input(Message::ImportRawJsonChanged)
            .size(12)
            .padding(Padding::from([10.0, 12.0]))
            .width(Length::Fill)
            .style(soft_input_style(pal, 12.0)),
        mode_row,
        row![
            Space::with_width(Length::Fill),
            checkbox("اعمال تم ذخیره شده در پشتیبان", apply_theme)
                .text_shaping(iced::widget::text::Shaping::Advanced)
                .size(16)
                .style(round_checkbox_style(pal))
                .on_toggle(Message::ImportApplyThemeToggled),
        ],
    ]
    .spacing(12)
    .width(Length::Fill);

    if let Some(err) = error {
        body = body.push(fa_text(err).size(12).color(pal.danger).width(Length::Fill));
    }

    let footer = row![
        button(fa_text("انصراف").size(12.5).color(pal.text_secondary))
            .padding(Padding::from([8.0, 16.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        button(fa_bold("بازیابی داده‌ها").size(12.5).color(Color::WHITE))
            .padding(Padding::from([8.0, 20.0]))
            .style(accent_button_style(pal, 99.0))
            .on_press(Message::ApplyImportBackup),
    ]
    .width(Length::Fill);

    modal_shell(
        "ورودی و بازیابی پشتیبان JSON",
        Some("پشتیبانی از schemaVersion 1 — کاملاً سازگار با نسخه‌های وب و اندروید"),
        body.into(),
        footer.into(),
        540.0,
        pal,
    )
}

fn view_print_modal<'a>(
    week_span: &'a WeekSpanSummary,
    week_task_count: usize,
    options: PrintScheduleOptions,
    pal: AppPalette,
) -> Element<'a, Message> {
    let body = column![
        container(
            column![
                fa_bold(format!("برنامه هفته: {}", week_span.jalali_span))
                    .size(14)
                    .color(pal.text_primary)
                    .width(Length::Fill),
                fa_text(format!(
                    "{} · {} تکلیف ثبت‌شده در این هفته",
                    week_span.gregorian_span,
                    format_persian_usize(week_task_count)
                ))
                .size(12)
                .color(pal.text_muted)
                .width(Length::Fill),
            ]
            .spacing(4),
        )
        .width(Length::Fill)
        .padding(14)
        .style(card_container_style(pal, 14.0)),
        container(
            column![
                row![
                    toggler(options.include_completed)
                        .style(smooth_toggler_style(pal))
                        .on_toggle(Message::PrintIncludeCompletedToggled),
                    Space::with_width(Length::Fill),
                    fa_text("نمایش تکالیف تکمیل‌شده در خروجی")
                        .size(13)
                        .color(pal.text_primary),
                ]
                .align_y(Alignment::Center),
                row![
                    toggler(options.include_notes)
                        .style(smooth_toggler_style(pal))
                        .on_toggle(Message::PrintIncludeNotesToggled),
                    Space::with_width(Length::Fill),
                    fa_text("نمایش یادداشت زیر تکالیف")
                        .size(13)
                        .color(pal.text_primary),
                ]
                .align_y(Alignment::Center),
            ]
            .spacing(12),
        )
        .width(Length::Fill)
        .padding(14)
        .style(card_container_style(pal, 14.0)),
        fa_text("فایل‌های خروجی در پوشه Downloads/WeeklyStudyPlanner ذخیره می‌شوند.")
            .size(11.5)
            .color(pal.text_muted)
            .width(Length::Fill),
    ]
    .spacing(12)
    .width(Length::Fill);

    let footer = row![
        button(fa_text("بستن").size(12.5).color(pal.text_secondary))
            .padding(Padding::from([8.0, 14.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        button(fa_text("ذخیره برگه چاپ فارسی A4").size(12).color(pal.text_primary))
            .padding(Padding::from([8.0, 14.0]))
            .style(surface_button_style(pal, false, 99.0))
            .on_press(Message::ExportPrintableHtml),
        button(fa_bold("ذخیره فایل PDF").size(12.5).color(Color::WHITE))
            .padding(Padding::from([8.0, 18.0]))
            .style(accent_button_style(pal, 99.0))
            .on_press(Message::ExportPdfSchedule),
    ]
    .spacing(8)
    .align_y(Alignment::Center)
    .width(Length::Fill);

    modal_shell(
        "چاپ و خروجی A4 / PDF",
        Some("خروجی بومی Rust در پوشه Downloads/WeeklyStudyPlanner"),
        body.into(),
        footer.into(),
        520.0,
        pal,
    )
}

fn view_delete_all_modal<'a>(
    scope: DeleteScope,
    permanent: bool,
    total_task_count: usize,
    week_task_count: usize,
    week_span: &'a WeekSpanSummary,
    pal: AppPalette,
) -> Element<'a, Message> {
    let target_count = match scope {
        DeleteScope::All => total_task_count,
        DeleteScope::Week => week_task_count,
    };

    let scope_row = row![
        button(
            fa_text(format!(
                "فقط هفته جاری ({})",
                format_persian_usize(week_task_count)
            ))
            .size(12)
            .align_x(Horizontal::Center)
            .width(Length::Fill)
            .color(if scope == DeleteScope::Week {
                Color::WHITE
            } else {
                pal.text_secondary
            }),
        )
        .width(Length::Fill)
        .padding(Padding::from([9.0, 8.0]))
        .style(surface_button_style(pal, scope == DeleteScope::Week, 10.0))
        .on_press(Message::DeleteAllScopeChanged(DeleteScope::Week)),
        button(
            fa_text(format!(
                "همه تکالیف ({})",
                format_persian_usize(total_task_count)
            ))
            .size(12)
            .align_x(Horizontal::Center)
            .width(Length::Fill)
            .color(if scope == DeleteScope::All {
                Color::WHITE
            } else {
                pal.text_secondary
            }),
        )
        .width(Length::Fill)
        .padding(Padding::from([9.0, 8.0]))
        .style(surface_button_style(pal, scope == DeleteScope::All, 10.0))
        .on_press(Message::DeleteAllScopeChanged(DeleteScope::All)),
    ]
    .spacing(8)
    .width(Length::Fill);

    let body = column![
        fa_text(format!(
            "بازه هفته جاری: {} — با تأیید این عملیات {} تکلیف حذف می‌شود.",
            week_span.jalali_span,
            format_persian_usize(target_count)
        ))
        .size(12.5)
        .color(pal.text_secondary)
        .width(Length::Fill),
        scope_row,
        container(
            row![
                Space::with_width(Length::Fill),
                checkbox("حذف دائمی (بدون انتقال به «اخیراً حذف‌شده»)", permanent)
                    .text_shaping(iced::widget::text::Shaping::Advanced)
                    .size(16)
                    .style(round_checkbox_style(pal))
                    .on_toggle(Message::DeleteAllPermanentToggled),
            ]
            .align_y(Alignment::Center),
        )
        .width(Length::Fill)
        .padding(Padding::from([10.0, 12.0]))
        .style(card_container_style(pal, 12.0)),
    ]
    .spacing(12)
    .width(Length::Fill);

    let footer = row![
        button(fa_text("انصراف").size(12.5).color(pal.text_secondary))
            .padding(Padding::from([8.0, 16.0]))
            .style(ghost_button_style(pal, false, 99.0))
            .on_press(Message::CloseModal),
        Space::with_width(Length::Fill),
        button(
            fa_bold(if permanent {
                "حذف دائمی تکالیف"
            } else {
                "انتقال به سطل بازیافت"
            })
            .size(12.5)
            .color(Color::WHITE),
        )
        .padding(Padding::from([8.0, 18.0]))
        .style(danger_button_style(pal, true, 99.0))
        .on_press(Message::ConfirmDeleteAll),
    ]
    .width(Length::Fill);

    modal_shell(
        "حذف همه تکالیف",
        Some("به‌صورت پیش‌فرض موارد حذف‌شده قابل بازیابی از «اخیراً حذف‌شده» هستند"),
        body.into(),
        footer.into(),
        470.0,
        pal,
    )
}
