package com.studyplanner.weekly.data

import android.content.Context
import com.studyplanner.weekly.util.JalaliCalendar
import org.json.JSONArray
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

class StudyRepository(context: Context) {

    private val prefs = context.applicationContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    fun loadSubjects(): List<SubjectCategory> {
        val raw = prefs.getString(KEY_SUBJECTS, null) ?: return DefaultStudySeed.defaultSubjects().also {
            saveSubjects(it)
        }
        return try {
            val arr = JSONArray(raw)
            val list = mutableListOf<SubjectCategory>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                list.add(
                    SubjectCategory(
                        id = obj.getString("id"),
                        name = obj.getString("name"),
                        colorHex = obj.getString("colorHex")
                    )
                )
            }
            if (list.isEmpty()) DefaultStudySeed.defaultSubjects() else list
        } catch (_: Throwable) {
            DefaultStudySeed.defaultSubjects()
        }
    }

    fun saveSubjects(subjects: List<SubjectCategory>) {
        val arr = JSONArray()
        for (s in subjects) {
            arr.put(
                JSONObject()
                    .put("id", s.id)
                    .put("name", s.name)
                    .put("colorHex", s.colorHex)
            )
        }
        prefs.edit().putString(KEY_SUBJECTS, arr.toString()).apply()
    }

    fun loadTasks(): List<StudyTask> {
        val raw = prefs.getString(KEY_TASKS, null)
        if (raw == null) {
            val seed = buildInitialSeedTasks()
            saveTasks(seed)
            return seed
        }
        return parseTaskArray(raw)
    }

    fun saveTasks(tasks: List<StudyTask>) {
        prefs.edit().putString(KEY_TASKS, serializeTaskArray(tasks)).apply()
    }

    fun loadTrash(): List<StudyTask> {
        val raw = prefs.getString(KEY_TRASH, null) ?: return emptyList()
        return parseTaskArray(raw)
    }

    fun saveTrash(trash: List<StudyTask>) {
        prefs.edit().putString(KEY_TRASH, serializeTaskArray(trash)).apply()
    }

    fun loadTheme(): ThemePreference = ThemePreference.fromWire(prefs.getString(KEY_THEME, "system"))

    fun saveTheme(theme: ThemePreference) {
        prefs.edit().putString(KEY_THEME, theme.wireValue).apply()
    }

    private fun serializeTaskArray(tasks: List<StudyTask>): String {
        val arr = JSONArray()
        for (t in tasks) {
            val obj = JSONObject()
                .put("id", t.id)
                .put("title", t.title)
                .put("notes", t.notes)
                .put("dateISO", t.dateISO)
                .put("subjectId", t.subjectId)
                .put("priority", t.priority.wireValue)
                .put("completed", t.completed)
                .put("reminderEnabled", t.reminderEnabled)
                .put("reminderTime", t.reminderTime)
                .put("createdAt", t.createdAt)
            if (t.deletedAt != null) obj.put("deletedAt", t.deletedAt)
            arr.put(obj)
        }
        return arr.toString()
    }

    private fun parseTaskArray(raw: String): List<StudyTask> {
        return try {
            val arr = JSONArray(raw)
            val list = mutableListOf<StudyTask>()
            for (i in 0 until arr.length()) {
                val obj = arr.getJSONObject(i)
                val deletedAt = if (obj.has("deletedAt") && !obj.isNull("deletedAt")) {
                    obj.optString("deletedAt").ifBlank { null }
                } else {
                    null
                }
                list.add(
                    StudyTask(
                        id = obj.getString("id"),
                        title = obj.getString("title"),
                        notes = obj.optString("notes", ""),
                        dateISO = obj.getString("dateISO"),
                        subjectId = obj.getString("subjectId"),
                        priority = PriorityLevel.fromWire(obj.optString("priority", "medium")),
                        completed = obj.optBoolean("completed", false),
                        reminderEnabled = obj.optBoolean("reminderEnabled", false),
                        reminderTime = obj.optString("reminderTime", "18:00"),
                        deletedAt = deletedAt,
                        createdAt = obj.optString("createdAt", "")
                    )
                )
            }
            list
        } catch (_: Throwable) {
            emptyList()
        }
    }

    private fun buildInitialSeedTasks(): List<StudyTask> {
        val week = JalaliCalendar.getWeekDays(0)
        val nowIso = nowIsoTimestamp()
        return listOf(
            StudyTask(
                id = "seed-1",
                title = "حل ۱۵ تست مبحث انتگرال و کاربرد مشتق",
                notes = "مرور نکات سرعتی و سوالات کنکور اخیر",
                dateISO = week[0].dateISO,
                subjectId = "math",
                priority = PriorityLevel.HIGH,
                completed = true,
                reminderEnabled = true,
                reminderTime = "16:30",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-2",
                title = "خلاصه‌نویسی فصل حرکت‌شناسی و نمودار سرعت-زمان",
                notes = "تمرین مسائل شتاب ثابت",
                dateISO = week[1].dateISO,
                subjectId = "physics",
                priority = PriorityLevel.HIGH,
                completed = false,
                reminderEnabled = true,
                reminderTime = "18:00",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-3",
                title = "مرور لغات درس سوم و درک مطلب انگلیسی",
                notes = "فلش‌کارت‌های واژگان آکادمیک",
                dateISO = week[2].dateISO,
                subjectId = "english",
                priority = PriorityLevel.MEDIUM,
                completed = false,
                reminderEnabled = false,
                reminderTime = "17:00",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-4",
                title = "پیاده‌سازی الگوریتم مرتب‌سازی ادغامی",
                notes = "تحلیل پیچیدگی زمانی و نوشتن تست واحد",
                dateISO = week[3].dateISO,
                subjectId = "programming",
                priority = PriorityLevel.HIGH,
                completed = false,
                reminderEnabled = true,
                reminderTime = "19:30",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-5",
                title = "حل مسائل استوکیومتری و موازنه واکنش‌ها",
                notes = "",
                dateISO = week[4].dateISO,
                subjectId = "chemistry",
                priority = PriorityLevel.MEDIUM,
                completed = false,
                reminderEnabled = true,
                reminderTime = "15:00",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-6",
                title = "آزمون زمان‌دار جمع‌بندی هفته",
                notes = "مرور تمام نکات علامت‌دار هفته",
                dateISO = week[5].dateISO,
                subjectId = "math",
                priority = PriorityLevel.HIGH,
                completed = false,
                reminderEnabled = true,
                reminderTime = "10:30",
                createdAt = nowIso
            ),
            StudyTask(
                id = "seed-7",
                title = "مطالعه آزاد و جبران تکالیف عقب‌مانده",
                notes = "",
                dateISO = week[6].dateISO,
                subjectId = "literature",
                priority = PriorityLevel.LOW,
                completed = false,
                reminderEnabled = false,
                reminderTime = "18:00",
                createdAt = nowIso
            )
        )
    }

    companion object {
        private const val PREFS_NAME = "weekly_study_planner_native_v1"
        private const val KEY_TASKS = "tasks_json"
        private const val KEY_TRASH = "trash_json"
        private const val KEY_SUBJECTS = "subjects_json"
        private const val KEY_THEME = "theme_pref"

        fun nowIsoTimestamp(): String {
            val fmt = SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US)
            fmt.timeZone = TimeZone.getTimeZone("UTC")
            return fmt.format(Date())
        }
    }
}
