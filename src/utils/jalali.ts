export interface JalaliDate {
  jy: number;
  jm: number;
  jd: number;
}

export interface GregorianDate {
  gy: number;
  gm: number;
  gd: number;
}

export interface WeekDayInfo {
  dateISO: string;
  dayIndex: number; // 0 = Saturday .. 6 = Friday
  persianWeekday: string;
  englishWeekday: string;
  jalali: JalaliDate;
  jalaliFormatted: string;
  jalaliNumeric: string;
  gregorian: GregorianDate;
  gregorianFormattedEn: string;
  gregorianFormattedFa: string;
}

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export const PERSIAN_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

export const GREGORIAN_MONTH_NAMES_FA = [
  'ژانویه',
  'فوریه',
  'مارس',
  'آوریل',
  'مه',
  'ژوئن',
  'ژوئیه',
  'اوت',
  'سپتامبر',
  'اکتبر',
  'نوامبر',
  'دسامبر',
];

export const GREGORIAN_MONTH_NAMES_EN_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export const PERSIAN_WEEKDAYS = [
  'شنبه',
  'یک‌شنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنج‌شنبه',
  'جمعه',
];

export const ENGLISH_WEEKDAYS_SHORT = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

export function toPersianDigits(input: string | number): string {
  return String(input).replace(/\d/g, (digit) => PERSIAN_DIGITS[Number(digit)] ?? digit);
}

function div(a: number, b: number): number {
  return Math.trunc(a / b);
}

function mod(a: number, b: number): number {
  return a - Math.trunc(a / b) * b;
}

const BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178,
];

function jalCal(jy: number): { leap: number; gy: number; march: number } {
  const bl = BREAKS.length;
  const gy = jy + 621;
  let leapJ = -14;
  let jp = BREAKS[0];
  let jump = 0;

  if (jy < jp || jy >= BREAKS[bl - 1]) {
    throw new Error(`Invalid Jalali year: ${jy}`);
  }

  for (let i = 1; i < bl; i += 1) {
    const jm = BREAKS[i];
    jump = jm - jp;
    if (jy < jm) break;
    leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
    jp = jm;
  }

  let n = jy - jp;
  leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
  if (mod(jump, 33) === 4 && jump - n === 4) {
    leapJ += 1;
  }

  const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
  const march = 20 + leapJ - leapG;

  if (jump - n < 6) {
    n = n - jump + div(jump + 4, 33) * 33;
  }
  let leap = mod(mod(n + 1, 33) - 1, 4);
  if (leap === -1) {
    leap = 4;
  }

  return { leap, gy, march };
}

export function isJalaliLeapYear(jy: number): boolean {
  return jalCal(jy).leap === 0;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function isValidJalaliDate(jy: number, jm: number, jd: number): boolean {
  if (jy < 1300 || jy > 1500) return false;
  if (jm < 1 || jm > 12) return false;
  if (jd < 1 || jd > jalaliMonthLength(jy, jm)) return false;
  return true;
}

function g2d(gy: number, gm: number, gd: number): number {
  let d =
    div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
    div(153 * mod(gm + 9, 12) + 2, 5) +
    gd -
    34840408;
  d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752;
  return d;
}

function d2g(jdn: number): GregorianDate {
  let j = 4 * jdn + 139361631;
  j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
  const i = div(mod(j, 1461), 4) * 5 + 308;
  const gd = div(mod(i, 153), 5) + 1;
  const gm = mod(div(i, 153), 12) + 1;
  const gy = div(j, 1461) - 100100 + div(8 - gm, 6);
  return { gy, gm, gd };
}

function j2d(jy: number, jm: number, jd: number): number {
  const r = jalCal(jy);
  return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1;
}

function d2j(jdn: number): JalaliDate {
  const gy = d2g(jdn).gy;
  let jy = gy - 621;
  const r = jalCal(jy);
  const jdn1f = g2d(gy, 3, r.march);
  let k = jdn - jdn1f;
  let jm: number;
  let jd: number;

  if (k >= 0) {
    if (k <= 185) {
      jm = 1 + div(k, 31);
      jd = mod(k, 31) + 1;
      return { jy, jm, jd };
    }
    k -= 186;
  } else {
    jy -= 1;
    k += 179;
    if (r.leap === 1) k += 1;
  }

  jm = 7 + div(k, 30);
  jd = mod(k, 30) + 1;
  return { jy, jm, jd };
}

export function toJalali(gy: number, gm: number, gd: number): JalaliDate {
  return d2j(g2d(gy, gm, gd));
}

export function toGregorian(jy: number, jm: number, jd: number): GregorianDate {
  return d2g(j2d(jy, jm, jd));
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function formatGregorianISO({ gy, gm, gd }: GregorianDate): string {
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

export function parseDateISO(iso: string): GregorianDate {
  const [y, m, d] = iso.split('-').map(Number);
  return { gy: y, gm: m, gd: d };
}

export function getTodayISO(now: Date = new Date()): string {
  return formatGregorianISO({
    gy: now.getFullYear(),
    gm: now.getMonth() + 1,
    gd: now.getDate(),
  });
}

export function addDaysISO(iso: string, deltaDays: number): string {
  const { gy, gm, gd } = parseDateISO(iso);
  const dt = new Date(gy, gm - 1, gd + deltaDays);
  return formatGregorianISO({
    gy: dt.getFullYear(),
    gm: dt.getMonth() + 1,
    gd: dt.getDate(),
  });
}

export function getPersianWeekdayIndex(iso: string): number {
  const { gy, gm, gd } = parseDateISO(iso);
  const jsDay = new Date(gy, gm - 1, gd).getDay(); // 0=Sun .. 6=Sat
  return (jsDay + 1) % 7; // 0=Sat .. 6=Fri
}

export function getSaturdayOfWeekISO(iso: string): string {
  const idx = getPersianWeekdayIndex(iso);
  return addDaysISO(iso, -idx);
}

export function jalaliToISO(jy: number, jm: number, jd: number): string {
  const g = toGregorian(jy, jm, jd);
  return formatGregorianISO(g);
}

export function isoToJalali(iso: string): JalaliDate {
  const { gy, gm, gd } = parseDateISO(iso);
  return toJalali(gy, gm, gd);
}

export function formatJalaliLong(j: JalaliDate): string {
  const monthName = PERSIAN_MONTH_NAMES[j.jm - 1] ?? '';
  return `${toPersianDigits(j.jd)} ${monthName} ${toPersianDigits(j.jy)}`;
}

export function formatJalaliNumeric(j: JalaliDate): string {
  return `${toPersianDigits(j.jy)}/${toPersianDigits(pad2(j.jm))}/${toPersianDigits(pad2(j.jd))}`;
}

export function formatGregorianEnShort(g: GregorianDate): string {
  const monthName = GREGORIAN_MONTH_NAMES_EN_SHORT[g.gm - 1] ?? '';
  return `${g.gd} ${monthName} ${g.gy}`;
}

export function formatGregorianFaLong(g: GregorianDate): string {
  const monthName = GREGORIAN_MONTH_NAMES_FA[g.gm - 1] ?? '';
  return `${toPersianDigits(g.gd)} ${monthName} ${toPersianDigits(g.gy)}`;
}

export function getWeekDays(weekOffset: number = 0, anchorISO: string = getTodayISO()): WeekDayInfo[] {
  const currentWeekSaturday = getSaturdayOfWeekISO(anchorISO);
  const targetSaturday = addDaysISO(currentWeekSaturday, weekOffset * 7);

  return Array.from({ length: 7 }, (_, dayIndex) => {
    const dateISO = addDaysISO(targetSaturday, dayIndex);
    const gregorian = parseDateISO(dateISO);
    const jalali = toJalali(gregorian.gy, gregorian.gm, gregorian.gd);

    return {
      dateISO,
      dayIndex,
      persianWeekday: PERSIAN_WEEKDAYS[dayIndex],
      englishWeekday: ENGLISH_WEEKDAYS_SHORT[dayIndex],
      jalali,
      jalaliFormatted: formatJalaliLong(jalali),
      jalaliNumeric: formatJalaliNumeric(jalali),
      gregorian,
      gregorianFormattedEn: formatGregorianEnShort(gregorian),
      gregorianFormattedFa: formatGregorianFaLong(gregorian),
    };
  });
}

export function formatWeekSpanSummary(days: WeekDayInfo[]): {
  jalaliSpan: string;
  gregorianSpan: string;
} {
  if (days.length === 0) {
    return { jalaliSpan: '', gregorianSpan: '' };
  }
  const first = days[0];
  const last = days[days.length - 1];

  const sameJalaliMonth = first.jalali.jm === last.jalali.jm && first.jalali.jy === last.jalali.jy;
  const jalaliSpan = sameJalaliMonth
    ? `${toPersianDigits(first.jalali.jd)} تا ${toPersianDigits(last.jalali.jd)} ${PERSIAN_MONTH_NAMES[last.jalali.jm - 1]} ${toPersianDigits(last.jalali.jy)}`
    : `${toPersianDigits(first.jalali.jd)} ${PERSIAN_MONTH_NAMES[first.jalali.jm - 1]} تا ${toPersianDigits(last.jalali.jd)} ${PERSIAN_MONTH_NAMES[last.jalali.jm - 1]} ${toPersianDigits(last.jalali.jy)}`;

  const sameGregorianMonth = first.gregorian.gm === last.gregorian.gm && first.gregorian.gy === last.gregorian.gy;
  const gregorianSpan = sameGregorianMonth
    ? `${first.gregorian.gd}–${last.gregorian.gd} ${GREGORIAN_MONTH_NAMES_EN_SHORT[last.gregorian.gm - 1]} ${last.gregorian.gy}`
    : `${first.gregorian.gd} ${GREGORIAN_MONTH_NAMES_EN_SHORT[first.gregorian.gm - 1]} – ${last.gregorian.gd} ${GREGORIAN_MONTH_NAMES_EN_SHORT[last.gregorian.gm - 1]} ${last.gregorian.gy}`;

  return { jalaliSpan, gregorianSpan };
}
