use crate::app::Message;
use crate::jalali::{format_persian_u32, format_persian_usize};
use crate::models::WeeklyProgressSummary;
use crate::settings::AppPalette;
use crate::ui::{accent_button_style, card_container_style, fa_bold, fa_text};
use iced::alignment::Horizontal;
use iced::widget::canvas::{Frame, Geometry, Path, Program, Stroke};
use iced::widget::{button, canvas, column, container, row, Space};
use iced::{Alignment, Color, Element, Length, Padding, Point, Rectangle, Renderer, Size, Theme};

struct WeeklyChartCanvas {
    summary: WeeklyProgressSummary,
    palette: AppPalette,
}

impl Program<Message> for WeeklyChartCanvas {
    type State = ();

    fn draw(
        &self,
        _state: &Self::State,
        renderer: &Renderer,
        _theme: &Theme,
        bounds: Rectangle,
        _cursor: iced::mouse::Cursor,
    ) -> Vec<Geometry> {
        let mut frame = Frame::new(renderer, bounds.size());
        let width = bounds.width.max(100.0);
        let height = bounds.height.max(100.0);
        let pad_top = 18.0;
        let pad_bottom = 14.0;
        let pad_x = 18.0;
        let chart_h = (height - pad_top - pad_bottom).max(40.0);
        let chart_w = (width - pad_x * 2.0).max(60.0);

        // Horizontal dashed-like subtle guide lines
        let grid_color = self.palette.border_subtle;
        for step in 0..=4 {
            let y = pad_top + chart_h * (step as f32 / 4.0);
            let line = Path::line(Point::new(pad_x, y), Point::new(width - pad_x, y));
            frame.stroke(&line, Stroke::default().with_color(grid_color).with_width(1.0));
        }

        let max_val = self.summary.max_daily_tasks.max(1) as f32;
        let count = self.summary.days.len().max(1);
        let slot_w = chart_w / count as f32;
        let bar_w = (slot_w * 0.30).clamp(12.0, 28.0);
        let bar_gap = 6.0;

        // Render days right-to-left (Saturday on the right -> Friday on the left)
        for (idx, day) in self.summary.days.iter().enumerate() {
            let rtl_idx = (count - 1).saturating_sub(idx);
            let center_x = pad_x + slot_w * (rtl_idx as f32 + 0.5);

            // Remaining bar (left of pair)
            let rem_h = if day.remaining > 0 {
                ((day.remaining as f32 / max_val) * chart_h).max(6.0)
            } else {
                0.0
            };
            if rem_h > 0.0 {
                let x = center_x - bar_w - bar_gap * 0.5;
                let y = pad_top + chart_h - rem_h;
                let path = Path::rounded_rectangle(
                    Point::new(x, y),
                    Size::new(bar_w, rem_h),
                    6.0.into(),
                );
                let rem_color = if self.palette.is_dark {
                    Color::from_rgb8(82, 82, 91)
                } else {
                    Color::from_rgb8(212, 212, 216)
                };
                frame.fill(&path, rem_color);
            }

            // Completed bar (right of pair)
            let comp_h = if day.completed > 0 {
                ((day.completed as f32 / max_val) * chart_h).max(6.0)
            } else {
                0.0
            };
            if comp_h > 0.0 {
                let x = center_x + bar_gap * 0.5;
                let y = pad_top + chart_h - comp_h;
                let path = Path::rounded_rectangle(
                    Point::new(x, y),
                    Size::new(bar_w, comp_h),
                    6.0.into(),
                );
                frame.fill(&path, self.palette.success);
            }

            // Subtle placeholder baseline pill if day has 0 tasks
            if day.total == 0 {
                let x = center_x - bar_w * 0.6;
                let y = pad_top + chart_h - 4.0;
                let path = Path::rounded_rectangle(
                    Point::new(x, y),
                    Size::new(bar_w * 1.2, 4.0),
                    2.0.into(),
                );
                frame.fill(&path, self.palette.border_subtle);
            }
        }

        vec![frame.into_geometry()]
    }
}

pub fn view_analytics<'a>(
    summary: &'a WeeklyProgressSummary,
    pal: AppPalette,
) -> Element<'a, Message> {
    let stat_card = |label: &'static str, value: String, color: Color| {
        container(
            column![
                fa_text(label).size(12).color(pal.text_muted),
                fa_bold(value).size(24).color(color),
            ]
            .spacing(4)
            .align_x(Alignment::End),
        )
        .width(Length::Fill)
        .padding(Padding::from([14.0, 16.0]))
        .style(card_container_style(pal, 16.0))
    };

    let kpi_row = row![
        stat_card(
            "درصد پیشرفت",
            format!("{}٪", format_persian_u32(summary.completion_rate)),
            pal.accent.main,
        ),
        stat_card(
            "باقی‌مانده",
            format_persian_usize(summary.remaining_tasks),
            pal.text_primary,
        ),
        stat_card(
            "تکمیل‌شده",
            format_persian_usize(summary.completed_tasks),
            pal.success,
        ),
        stat_card(
            "کل تکالیف هفته",
            format_persian_usize(summary.total_tasks),
            pal.text_primary,
        ),
    ]
    .spacing(12);

    if summary.total_tasks == 0 {
        return column![
            kpi_row,
            container(
                column![
                    fa_bold("در این هفته هنوز تکلیفی ثبت نشده است")
                        .size(15)
                        .color(pal.text_primary),
                    fa_text("با افزودن اولین تکلیف، نمودار پیشرفت هفتگی شما به‌صورت زنده رسم می‌شود.")
                        .size(12.5)
                        .color(pal.text_muted),
                    Space::with_height(8),
                    button(fa_bold("افزودن تکلیف جدید").size(13).color(Color::WHITE))
                        .padding(Padding::from([8.0, 18.0]))
                        .style(accent_button_style(pal, 99.0))
                        .on_press(Message::OpenNewTaskModal(None)),
                ]
                .spacing(8)
                .align_x(Alignment::Center),
            )
            .width(Length::Fill)
            .padding(40)
            .center_x(Length::Fill)
            .style(card_container_style(pal, 18.0)),
        ]
        .spacing(16)
        .into();
    }

    let legend = row![
        row![
            fa_text("باقی‌مانده").size(12).color(pal.text_secondary),
            container(Space::with_width(10))
                .height(10)
                .style(move |_t| container::Style {
                    background: Some(iced::Background::Color(if pal.is_dark {
                        Color::from_rgb8(82, 82, 91)
                    } else {
                        Color::from_rgb8(212, 212, 216)
                    })),
                    border: iced::Border {
                        radius: 99.0.into(),
                        ..iced::Border::default()
                    },
                    ..container::Style::default()
                }),
        ]
        .spacing(6)
        .align_y(Alignment::Center),
        row![
            fa_text("تکمیل‌شده").size(12).color(pal.text_secondary),
            container(Space::with_width(10))
                .height(10)
                .style(move |_t| container::Style {
                    background: Some(iced::Background::Color(pal.success)),
                    border: iced::Border {
                        radius: 99.0.into(),
                        ..iced::Border::default()
                    },
                    ..container::Style::default()
                }),
        ]
        .spacing(6)
        .align_y(Alignment::Center),
        Space::with_width(Length::Fill),
        fa_bold("نمودار مقایسه تکالیف روزانه (شنبه تا جمعه)")
            .size(14)
            .color(pal.text_primary),
    ]
    .spacing(16)
    .align_y(Alignment::Center);

    let chart_widget: Element<'a, Message> = canvas(WeeklyChartCanvas {
        summary: summary.clone(),
        palette: pal,
    })
    .width(Length::Fill)
    .height(Length::Fixed(230.0))
    .into();

    // Synchronized RTL labels beneath bars (Friday on left -> Saturday on right)
    let mut day_labels = row![].spacing(4);
    for day in summary.days.iter().rev() {
        day_labels = day_labels.push(
            column![
                fa_bold(day.weekday_fa.clone())
                    .size(12)
                    .align_x(Horizontal::Center)
                    .width(Length::Fill)
                    .color(pal.text_primary),
                fa_text(day.jalali_short.clone())
                    .size(11)
                    .align_x(Horizontal::Center)
                    .width(Length::Fill)
                    .color(pal.text_muted),
                fa_text(format!(
                    "{} / {}",
                    format_persian_usize(day.completed),
                    format_persian_usize(day.total)
                ))
                .size(11)
                .align_x(Horizontal::Center)
                .width(Length::Fill)
                .color(if day.completed > 0 {
                    pal.success
                } else {
                    pal.text_muted
                }),
            ]
            .spacing(2)
            .width(Length::Fill)
            .align_x(Alignment::Center),
        );
    }

    let chart_card = container(
        column![legend, chart_widget, day_labels]
            .spacing(12)
            .width(Length::Fill),
    )
    .width(Length::Fill)
    .padding(Padding::from([18.0, 20.0]))
    .style(card_container_style(pal, 18.0));

    column![kpi_row, chart_card].spacing(16).into()
}
