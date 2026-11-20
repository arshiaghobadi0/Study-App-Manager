package com.studyplanner.weekly.data

import com.studyplanner.weekly.util.JalaliCalendar
import org.json.JSONArray
import org.json.JSONObject

data class ParsedBackup(
    val subjects: List<SubjectCategory>,
    val tasks: List<StudyTask>,
    val theme: ThemePreference?
)

sealed class ParseBackupResult {
    data class Success(val data: ParsedBackup) : ParseBackupResult()
    data class Error(val message: String) : ParseBackupResult()
}

/**
 * 100% schema-compatible JSON codec with the Web & Desktop (schemaVersion: 1) backups.
 */
object BackupCodec {

    private val COLOR_REGEX = Regex("^#[0-9a-fA-F]{3,8}$")
    private val TIME_REGEX = Regex("^([01]\\d|2[0-3]):[0-5]\\d$")

    fun serialize(
        tasks: List<StudyTask>,
        subjects: List<SubjectCategory>,
        theme: ThemePreference,
        exportedAtISO: String
    ): String {
        val subjectsArr = JSONArray()
        for (sub in subjects) {
            subjectsArr.put(
                JSONObject()
                    .put("id", sub.id)
                    .put("name", sub.name)
                    .put("color", sub.colorHex)
            )
        }

        val tasksArr = JSONArray()
        for (task in tasks) {
            val obj = JSONObject()
                .put("id", task.id)
                .put("title", task.title)
                .put("dateISO", task.dateISO)
                .put("subjectId", task.subjectId)
                .put("priority", task.priority.wireValue)
                .put("completed", task.completed)
                .put("reminderEnabled", task.reminderEnabled)
                .put("reminderTime", task.reminderTime)
                .put("createdAt", task.createdAt)
            if (task.notes.isNotBlank()) {
                obj.put("notes", task.notes)
            }
            if (!task.deletedAt.isNullOrBlank()) {
                obj.put("deletedAt", task.deletedAt)
            }
            tasksArr.put(obj)
        }

        val settingsObj = JSONObject()
            .put("theme", if (theme == ThemePreference.DARK) "dark" else "light")
            .put("subjects", subjectsArr)

        val summaryObj = JSONObject()
            .put("taskCount", tasks.size)
            .put("subjectCount", subjects.size)

        return JSONObject()
            .put("schemaVersion", 1)
            .put("exportedAt", exportedAtISO)
            .put("settings", settingsObj)
            .put("tasks", tasksArr)
            .put("summary", summaryObj)
            .toString(2)
    }

    fun parse(rawJson: String, existingSubjects: List<SubjectCategory>): ParseBackupResult {
        val trimmed = rawJson.trim()
        if (trimmed.isEmpty()) {
            return ParseBackupResult.Error("محتوای JSON خالی است.")
        }

        val rawSubjects: JSONArray?
        val rawTasks: JSONArray?
        var parsedTheme: ThemePreference? = null

        try {
            if (trimmed.startsWith("[")) {
                rawSubjects = null
                rawTasks = JSONArray(trimmed)
            } else {
                val root = JSONObject(trimmed)
                val settings = root.optJSONObject("settings")
                rawSubjects = root.optJSONArray("subjects") ?: settings?.optJSONArray("subjects")
                rawTasks = root.optJSONArray("tasks")
                val rawThemeStr = root.optString("theme", "").ifBlank {
                    settings?.optString("theme", "") ?: ""
                }
                if (rawThemeStr == "light" || rawThemeStr == "dark") {
                    parsedTheme = ThemePreference.fromWire(rawThemeStr)
                }
                if (rawTasks == null && rawSubjects == null) {
                    return ParseBackupResult.Error("فایل JSON باید شامل آرایه tasks یا subjects باشد.")
                }
            }
        } catch (_: Throwable) {
            return ParseBackupResult.Error("ساختار JSON معتبر نیست و قابل خواندن نمی‌باشد.")
        }

        val subjects = mutableListOf<SubjectCategory>()
        val seenSubjectIds = mutableSetOf<String>()
        if (rawSubjects != null) {
            for (i in 0 until rawSubjects.length()) {
                val item = rawSubjects.optJSONObject(i)
                    ?: return ParseBackupResult.Error("ساختار یکی از درس‌ها در JSON نامعتبر است.")
                val name = item.optString("name", "").trim()
                if (name.isEmpty()) {
                    return ParseBackupResult.Error("نام یکی از درس‌ها در فایل JSON خالی است.")
                }
                var id = item.optString("id", "").trim().ifEmpty { "sub-import-${i + 1}" }
                while (seenSubjectIds.contains(id)) {
                    id = "$id-${i + 1}"
                }
                seenSubjectIds.add(id)
                val rawColor = item.optString("color", "").trim()
                val color = if (COLOR_REGEX.matches(rawColor)) {
                    rawColor
                } else {
                    DefaultStudySeed.SUBJECT_SWATCHES[i % DefaultStudySeed.SUBJECT_SWATCHES.size]
                }
                subjects.add(SubjectCategory(id, name, color))
            }
        }

        val subjectPool = if (subjects.isNotEmpty()) subjects + existingSubjects else existingSubjects
        val validSubjectIds = subjectPool.map { it.id }.toSet()
        val fallbackSubjectId = subjectPool.firstOrNull()?.id ?: "math"

        val tasks = mutableListOf<StudyTask>()
        val seenTaskIds = mutableSetOf<String>()
        if (rawTasks != null) {
            for (i in 0 until rawTasks.length()) {
                val item = rawTasks.optJSONObject(i)
                    ?: return ParseBackupResult.Error("ساختار یکی از تکالیف در JSON معتبر نیست.")
                val title = item.optString("title", "").trim()
                if (title.isEmpty()) {
                    return ParseBackupResult.Error("عنوان تکلیف شماره ${i + 1} خالی است.")
                }
                val dateISO = item.optString("dateISO", "").trim()
                if (!JalaliCalendar.isValidISO(dateISO)) {
                    return ParseBackupResult.Error("تاریخ تکلیف «$title» معتبر نیست (فرمت YYYY-MM-DD لازم است).")
                }
                var id = item.optString("id", "").trim().ifEmpty { "task-import-${System.currentTimeMillis()}-${i + 1}" }
                while (seenTaskIds.contains(id)) {
                    id = "$id-${i + 1}"
                }
                seenTaskIds.add(id)

                val rawSubId = item.optString("subjectId", "").trim()
                val subjectId = if (validSubjectIds.contains(rawSubId)) rawSubId else fallbackSubjectId
                val priority = PriorityLevel.fromWire(item.optString("priority", "medium"))
                val completed = item.optBoolean("completed", false)
                val reminderEnabled = item.optBoolean("reminderEnabled", false)
                val rawTime = item.optString("reminderTime", "18:00").trim()
                val reminderTime = if (TIME_REGEX.matches(rawTime)) rawTime else "18:00"
                val notes = item.optString("notes", "").trim()
                val createdAt = item.optString("createdAt", "").trim()

                tasks.add(
                    StudyTask(
                        id = id,
                        title = title,
                        notes = notes,
                        dateISO = dateISO,
                        subjectId = subjectId,
                        priority = priority,
                        completed = completed,
                        reminderEnabled = reminderEnabled,
                        reminderTime = reminderTime,
                        createdAt = createdAt
                    )
                )
            }
        }

        if (tasks.isEmpty() && subjects.isEmpty()) {
            return ParseBackupResult.Error("هیچ تکلیف یا درسی در فایل JSON یافت نشد.")
        }

        return ParseBackupResult.Success(ParsedBackup(subjects, tasks, parsedTheme))
    }

    fun applyImport(
        mode: ImportMode,
        imported: ParsedBackup,
        currentTasks: List<StudyTask>,
        currentSubjects: List<SubjectCategory>
    ): Pair<List<SubjectCategory>, List<StudyTask>> {
        if (mode == ImportMode.REPLACE) {
            val nextSubjects = imported.subjects.ifEmpty { currentSubjects }
            val validIds = nextSubjects.map { it.id }.toSet()
            val fallbackId = nextSubjects.firstOrNull()?.id ?: "math"
            val nextTasks = imported.tasks.map { task ->
                if (validIds.contains(task.subjectId)) task else task.copy(subjectId = fallbackId)
            }
            return nextSubjects to nextTasks
        }

        val mergedSubjects = currentSubjects.toMutableList()
        val idByName = mergedSubjects.associate { it.name to it.id }.toMutableMap()
        val existingIds = mergedSubjects.map { it.id }.toMutableSet()
        val remap = mutableMapOf<String, String>()

        for (sub in imported.subjects) {
            val existingByName = idByName[sub.name]
            when {
                existingIds.contains(sub.id) -> {
                    val idx = mergedSubjects.indexOfFirst { it.id == sub.id }
                    if (idx >= 0) mergedSubjects[idx] = sub
                    remap[sub.id] = sub.id
                }
                existingByName != null -> {
                    remap[sub.id] = existingByName
                }
                else -> {
                    mergedSubjects.add(sub)
                    existingIds.add(sub.id)
                    idByName[sub.name] = sub.id
                    remap[sub.id] = sub.id
                }
            }
        }

        val mergedSubIds = mergedSubjects.map { it.id }.toSet()
        val fallbackId = mergedSubjects.firstOrNull()?.id ?: "math"
        val mergedTasks = currentTasks.toMutableList()
        val indexById = mergedTasks.withIndex().associate { it.value.id to it.index }.toMutableMap()

        for (task in imported.tasks) {
            val targetSub = remap[task.subjectId]
                ?: if (mergedSubIds.contains(task.subjectId)) task.subjectId else fallbackId
            val normalized = task.copy(subjectId = targetSub)
            val existingIdx = indexById[normalized.id]
            if (existingIdx != null) {
                mergedTasks[existingIdx] = normalized
            } else {
                indexById[normalized.id] = mergedTasks.size
                mergedTasks.add(normalized)
            }
        }

        return mergedSubjects to mergedTasks
    }

    fun buildBackupFilename(dateISO: String): String {
        val safeDate = if (JalaliCalendar.isValidISO(dateISO)) dateISO else "export"
        return "study-planner-backup-$safeDate.json"
    }
}
