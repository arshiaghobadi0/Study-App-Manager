use crate::backup::{resolve_export_dir, sanitize_export_filename};
use crate::jalali::{format_week_span_summary, parse_iso_date, to_persian_digits, WeekDayInfo};
use crate::models::{PrintScheduleOptions, StudyTask, SubjectCategory};
use crate::tasks::sort_tasks_for_day;
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub fn build_schedule_pdf_filename(week_start_iso: &str) -> String {
    let stem = if parse_iso_date(week_start_iso).is_some() {
        format!("study-planner-week-{week_start_iso}")
    } else {
        "study-planner-schedule".to_string()
    };
    sanitize_export_filename(&stem, "study-planner-schedule", "pdf")
}

pub fn build_schedule_html_filename(week_start_iso: &str) -> String {
    let stem = if parse_iso_date(week_start_iso).is_some() {
        format!("study-planner-week-{week_start_iso}")
    } else {
        "study-planner-schedule".to_string()
    };
    sanitize_export_filename(&stem, "study-planner-schedule", "html")
}

fn pdf_escape_ascii(input: &str) -> String {
    let mut out = String::with_capacity(input.len());
    for ch in input.chars() {
        match ch {
            '\\' => out.push_str("\\\\"),
            '(' => out.push_str("\\("),
            ')' => out.push_str("\\)"),
            c if c.is_ascii() && !c.is_ascii_control() => out.push(c),
            _ => out.push(' '),
        }
    }
    out
}

fn html_escape(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

/// Generates a standards-compliant A4 PDF 1.4 document in pure Rust with zero C dependencies.
pub fn render_schedule_pdf_bytes(
    week_days: &[WeekDayInfo],
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    options: PrintScheduleOptions,
) -> Vec<u8> {
    let subject_map: HashMap<&str, &SubjectCategory> =
        subjects.iter().map(|s| (s.id.as_str(), s)).collect();
    let span = format_week_span_summary(week_days);

    let mut lines: Vec<(f32, bool, String)> = Vec::new();
    lines.push((16.0, true, "Weekly Study Planner — A4 Schedule".to_string()));
    lines.push((
        10.0,
        false,
        format!("Week: {} (Sat - Fri)", span.gregorian_span),
    ));
    lines.push((6.0, false, String::new()));

    let mut total_tasks = 0usize;
    let mut completed_tasks = 0usize;

    for day in week_days {
        let mut day_tasks: Vec<StudyTask> = tasks
            .iter()
            .filter(|t| t.date_iso == day.date_iso && (options.include_completed || !t.completed))
            .cloned()
            .collect();
        sort_tasks_for_day(&mut day_tasks);

        total_tasks += day_tasks.len();
        completed_tasks += day_tasks.iter().filter(|t| t.completed).count();

        lines.push((
            12.0,
            true,
            format!(
                "{} | {} ({}) - {} task(s)",
                day.weekday_en,
                day.gregorian_short,
                day.date_iso,
                day_tasks.len()
            ),
        ));

        if day_tasks.is_empty() {
            lines.push((9.5, false, "   (No scheduled tasks)".to_string()));
        } else {
            for (idx, task) in day_tasks.iter().enumerate() {
                let status = if task.completed { "[x]" } else { "[ ]" };
                let prio = match task.priority {
                    crate::models::PriorityLevel::High => "HIGH",
                    crate::models::PriorityLevel::Medium => "MED",
                    crate::models::PriorityLevel::Low => "LOW",
                };
                let reminder = if task.reminder_enabled {
                    format!(" @ {}", task.reminder_time)
                } else {
                    String::new()
                };
                let subj_id = subject_map
                    .get(task.subject_id.as_str())
                    .map(|s| s.id.as_str())
                    .unwrap_or("general");
                let ascii_title = pdf_escape_ascii(&task.title);
                let title_display = if ascii_title.trim().is_empty() {
                    format!("Persian Task #{}", idx + 1)
                } else {
                    ascii_title.trim().to_string()
                };
                lines.push((
                    9.5,
                    false,
                    format!("   {status} [{prio}] ({subj_id}){reminder} - {title_display}"),
                ));
                if options.include_notes {
                    if let Some(ref notes) = task.notes {
                        let ascii_notes = pdf_escape_ascii(notes);
                        if !ascii_notes.trim().is_empty() {
                            lines.push((8.5, false, format!("       Note: {}", ascii_notes.trim())));
                        }
                    }
                }
            }
        }
        lines.push((5.0, false, String::new()));
    }

    lines.insert(
        2,
        (
            9.5,
            false,
            format!(
                "Summary: Total {} | Completed {} | Remaining {}",
                total_tasks,
                completed_tasks,
                total_tasks.saturating_sub(completed_tasks)
            ),
        ),
    );

    // Paginate into A4 pages (595 x 842 pt)
    let mut pages_streams: Vec<String> = Vec::new();
    let mut current_stream = String::new();
    let mut y = 800.0_f32;

    for (font_size, is_bold, text) in lines {
        let step = if text.is_empty() { 8.0 } else { font_size + 5.0 };
        if y - step < 48.0 {
            pages_streams.push(current_stream);
            current_stream = String::new();
            y = 800.0;
        }
        if !text.is_empty() {
            let font_ref = if is_bold { "/F2" } else { "/F1" };
            let escaped = pdf_escape_ascii(&text);
            current_stream.push_str(&format!(
                "BT {font_ref} {font_size:.1} Tf 44.0 {y:.1} Td ({escaped}) Tj ET\n"
            ));
        }
        y -= step;
    }
    if current_stream.is_empty() {
        current_stream.push_str("BT /F1 11.0 Tf 44.0 780.0 Td (Weekly Study Planner) Tj ET\n");
    }
    pages_streams.push(current_stream);

    // Assemble PDF 1.4 objects
    // 1: Catalog, 2: Pages, 3: Helvetica, 4: Helvetica-Bold, then pairs of (Page, Content)
    let mut objects: Vec<String> = Vec::new();
    objects.push("<< /Type /Catalog /Pages 2 0 R >>".to_string());

    let page_count = pages_streams.len();
    let kids: Vec<String> = (0..page_count)
        .map(|i| format!("{} 0 R", 5 + i * 2))
        .collect();
    objects.push(format!(
        "<< /Type /Pages /Kids [{}] /Count {} >>",
        kids.join(" "),
        page_count
    ));
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>".to_string());
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>".to_string());

    for (i, stream) in pages_streams.into_iter().enumerate() {
        let content_id = 6 + i * 2;
        objects.push(format!(
            "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents {content_id} 0 R >>"
        ));
        objects.push(format!(
            "<< /Length {} >>\nstream\n{}endstream",
            stream.len(),
            stream
        ));
    }

    let mut pdf = Vec::<u8>::new();
    pdf.extend_from_slice(b"%PDF-1.4\n");

    let mut offsets: Vec<usize> = Vec::with_capacity(objects.len() + 1);
    offsets.push(0);

    for (idx, body) in objects.iter().enumerate() {
        offsets.push(pdf.len());
        let obj_num = idx + 1;
        pdf.extend_from_slice(format!("{obj_num} 0 obj\n{body}\nendobj\n").as_bytes());
    }

    let xref_offset = pdf.len();
    pdf.extend_from_slice(format!("xref\n0 {}\n", objects.len() + 1).as_bytes());
    pdf.extend_from_slice(b"0000000000 65535 f \n");
    for offset in offsets.iter().skip(1) {
        pdf.extend_from_slice(format!("{offset:010} 00000 n \n").as_bytes());
    }
    pdf.extend_from_slice(
        format!(
            "trailer\n<< /Size {} /Root 1 0 R >>\nstartxref\n{}\n%%EOF\n",
            objects.len() + 1,
            xref_offset
        )
        .as_bytes(),
    );

    pdf
}

/// Renders a crisp, zero-JavaScript RTL Persian A4 printable schedule sheet (.html).
pub fn render_persian_printable_html(
    week_days: &[WeekDayInfo],
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    options: PrintScheduleOptions,
) -> String {
    let subject_map: HashMap<&str, &SubjectCategory> =
        subjects.iter().map(|s| (s.id.as_str(), s)).collect();
    let span = format_week_span_summary(week_days);

    let mut cards_html = String::new();
    for day in week_days {
        let mut day_tasks: Vec<StudyTask> = tasks
            .iter()
            .filter(|t| t.date_iso == day.date_iso && (options.include_completed || !t.completed))
            .cloned()
            .collect();
        sort_tasks_for_day(&mut day_tasks);

        let mut items = String::new();
        if day_tasks.is_empty() {
            items.push_str("<p class=\"empty\">تکلیفی ثبت نشده است</p>");
        } else {
            for task in &day_tasks {
                let subj = subject_map.get(task.subject_id.as_str());
                let subj_name = subj.map(|s| s.name.as_str()).unwrap_or("عمومی");
                let subj_color = subj.map(|s| s.color.as_str()).unwrap_or("#64748b");
                let done_cls = if task.completed { " done" } else { "" };
                let mark = if task.completed { "✓" } else { "○" };
                let time_part = if task.reminder_enabled {
                    format!(" · {}", to_persian_digits(&task.reminder_time))
                } else {
                    String::new()
                };
                let notes_html = if options.include_notes {
                    task.notes
                        .as_deref()
                        .map(|n| format!("<div class=\"notes\">{}</div>", html_escape(n)))
                        .unwrap_or_default()
                } else {
                    String::new()
                };
                items.push_str(&format!(
                    "<div class=\"task{done_cls}\"><span class=\"mark\">{mark}</span><div><div class=\"title\">{}{}</div>{notes_html}<div class=\"meta\"><span class=\"dot\" style=\"background:{subj_color}\"></span>{}{time_part}</div></div></div>",
                    task.priority.prefix_bangs(),
                    html_escape(&task.title),
                    html_escape(subj_name),
                ));
            }
        }

        cards_html.push_str(&format!(
            "<section class=\"day\"><h2>{} <span>{} · {}</span></h2>{items}</section>",
            day.weekday_fa, day.jalali_short, day.gregorian_short
        ));
    }

    format!(
        r#"<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>برنامه درسی هفتگی — {}</title>
<style>
@page {{ size: A4; margin: 14mm; }}
body {{ font-family: Vazirmatn, Tahoma, sans-serif; color: #18181b; background: #fff; margin: 0; padding: 20px; }}
header {{ border-bottom: 1px solid #e4e4e7; padding-bottom: 12px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: baseline; }}
h1 {{ margin: 0; font-size: 20px; color: #e14e43; }}
.span {{ font-size: 12px; color: #71717a; }}
.grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }}
.day {{ border: 1px solid #e4e4e7; border-radius: 12px; padding: 12px; break-inside: avoid; }}
.day h2 {{ margin: 0 0 8px 0; font-size: 14px; display: flex; justify-content: space-between; border-bottom: 1px solid #f4f4f5; padding-bottom: 6px; }}
.day h2 span {{ font-size: 11px; color: #71717a; font-weight: normal; }}
.task {{ display: flex; gap: 8px; padding: 6px 0; border-bottom: 1px dashed #f4f4f5; font-size: 12px; }}
.task:last-child {{ border-bottom: none; }}
.task.done .title {{ text-decoration: line-through; color: #a1a1aa; }}
.mark {{ font-weight: bold; color: #e14e43; }}
.notes {{ font-size: 10.5px; color: #71717a; margin-top: 2px; }}
.meta {{ font-size: 10.5px; color: #71717a; margin-top: 3px; display: flex; align-items: center; gap: 5px; }}
.dot {{ width: 7px; height: 7px; border-radius: 99px; display: inline-block; }}
.empty {{ font-size: 11px; color: #a1a1aa; margin: 4px 0; }}
</style>
</head>
<body>
<header><h1>برنامه درسی هفتگی</h1><div class="span">{} · {}</div></header>
<main class="grid">{cards_html}</main>
</body>
</html>"#,
        html_escape(&span.jalali_span),
        html_escape(&span.jalali_span),
        html_escape(&span.gregorian_span),
    )
}

pub fn save_pdf_to_downloads(
    week_days: &[WeekDayInfo],
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    options: PrintScheduleOptions,
) -> Result<PathBuf, String> {
    let week_start = week_days
        .first()
        .map(|d| d.date_iso.as_str())
        .unwrap_or("schedule");
    let bytes = render_schedule_pdf_bytes(week_days, tasks, subjects, options);
    let dir = resolve_export_dir()?;
    let target = dir.join(build_schedule_pdf_filename(week_start));
    fs::write(&target, &bytes).map_err(|e| format!("خطا در ذخیره فایل PDF: {e}"))?;
    Ok(target)
}

pub fn save_printable_html_to_downloads(
    week_days: &[WeekDayInfo],
    tasks: &[StudyTask],
    subjects: &[SubjectCategory],
    options: PrintScheduleOptions,
) -> Result<PathBuf, String> {
    let week_start = week_days
        .first()
        .map(|d| d.date_iso.as_str())
        .unwrap_or("schedule");
    let html = render_persian_printable_html(week_days, tasks, subjects, options);
    let dir = resolve_export_dir()?;
    let target = dir.join(build_schedule_html_filename(week_start));
    fs::write(&target, html.as_bytes()).map_err(|e| format!("خطا در ذخیره برگه چاپ: {e}"))?;
    Ok(target)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::jalali::get_week_days;
    use crate::models::default_subjects;
    use crate::tasks::create_initial_seed_tasks;

    #[test]
    fn generates_valid_pdf_header_and_eof() {
        let week = get_week_days(0, "2026-11-16");
        let tasks = create_initial_seed_tasks("2026-11-16");
        let subjects = default_subjects();
        let bytes =
            render_schedule_pdf_bytes(&week, &tasks, &subjects, PrintScheduleOptions::default());

        assert!(bytes.starts_with(b"%PDF-1.4\n"));
        let text = String::from_utf8_lossy(&bytes);
        assert!(text.contains("xref\n"));
        assert!(text.ends_with("%%EOF\n"));
    }

    #[test]
    fn generates_rtl_persian_printable_sheet() {
        let week = get_week_days(0, "2026-11-16");
        let tasks = create_initial_seed_tasks("2026-11-16");
        let subjects = default_subjects();
        let html =
            render_persian_printable_html(&week, &tasks, &subjects, PrintScheduleOptions::default());

        assert!(html.contains(r#"dir="rtl""#));
        assert!(html.contains("برنامه درسی هفتگی"));
        assert!(html.contains("شنبه"));
    }
}
