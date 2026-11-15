import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addDaysISO,
  formatWeekSpanSummary,
  getSaturdayOfWeekISO,
  getWeekDays,
  isJalaliLeapYear,
  isValidJalaliDate,
  isoToJalali,
  jalaliMonthLength,
  jalaliToISO,
  toGregorian,
  toJalali,
} from './jalali';

test('Gregorian to Jalali converts known reference dates accurately', () => {
  // 2026-11-15 -> 1405-08-24 (24 Aban 1405)
  assert.deepEqual(toJalali(2026, 11, 15), { jy: 1405, jm: 8, jd: 24 });

  // 2024-03-20 -> 1403-01-01 (1 Farvardin 1403, Nowruz)
  assert.deepEqual(toJalali(2024, 3, 20), { jy: 1403, jm: 1, jd: 1 });

  // 2025-03-20 -> 1403-12-30 (leap year Esfand 30!)
  assert.deepEqual(toJalali(2025, 3, 20), { jy: 1403, jm: 12, jd: 30 });

  // 2025-03-21 -> 1404-01-01 (1 Farvardin 1404)
  assert.deepEqual(toJalali(2025, 3, 21), { jy: 1404, jm: 1, jd: 1 });
});

test('Jalali to Gregorian round-trips accurately across leap and non-leap years', () => {
  assert.deepEqual(toGregorian(1405, 8, 24), { gy: 2026, gm: 11, gd: 15 });
  assert.deepEqual(toGregorian(1403, 12, 30), { gy: 2025, gm: 3, gd: 20 });

  const startISO = '2024-01-01';
  for (let i = 0; i < 800; i += 17) {
    const iso = addDaysISO(startISO, i);
    const j = isoToJalali(iso);
    const roundTrip = jalaliToISO(j.jy, j.jm, j.jd);
    assert.equal(roundTrip, iso);
  }
});

test('Jalali leap year and month lengths', () => {
  assert.equal(isJalaliLeapYear(1403), true);
  assert.equal(isJalaliLeapYear(1404), false);
  assert.equal(jalaliMonthLength(1403, 12), 30);
  assert.equal(jalaliMonthLength(1404, 12), 29);
  assert.equal(isValidJalaliDate(1403, 12, 30), true);
  assert.equal(isValidJalaliDate(1404, 12, 30), false);
});

test('Iranian week starts on Saturday and spans 7 consecutive days', () => {
  // 2026-11-15 is Sunday; Saturday of that week is 2026-11-14
  assert.equal(getSaturdayOfWeekISO('2026-11-15'), '2026-11-14');

  const days = getWeekDays(0, '2026-11-15');
  assert.equal(days.length, 7);
  assert.equal(days[0].persianWeekday, 'شنبه');
  assert.equal(days[0].dateISO, '2026-11-14');
  assert.equal(days[6].persianWeekday, 'جمعه');
  assert.equal(days[6].dateISO, '2026-11-20');

  const nextWeek = getWeekDays(1, '2026-11-15');
  assert.equal(nextWeek[0].dateISO, '2026-11-21');

  const span = formatWeekSpanSummary(days);
  assert.ok(span.jalaliSpan.includes('آبان'));
  assert.ok(span.gregorianSpan.includes('Nov 2026'));
});
