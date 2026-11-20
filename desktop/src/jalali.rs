use chrono::{Datelike, Duration, Local, NaiveDate, Weekday};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct JalaliDate {
    pub jy: i32,
    pub jm: u32,
    pub jd: u32,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub struct GregorianDate {
    pub gy: i32,
    pub gm: u32,
    pub gd: u32,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WeekDayInfo {
    pub date_iso: String,
    pub weekday_index: usize,
    pub weekday_fa: &'static str,
    pub weekday_en: &'static str,
    pub jalali: JalaliDate,
    pub jalali_short: String,
    pub jalali_long: String,
    pub gregorian_short: String,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WeekSpanSummary {
    pub jalali_span: String,
    pub gregorian_span: String,
}

pub const PERSIAN_MONTHS: [&str; 12] = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
];

pub const GREGORIAN_MONTHS_SHORT: [&str; 12] = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

pub const WEEKDAY_NAMES_FA: [&str; 7] = [
    "شنبه",
    "یک‌شنبه",
    "دوشنبه",
    "سه‌شنبه",
    "چهارشنبه",
    "پنج‌شنبه",
    "جمعه",
];

pub const WEEKDAY_NAMES_EN: [&str; 7] = ["Sat", "Sun", "Mon", "Tue", "Wed", "Thu", "Fri"];

pub fn to_persian_digits(input: &str) -> String {
    input
        .chars()
        .map(|c| match c {
            '0' => '۰',
            '1' => '۱',
            '2' => '۲',
            '3' => '۳',
            '4' => '۴',
            '5' => '۵',
            '6' => '۶',
            '7' => '۷',
            '8' => '۸',
            '9' => '۹',
            other => other,
        })
        .collect()
}

pub fn format_persian_usize(value: usize) -> String {
    to_persian_digits(&value.to_string())
}

pub fn format_persian_u32(value: u32) -> String {
    to_persian_digits(&value.to_string())
}

pub fn is_jalali_leap_year(jy: i32) -> bool {
    let breaks: [i32; 20] = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
        2394, 2456, 3178,
    ];
    let mut jp = breaks[0];
    let mut jump = 0;

    for &jm in breaks.iter().skip(1) {
        jump = jm - jp;
        if jy < jm {
            break;
        }
        jp = jm;
    }

    let mut n = jy - jp;
    if jump - n < 6 {
        n = n - jump + ((jump + 4) / 33) * 33;
    }
    let mut leap = ((n + 1).rem_euclid(33) - 1) % 4;
    if leap == -1 {
        leap = 4;
    }
    leap == 0
}

fn jal_cal(jy: i32) -> (i32, i32, i32) {
    let breaks: [i32; 20] = [
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324,
        2394, 2456, 3178,
    ];
    let gy = jy + 621;
    let mut leap_j = -14;
    let mut jp = breaks[0];
    let mut jump = 0;

    for &jm in breaks.iter().skip(1) {
        jump = jm - jp;
        if jy < jm {
            break;
        }
        leap_j += (jump / 33) * 8 + (jump % 33) / 4;
        jp = jm;
    }

    let mut n = jy - jp;
    leap_j += (n / 33) * 8 + ((n % 33) + 3) / 4;
    if (jump % 33) == 4 && jump - n == 4 {
        leap_j += 1;
    }

    let leap_g = gy / 4 - ((gy / 100 + 1) * 3) / 4 - 150;
    let march = 20 + leap_j - leap_g;

    if jump - n < 6 {
        n = n - jump + ((jump + 4) / 33) * 33;
    }
    let mut leap = ((n + 1).rem_euclid(33) - 1) % 4;
    if leap == -1 {
        leap = 4;
    }

    (leap, gy, march)
}

fn g2d(gy: i32, gm: i32, gd: i32) -> i32 {
    let mut d = ((gy + (gm - 8) / 6 + 100_100) * 1461) / 4
        + (153 * ((gm + 9) % 12) + 2) / 5
        + gd
        - 34_840_408;
    d = d - (((gy + 100_100 + (gm - 8) / 6) / 100) * 3) / 4 + 752;
    d
}

fn d2g(jdn: i32) -> GregorianDate {
    let mut j = 4 * jdn + 139_361_631;
    j = j + ((((4 * jdn + 183_187_720) / 146_097) * 3) / 4) * 4 - 3908;
    let i = ((j % 1461) / 4) * 5 + 308;
    let gd = ((i % 153) / 5 + 1) as u32;
    let gm = (((i / 153) % 12) + 1) as u32;
    let gy = j / 1461 - 100_100 + (8 - gm as i32) / 6;
    GregorianDate { gy, gm, gd }
}

fn j2d(jy: i32, jm: u32, jd: u32) -> i32 {
    let (_, gy, march) = jal_cal(jy);
    g2d(gy, 3, march) + ((jm as i32) - 1) * 31 - ((jm as i32) / 7) * ((jm as i32) - 7)
        + (jd as i32)
        - 1
}

pub fn gregorian_to_jalali(gy: i32, gm: u32, gd: u32) -> JalaliDate {
    let jdn = g2d(gy, gm as i32, gd as i32);
    let g = d2g(jdn);
    let mut jy = g.gy - 621;
    let (leap, _, march) = jal_cal(jy);
    let jdn1f = g2d(g.gy, 3, march);
    let mut k = jdn - jdn1f;

    let (jm, jd) = if k >= 0 {
        if k <= 185 {
            ((1 + k / 31) as u32, ((k % 31) + 1) as u32)
        } else {
            k -= 186;
            ((7 + k / 30) as u32, ((k % 30) + 1) as u32)
        }
    } else {
        jy -= 1;
        k += 179;
        if leap == 1 {
            k += 1;
        }
        ((7 + k / 30) as u32, ((k % 30) + 1) as u32)
    };

    JalaliDate { jy, jm, jd }
}

pub fn jalali_to_gregorian(jy: i32, jm: u32, jd: u32) -> GregorianDate {
    d2g(j2d(jy, jm, jd))
}

pub fn get_today_iso() -> String {
    Local::now().format("%Y-%m-%d").to_string()
}

pub fn parse_iso_date(date_iso: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(date_iso.trim(), "%Y-%m-%d").ok()
}

pub fn format_iso_date(date: NaiveDate) -> String {
    date.format("%Y-%m-%d").to_string()
}

pub fn iso_to_jalali(date_iso: &str) -> Option<JalaliDate> {
    let d = parse_iso_date(date_iso)?;
    Some(gregorian_to_jalali(d.year(), d.month(), d.day()))
}

pub fn format_jalali_short(j: JalaliDate) -> String {
    let month = PERSIAN_MONTHS
        .get((j.jm as usize).saturating_sub(1))
        .copied()
        .unwrap_or("");
    format!("{} {}", to_persian_digits(&j.jd.to_string()), month)
}

pub fn format_jalali_long(j: JalaliDate) -> String {
    let month = PERSIAN_MONTHS
        .get((j.jm as usize).saturating_sub(1))
        .copied()
        .unwrap_or("");
    format!(
        "{} {} {}",
        to_persian_digits(&j.jd.to_string()),
        month,
        to_persian_digits(&j.jy.to_string())
    )
}

pub fn format_gregorian_short(date: NaiveDate) -> String {
    let month = GREGORIAN_MONTHS_SHORT
        .get((date.month() as usize).saturating_sub(1))
        .copied()
        .unwrap_or("");
    format!("{} {}", date.day(), month)
}

pub fn iranian_weekday_index(weekday: Weekday) -> usize {
    match weekday {
        Weekday::Sat => 0,
        Weekday::Sun => 1,
        Weekday::Mon => 2,
        Weekday::Tue => 3,
        Weekday::Wed => 4,
        Weekday::Thu => 5,
        Weekday::Fri => 6,
    }
}

pub fn get_week_start_date(anchor_date: NaiveDate) -> NaiveDate {
    let offset = iranian_weekday_index(anchor_date.weekday()) as i64;
    anchor_date - Duration::days(offset)
}

pub fn get_week_days(week_offset: i32, today_iso: &str) -> Vec<WeekDayInfo> {
    let anchor = parse_iso_date(today_iso).unwrap_or_else(|| Local::now().date_naive());
    let saturday = get_week_start_date(anchor) + Duration::weeks(i64::from(week_offset));

    (0..7)
        .map(|idx| {
            let date = saturday + Duration::days(idx as i64);
            let jalali = gregorian_to_jalali(date.year(), date.month(), date.day());
            WeekDayInfo {
                date_iso: format_iso_date(date),
                weekday_index: idx,
                weekday_fa: WEEKDAY_NAMES_FA[idx],
                weekday_en: WEEKDAY_NAMES_EN[idx],
                jalali,
                jalali_short: format_jalali_short(jalali),
                jalali_long: format_jalali_long(jalali),
                gregorian_short: format_gregorian_short(date),
            }
        })
        .collect()
}

pub fn format_week_span_summary(days: &[WeekDayInfo]) -> WeekSpanSummary {
    if days.is_empty() {
        return WeekSpanSummary {
            jalali_span: String::new(),
            gregorian_span: String::new(),
        };
    }

    let first = &days[0];
    let last = &days[days.len() - 1];

    let jalali_span = if first.jalali.jy == last.jalali.jy && first.jalali.jm == last.jalali.jm {
        let month = PERSIAN_MONTHS
            .get((first.jalali.jm as usize).saturating_sub(1))
            .copied()
            .unwrap_or("");
        format!(
            "{} تا {} {} {}",
            to_persian_digits(&first.jalali.jd.to_string()),
            to_persian_digits(&last.jalali.jd.to_string()),
            month,
            to_persian_digits(&first.jalali.jy.to_string())
        )
    } else {
        format!("{} تا {}", first.jalali_long, last.jalali_long)
    };

    let first_date = parse_iso_date(&first.date_iso);
    let last_date = parse_iso_date(&last.date_iso);
    let gregorian_span = match (first_date, last_date) {
        (Some(f), Some(l)) if f.year() == l.year() && f.month() == l.month() => {
            let month = GREGORIAN_MONTHS_SHORT
                .get((f.month() as usize).saturating_sub(1))
                .copied()
                .unwrap_or("");
            format!("{}–{} {} {}", f.day(), l.day(), month, f.year())
        }
        (Some(f), Some(l)) => {
            format!(
                "{} – {} {}",
                format_gregorian_short(f),
                format_gregorian_short(l),
                l.year()
            )
        }
        _ => String::new(),
    };

    WeekSpanSummary {
        jalali_span,
        gregorian_span,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_known_dates_accurately() {
        assert_eq!(
            gregorian_to_jalali(2026, 3, 21),
            JalaliDate {
                jy: 1405,
                jm: 1,
                jd: 1
            }
        );
        assert_eq!(
            gregorian_to_jalali(2026, 11, 16),
            JalaliDate {
                jy: 1405,
                jm: 8,
                jd: 25
            }
        );
        assert_eq!(
            jalali_to_gregorian(1405, 1, 1),
            GregorianDate {
                gy: 2026,
                gm: 3,
                gd: 21
            }
        );
    }

    #[test]
    fn detects_jalali_leap_years() {
        assert!(is_jalali_leap_year(1403));
        assert!(!is_jalali_leap_year(1404));
        assert!(!is_jalali_leap_year(1405));
    }

    #[test]
    fn iranian_week_starts_on_saturday_and_spans_seven_days() {
        // 2026-11-16 is Monday -> week starts Saturday 2026-11-14
        let days = get_week_days(0, "2026-11-16");
        assert_eq!(days.len(), 7);
        assert_eq!(days[0].date_iso, "2026-11-14");
        assert_eq!(days[0].weekday_fa, "شنبه");
        assert_eq!(days[6].date_iso, "2026-11-20");
        assert_eq!(days[6].weekday_fa, "جمعه");

        let span = format_week_span_summary(&days);
        assert_eq!(span.gregorian_span, "14–20 Nov 2026");
        assert!(span.jalali_span.contains("آبان"));
    }

    #[test]
    fn converts_digits_to_persian() {
        assert_eq!(to_persian_digits("1405/08/25 18:30"), "۱۴۰۵/۰۸/۲۵ ۱۸:۳۰");
    }
}
