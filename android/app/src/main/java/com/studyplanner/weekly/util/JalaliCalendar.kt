package com.studyplanner.weekly.util

import java.util.Calendar
import java.util.Locale

data class JalaliDate(val jy: Int, val jm: Int, val jd: Int)

data class GregorianDate(val gy: Int, val gm: Int, val gd: Int)

data class WeekDayInfo(
    val dateISO: String,
    /** 0 = Saturday .. 6 = Friday */
    val dayIndex: Int,
    val persianWeekday: String,
    val persianWeekdayShort: String,
    val jalali: JalaliDate,
    val gregorian: GregorianDate
) {
    val jalaliLong: String get() = JalaliCalendar.formatJalaliLong(jalali)
    val gregorianShort: String get() = JalaliCalendar.formatGregorianShort(gregorian)
}

/**
 * Pure Kotlin dual Jalali & Gregorian calendar engine using the exact same
 * leap-year breaks as the TypeScript and Rust implementations.
 */
object JalaliCalendar {

    private val PERSIAN_DIGITS = charArrayOf('۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹')

    val PERSIAN_MONTHS = listOf(
        "فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور",
        "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"
    )

    val GREGORIAN_MONTHS_SHORT = listOf(
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    )

    val PERSIAN_WEEKDAYS = listOf(
        "شنبه", "یک‌شنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه"
    )

    val PERSIAN_WEEKDAYS_SHORT = listOf(
        "ش", "ی", "د", "س", "چ", "پ", "ج"
    )

    private val BREAKS = intArrayOf(
        -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
        1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
    )

    fun toPersianDigits(input: Any): String {
        val raw = input.toString()
        val sb = StringBuilder(raw.length)
        for (ch in raw) {
            if (ch in '0'..'9') {
                sb.append(PERSIAN_DIGITS[ch - '0'])
            } else {
                sb.append(ch)
            }
        }
        return sb.toString()
    }

    private fun div(a: Int, b: Int): Int = a / b

    private fun mod(a: Int, b: Int): Int = a - (a / b) * b

    private data class JalCalResult(val leap: Int, val gy: Int, val march: Int)

    private fun jalCal(jy: Int): JalCalResult {
        val bl = BREAKS.size
        val gy = jy + 621
        var leapJ = -14
        var jp = BREAKS[0]
        var jump = 0

        require(jy >= jp && jy < BREAKS[bl - 1]) { "Invalid Jalali year: $jy" }

        for (i in 1 until bl) {
            val jm = BREAKS[i]
            jump = jm - jp
            if (jy < jm) break
            leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4)
            jp = jm
        }

        var n = jy - jp
        leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4)
        if (mod(jump, 33) == 4 && jump - n == 4) {
            leapJ += 1
        }

        val leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150
        val march = 20 + leapJ - leapG

        if (jump - n < 6) {
            n = n - jump + div(jump + 4, 33) * 33
        }
        var leap = mod(mod(n + 1, 33) - 1, 4)
        if (leap == -1) leap = 4

        return JalCalResult(leap, gy, march)
    }

    fun isLeapYear(jy: Int): Boolean = jalCal(jy).leap == 0

    fun monthLength(jy: Int, jm: Int): Int = when {
        jm <= 6 -> 31
        jm <= 11 -> 30
        else -> if (isLeapYear(jy)) 30 else 29
    }

    private fun g2d(gy: Int, gm: Int, gd: Int): Int {
        var d = div((gy + div(gm - 8, 6) + 100100) * 1461, 4) +
            div(153 * mod(gm + 9, 12) + 2, 5) +
            gd - 34840408
        d = d - div(div(gy + 100100 + div(gm - 8, 6), 100) * 3, 4) + 752
        return d
    }

    private fun d2g(jdn: Int): GregorianDate {
        var j = 4 * jdn + 139361631
        j = j + div(div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908
        val i = div(mod(j, 1461), 4) * 5 + 308
        val gd = div(mod(i, 153), 5) + 1
        val gm = mod(div(i, 153), 12) + 1
        val gy = div(j, 1461) - 100100 + div(8 - gm, 6)
        return GregorianDate(gy, gm, gd)
    }

    private fun j2d(jy: Int, jm: Int, jd: Int): Int {
        val r = jalCal(jy)
        return g2d(r.gy, 3, r.march) + (jm - 1) * 31 - div(jm, 7) * (jm - 7) + jd - 1
    }

    private fun d2j(jdn: Int): JalaliDate {
        val gy = d2g(jdn).gy
        var jy = gy - 621
        val r = jalCal(jy)
        val jdn1f = g2d(gy, 3, r.march)
        var k = jdn - jdn1f

        if (k >= 0) {
            if (k <= 185) {
                val jm = 1 + div(k, 31)
                val jd = mod(k, 31) + 1
                return JalaliDate(jy, jm, jd)
            }
            k -= 186
        } else {
            jy -= 1
            k += 179
            if (r.leap == 1) k += 1
        }

        val jm = 7 + div(k, 30)
        val jd = mod(k, 30) + 1
        return JalaliDate(jy, jm, jd)
    }

    fun toJalali(gy: Int, gm: Int, gd: Int): JalaliDate = d2j(g2d(gy, gm, gd))

    fun toGregorian(jy: Int, jm: Int, jd: Int): GregorianDate = d2g(j2d(jy, jm, jd))

    fun formatISO(g: GregorianDate): String =
        String.format(Locale.US, "%04d-%02d-%02d", g.gy, g.gm, g.gd)

    fun parseISO(iso: String): GregorianDate {
        val parts = iso.trim().split("-")
        require(parts.size == 3) { "Invalid ISO date: $iso" }
        return GregorianDate(parts[0].toInt(), parts[1].toInt(), parts[2].toInt())
    }

    fun isValidISO(iso: String): Boolean {
        if (!Regex("^\\d{4}-\\d{2}-\\d{2}$").matches(iso)) return false
        return try {
            val g = parseISO(iso)
            if (g.gm !in 1..12 || g.gd !in 1..31) return false
            val cal = Calendar.getInstance().apply {
                isLenient = false
                set(Calendar.YEAR, g.gy)
                set(Calendar.MONTH, g.gm - 1)
                set(Calendar.DAY_OF_MONTH, g.gd)
            }
            cal.get(Calendar.YEAR) == g.gy &&
                cal.get(Calendar.MONTH) == g.gm - 1 &&
                cal.get(Calendar.DAY_OF_MONTH) == g.gd
        } catch (_: Throwable) {
            false
        }
    }

    fun todayISO(calendar: Calendar = Calendar.getInstance()): String = formatISO(
        GregorianDate(
            calendar.get(Calendar.YEAR),
            calendar.get(Calendar.MONTH) + 1,
            calendar.get(Calendar.DAY_OF_MONTH)
        )
    )

    fun addDaysISO(iso: String, deltaDays: Int): String {
        val g = parseISO(iso)
        val cal = Calendar.getInstance().apply {
            set(g.gy, g.gm - 1, g.gd, 12, 0, 0)
            add(Calendar.DAY_OF_MONTH, deltaDays)
        }
        return formatISO(
            GregorianDate(
                cal.get(Calendar.YEAR),
                cal.get(Calendar.MONTH) + 1,
                cal.get(Calendar.DAY_OF_MONTH)
            )
        )
    }

    /** Returns 0 = Saturday .. 6 = Friday */
    fun getPersianWeekdayIndex(iso: String): Int {
        val g = parseISO(iso)
        val cal = Calendar.getInstance().apply { set(g.gy, g.gm - 1, g.gd, 12, 0, 0) }
        // Calendar.DAY_OF_WEEK: SUNDAY=1 .. SATURDAY=7
        return when (cal.get(Calendar.DAY_OF_WEEK)) {
            Calendar.SATURDAY -> 0
            Calendar.SUNDAY -> 1
            Calendar.MONDAY -> 2
            Calendar.TUESDAY -> 3
            Calendar.WEDNESDAY -> 4
            Calendar.THURSDAY -> 5
            Calendar.FRIDAY -> 6
            else -> 0
        }
    }

    fun getSaturdayOfWeekISO(iso: String): String {
        val idx = getPersianWeekdayIndex(iso)
        return addDaysISO(iso, -idx)
    }

    fun isoToJalali(iso: String): JalaliDate {
        val g = parseISO(iso)
        return toJalali(g.gy, g.gm, g.gd)
    }

    fun jalaliToISO(jy: Int, jm: Int, jd: Int): String = formatISO(toGregorian(jy, jm, jd))

    fun getWeekDays(weekOffset: Int = 0, anchorISO: String = todayISO()): List<WeekDayInfo> {
        val currentSat = getSaturdayOfWeekISO(anchorISO)
        val targetSat = addDaysISO(currentSat, weekOffset * 7)
        return (0..6).map { dayIndex ->
            val dateISO = addDaysISO(targetSat, dayIndex)
            val gregorian = parseISO(dateISO)
            val jalali = toJalali(gregorian.gy, gregorian.gm, gregorian.gd)
            WeekDayInfo(
                dateISO = dateISO,
                dayIndex = dayIndex,
                persianWeekday = PERSIAN_WEEKDAYS[dayIndex],
                persianWeekdayShort = PERSIAN_WEEKDAYS_SHORT[dayIndex],
                jalali = jalali,
                gregorian = gregorian
            )
        }
    }

    fun formatJalaliLong(j: JalaliDate): String {
        val month = PERSIAN_MONTHS.getOrElse(j.jm - 1) { "" }
        return "${toPersianDigits(j.jd)} $month ${toPersianDigits(j.jy)}"
    }

    fun formatGregorianShort(g: GregorianDate): String {
        val month = GREGORIAN_MONTHS_SHORT.getOrElse(g.gm - 1) { "" }
        return "${g.gd} $month ${g.gy}"
    }

    fun formatWeekSpan(days: List<WeekDayInfo>): Pair<String, String> {
        if (days.isEmpty()) return "" to ""
        val first = days.first()
        val last = days.last()

        val sameJalali = first.jalali.jm == last.jalali.jm && first.jalali.jy == last.jalali.jy
        val jalaliSpan = if (sameJalali) {
            "${toPersianDigits(first.jalali.jd)} تا ${toPersianDigits(last.jalali.jd)} ${PERSIAN_MONTHS[last.jalali.jm - 1]} ${toPersianDigits(last.jalali.jy)}"
        } else {
            "${toPersianDigits(first.jalali.jd)} ${PERSIAN_MONTHS[first.jalali.jm - 1]} تا ${toPersianDigits(last.jalali.jd)} ${PERSIAN_MONTHS[last.jalali.jm - 1]} ${toPersianDigits(last.jalali.jy)}"
        }

        val sameGregorian = first.gregorian.gm == last.gregorian.gm && first.gregorian.gy == last.gregorian.gy
        val gregorianSpan = if (sameGregorian) {
            "${first.gregorian.gd}–${last.gregorian.gd} ${GREGORIAN_MONTHS_SHORT[last.gregorian.gm - 1]} ${last.gregorian.gy}"
        } else {
            "${first.gregorian.gd} ${GREGORIAN_MONTHS_SHORT[first.gregorian.gm - 1]} – ${last.gregorian.gd} ${GREGORIAN_MONTHS_SHORT[last.gregorian.gm - 1]} ${last.gregorian.gy}"
        }

        return jalaliSpan to gregorianSpan
    }
}
