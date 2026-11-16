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
    g2d(gy, 3, march) + ((jm as i32) - 1) * 31 - ((jm as i32) / 7) * ((jm as i32) - 7) + (jd as i32) - 1
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn converts_known_dates_accurately() {
        assert_eq!(
            gregorian_to_jalali(2026, 3, 21),
            JalaliDate { jy: 1405, jm: 1, jd: 1 }
        );
        assert_eq!(
            gregorian_to_jalali(2026, 11, 16),
            JalaliDate { jy: 1405, jm: 8, jd: 25 }
        );
        assert_eq!(
            jalali_to_gregorian(1405, 1, 1),
            GregorianDate { gy: 2026, gm: 3, gd: 21 }
        );
    }

    #[test]
    fn detects_jalali_leap_years() {
        assert!(is_jalali_leap_year(1403));
        assert!(!is_jalali_leap_year(1404));
        assert!(!is_jalali_leap_year(1405));
    }
}
