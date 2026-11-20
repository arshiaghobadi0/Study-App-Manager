package com.studyplanner.weekly

import com.studyplanner.weekly.data.BackupCodec
import com.studyplanner.weekly.data.DefaultStudySeed
import com.studyplanner.weekly.data.ImportMode
import com.studyplanner.weekly.data.ParseBackupResult
import com.studyplanner.weekly.data.PriorityLevel
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.data.ThemePreference
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class BackupCodecTest {

    @Test
    fun roundTripsSchemaVersion1CompatibleWithWebAndDesktop() {
        val subjects = DefaultStudySeed.defaultSubjects()
        val tasks = listOf(
            StudyTask(
                id = "task-1",
                title = "حل تمرین فصل انتگرال",
                notes = "صفحه ۴۲",
                dateISO = "2026-11-16",
                subjectId = "math",
                priority = PriorityLevel.HIGH,
                completed = false,
                reminderEnabled = true,
                reminderTime = "18:00",
                createdAt = "2026-11-16T10:00:00Z"
            )
        )

        val json = BackupCodec.serialize(tasks, subjects, ThemePreference.DARK, "2026-11-20T12:00:00Z")
        val parsed = BackupCodec.parse(json, subjects)
        assertTrue(parsed is ParseBackupResult.Success)
        val data = (parsed as ParseBackupResult.Success).data
        assertEquals(ThemePreference.DARK, data.theme)
        assertEquals(1, data.tasks.size)
        assertEquals("حل تمرین فصل انتگرال", data.tasks.first().title)
        assertEquals(subjects.size, data.subjects.size)
    }

    @Test
    fun mergeModePreservesExistingTasksAndUpsertsImported() {
        val subjects = DefaultStudySeed.defaultSubjects()
        val existing = listOf(
            StudyTask("old-1", "Existing", "", "2026-11-15", "math")
        )
        val importedJson = """
            [
              {
                "id": "new-1",
                "title": "Imported Task",
                "dateISO": "2026-11-19",
                "subjectId": "physics",
                "priority": "high",
                "completed": true
              }
            ]
        """.trimIndent()

        val parsed = BackupCodec.parse(importedJson, subjects) as ParseBackupResult.Success
        val (_, mergedTasks) = BackupCodec.applyImport(ImportMode.MERGE, parsed.data, existing, subjects)
        assertEquals(2, mergedTasks.size)
    }
}
