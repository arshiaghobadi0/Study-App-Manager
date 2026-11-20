package com.studyplanner.weekly.util

import com.studyplanner.weekly.data.DeleteScope
import com.studyplanner.weekly.data.PriorityLevel
import com.studyplanner.weekly.data.StatusFilter
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.data.SubjectCategory

data class BulkDeleteResult(
    val nextTasks: List<StudyTask>,
    val nextTrash: List<StudyTask>,
    val removedCount: Int
)

data class DayBarPoint(
    val weekdayShort: String,
    val weekdayFull: String,
    val completed: Int,
    val pending: Int
)

data class SubjectProgressItem(
    val subject: SubjectCategory,
    val completed: Int,
    val total: Int
) {
    val percentage: Int
        get() = if (total == 0) 0 else ((completed * 100.0) / total).toInt()
}

data class WeeklyAnalyticsSnapshot(
    val total: Int,
    val completed: Int,
    val pending: Int,
    val completionPercent: Int,
    val dailyPoints: List<DayBarPoint>,
    val subjectProgress: List<SubjectProgressItem>
)

object TaskOperations {

    /**
     * Expands a target date into all 7 dates (Saturday..Friday) of that week
     * when [repeatAllWeek] is true; otherwise returns a single-element list.
     */
    fun expandDatesForWeek(anchorDateISO: String, repeatAllWeek: Boolean): List<String> {
        if (!repeatAllWeek) return listOf(anchorDateISO)
        return JalaliCalendar.getWeekDays(weekOffset = 0, anchorISO = anchorDateISO).map { it.dateISO }
    }

    /**
     * Removes either all tasks or only tasks inside [weekDateISOs], either moving them
     * to [trashTasks] (soft delete) or erasing them permanently.
     */
    fun removeTasksByScope(
        tasks: List<StudyTask>,
        trashTasks: List<StudyTask>,
        scope: DeleteScope,
        weekDateISOs: Set<String>,
        permanent: Boolean,
        deletedAtISO: String
    ): BulkDeleteResult {
        val removed = mutableListOf<StudyTask>()
        val kept = mutableListOf<StudyTask>()

        for (task in tasks) {
            val shouldRemove = scope == DeleteScope.ALL || weekDateISOs.contains(task.dateISO)
            if (shouldRemove) {
                removed.add(task)
            } else {
                kept.add(task)
            }
        }

        if (removed.isEmpty()) {
            return BulkDeleteResult(tasks, trashTasks, 0)
        }

        val nextTrash = if (permanent) {
            trashTasks
        } else {
            val archived = removed.map { it.copy(deletedAt = deletedAtISO) }
            archived + trashTasks
        }

        return BulkDeleteResult(
            nextTasks = kept,
            nextTrash = nextTrash,
            removedCount = removed.size
        )
    }

    fun filterTasks(
        tasks: List<StudyTask>,
        weekDateISOs: Set<String>,
        selectedDateISO: String?,
        statusFilter: StatusFilter,
        searchQuery: String
    ): List<StudyTask> {
        val normalizedQuery = searchQuery.trim().lowercase()
        val priorityRank = mapOf(
            PriorityLevel.HIGH to 0,
            PriorityLevel.MEDIUM to 1,
            PriorityLevel.LOW to 2
        )

        return tasks.filter { task ->
            if (!weekDateISOs.contains(task.dateISO)) return@filter false
            if (selectedDateISO != null && task.dateISO != selectedDateISO) return@filter false

            when (statusFilter) {
                StatusFilter.ALL -> true
                StatusFilter.PENDING -> !task.completed
                StatusFilter.COMPLETED -> task.completed
                StatusFilter.HIGH_PRIORITY -> task.priority == PriorityLevel.HIGH
            } && (normalizedQuery.isEmpty() ||
                task.title.lowercase().contains(normalizedQuery) ||
                task.notes.lowercase().contains(normalizedQuery))
        }.sortedWith(
            compareBy<StudyTask>(
                { it.dateISO },
                { if (it.completed) 1 else 0 },
                { priorityRank[it.priority] ?: 1 },
                { it.reminderTime }
            )
        )
    }

    fun computeWeeklyAnalytics(
        tasks: List<StudyTask>,
        subjects: List<SubjectCategory>,
        weekDays: List<WeekDayInfo>
    ): WeeklyAnalyticsSnapshot {
        val dateSet = weekDays.map { it.dateISO }.toSet()
        val weekTasks = tasks.filter { dateSet.contains(it.dateISO) }
        val completedCount = weekTasks.count { it.completed }
        val totalCount = weekTasks.size
        val pendingCount = totalCount - completedCount
        val percent = if (totalCount == 0) 0 else ((completedCount * 100.0) / totalCount).toInt()

        val dailyPoints = weekDays.map { day ->
            val dayTasks = weekTasks.filter { it.dateISO == day.dateISO }
            val done = dayTasks.count { it.completed }
            DayBarPoint(
                weekdayShort = day.persianWeekdayShort,
                weekdayFull = day.persianWeekday,
                completed = done,
                pending = dayTasks.size - done
            )
        }

        val subjectProgress = subjects.mapNotNull { subject ->
            val subTasks = weekTasks.filter { it.subjectId == subject.id }
            if (subTasks.isEmpty()) null else SubjectProgressItem(
                subject = subject,
                completed = subTasks.count { it.completed },
                total = subTasks.size
            )
        }.sortedByDescending { it.total }

        return WeeklyAnalyticsSnapshot(
            total = totalCount,
            completed = completedCount,
            pending = pendingCount,
            completionPercent = percent,
            dailyPoints = dailyPoints,
            subjectProgress = subjectProgress
        )
    }
}
