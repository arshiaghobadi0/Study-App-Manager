package com.studyplanner.weekly

import com.studyplanner.weekly.data.DefaultStudySeed
import com.studyplanner.weekly.data.DeleteScope
import com.studyplanner.weekly.data.PriorityLevel
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.util.JalaliCalendar
import com.studyplanner.weekly.util.TaskOperations
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class TaskOperationsTest {

    @Test
    fun expandDatesForWeekGeneratesAllSevenIranianWeekDays() {
        val single = TaskOperations.expandDatesForWeek("2026-11-19", repeatAllWeek = false)
        assertEquals(listOf("2026-11-19"), single)

        val fullWeek = TaskOperations.expandDatesForWeek("2026-11-19", repeatAllWeek = true)
        assertEquals(7, fullWeek.size)
        assertEquals("2026-11-14", fullWeek.first())
        assertEquals("2026-11-20", fullWeek.last())
    }

    @Test
    fun removeTasksByScopeSupportsSoftDeletePermanentAndWeekScope() {
        val tasks = listOf(
            StudyTask("t1", "Task 1", "", "2026-11-14", "math", PriorityLevel.HIGH),
            StudyTask("t2", "Task 2", "", "2026-11-19", "physics", PriorityLevel.MEDIUM),
            StudyTask("t3", "Next Week", "", "2026-11-22", "math", PriorityLevel.LOW)
        )
        val weekSet = JalaliCalendar.getWeekDays(0, "2026-11-19").map { it.dateISO }.toSet()

        val weekOnly = TaskOperations.removeTasksByScope(
            tasks = tasks,
            trashTasks = emptyList(),
            scope = DeleteScope.CURRENT_WEEK,
            weekDateISOs = weekSet,
            permanent = false,
            deletedAtISO = "2026-11-20T10:00:00Z"
        )
        assertEquals(2, weekOnly.removedCount)
        assertEquals(1, weekOnly.nextTasks.size)
        assertEquals("t3", weekOnly.nextTasks.first().id)
        assertEquals(2, weekOnly.nextTrash.size)

        val permanentAll = TaskOperations.removeTasksByScope(
            tasks = tasks,
            trashTasks = emptyList(),
            scope = DeleteScope.ALL,
            weekDateISOs = weekSet,
            permanent = true,
            deletedAtISO = "2026-11-20T10:00:00Z"
        )
        assertEquals(3, permanentAll.removedCount)
        assertTrue(permanentAll.nextTasks.isEmpty())
        assertTrue(permanentAll.nextTrash.isEmpty())
    }

    @Test
    fun computeWeeklyAnalyticsAggregatesCompletionAndSubjects() {
        val days = JalaliCalendar.getWeekDays(0, "2026-11-19")
        val tasks = listOf(
            StudyTask("a", "Math 1", "", days[0].dateISO, "math", PriorityLevel.HIGH, completed = true),
            StudyTask("b", "Math 2", "", days[0].dateISO, "math", PriorityLevel.MEDIUM, completed = false),
            StudyTask("c", "Phys 1", "", days[2].dateISO, "physics", PriorityLevel.LOW, completed = true)
        )
        val stats = TaskOperations.computeWeeklyAnalytics(tasks, DefaultStudySeed.defaultSubjects(), days)
        assertEquals(3, stats.total)
        assertEquals(2, stats.completed)
        assertEquals(1, stats.pending)
        assertEquals(66, stats.completionPercent)
        assertEquals(7, stats.dailyPoints.size)
        assertEquals(2, stats.subjectProgress.size)
    }
}
