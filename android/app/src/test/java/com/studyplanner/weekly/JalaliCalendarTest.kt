package com.studyplanner.weekly

import com.studyplanner.weekly.util.GregorianDate
import com.studyplanner.weekly.util.JalaliCalendar
import com.studyplanner.weekly.util.JalaliDate
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class JalaliCalendarTest {

    @Test
    fun convertsKnownGregorianAndJalaliDatesAccurately() {
        assertEquals(JalaliDate(1405, 8, 28), JalaliCalendar.toJalali(2026, 11, 19))
        assertEquals(GregorianDate(2026, 11, 19), JalaliCalendar.toGregorian(1405, 8, 28))
        assertEquals(JalaliDate(1403, 12, 30), JalaliCalendar.toJalali(2025, 3, 20))
        assertEquals(GregorianDate(2025, 3, 20), JalaliCalendar.toGregorian(1403, 12, 30))
    }

    @Test
    fun detectsLeapYearsAndMonthLengths() {
        assertTrue(JalaliCalendar.isLeapYear(1403))
        assertFalse(JalaliCalendar.isLeapYear(1404))
        assertEquals(30, JalaliCalendar.monthLength(1403, 12))
        assertEquals(29, JalaliCalendar.monthLength(1404, 12))
        assertEquals(31, JalaliCalendar.monthLength(1405, 1))
        assertEquals(30, JalaliCalendar.monthLength(1405, 8))
    }

    @Test
    fun buildsIranianSaturdayToFridayWeek() {
        val days = JalaliCalendar.getWeekDays(weekOffset = 0, anchorISO = "2026-11-19")
        assertEquals(7, days.size)
        assertEquals("2026-11-14", days.first().dateISO)
        assertEquals("شنبه", days.first().persianWeekday)
        assertEquals("2026-11-20", days.last().dateISO)
        assertEquals("جمعه", days.last().persianWeekday)
    }
}
