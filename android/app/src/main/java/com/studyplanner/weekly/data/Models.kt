package com.studyplanner.weekly.data

enum class PriorityLevel(val wireValue: String, val labelFa: String) {
    HIGH("high", "اولویت بالا"),
    MEDIUM("medium", "اولویت متوسط"),
    LOW("low", "اولویت عادی");

    companion object {
        fun fromWire(value: String?): PriorityLevel =
            entries.firstOrNull { it.wireValue.equals(value, ignoreCase = true) } ?: MEDIUM
    }
}

enum class ThemePreference(val wireValue: String) {
    SYSTEM("system"),
    LIGHT("light"),
    DARK("dark");

    companion object {
        fun fromWire(value: String?): ThemePreference =
            entries.firstOrNull { it.wireValue.equals(value, ignoreCase = true) } ?: SYSTEM
    }
}

enum class ImportMode {
    MERGE,
    REPLACE
}

enum class DeleteScope {
    ALL,
    CURRENT_WEEK
}

enum class StatusFilter {
    ALL,
    PENDING,
    COMPLETED,
    HIGH_PRIORITY
}

data class SubjectCategory(
    val id: String,
    val name: String,
    val colorHex: String
)

data class StudyTask(
    val id: String,
    val title: String,
    val notes: String = "",
    /** Gregorian ISO date string YYYY-MM-DD */
    val dateISO: String,
    val subjectId: String,
    val priority: PriorityLevel = PriorityLevel.MEDIUM,
    val completed: Boolean = false,
    val reminderEnabled: Boolean = false,
    /** 24-hour time string HH:mm */
    val reminderTime: String = "18:00",
    val deletedAt: String? = null,
    val createdAt: String = ""
)

object DefaultStudySeed {
    val SUBJECT_SWATCHES = listOf(
        "#0F766E",
        "#2563EB",
        "#D97706",
        "#7C3AED",
        "#059669",
        "#DC2626",
        "#0284C7",
        "#DB2777"
    )

    fun defaultSubjects(): List<SubjectCategory> = listOf(
        SubjectCategory("math", "ریاضی", "#2563EB"),
        SubjectCategory("physics", "فیزیک", "#0891B2"),
        SubjectCategory("literature", "ادبیات فارسی", "#D97706"),
        SubjectCategory("english", "زبان انگلیسی", "#059669"),
        SubjectCategory("chemistry", "شیمی و علوم", "#7C3AED"),
        SubjectCategory("programming", "برنامه‌نویسی", "#DC2626")
    )
}
