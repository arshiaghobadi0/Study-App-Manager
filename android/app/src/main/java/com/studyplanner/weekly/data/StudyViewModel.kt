package com.studyplanner.weekly.data

import android.app.Application
import androidx.appcompat.app.AppCompatDelegate
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import com.studyplanner.weekly.reminder.ReminderScheduler
import com.studyplanner.weekly.util.DownloadsExporter
import com.studyplanner.weekly.util.ExportResult
import com.studyplanner.weekly.util.JalaliCalendar
import com.studyplanner.weekly.util.PdfScheduleExporter
import com.studyplanner.weekly.util.TaskOperations
import com.studyplanner.weekly.util.WeekDayInfo
import com.studyplanner.weekly.util.WeeklyAnalyticsSnapshot
import java.util.UUID

class StudyViewModel(application: Application) : AndroidViewModel(application) {

    private val repository = StudyRepository(application)

    private val _tasks = MutableLiveData<List<StudyTask>>(repository.loadTasks())
    val tasks: LiveData<List<StudyTask>> = _tasks

    private val _trashTasks = MutableLiveData<List<StudyTask>>(repository.loadTrash())
    val trashTasks: LiveData<List<StudyTask>> = _trashTasks

    private val _subjects = MutableLiveData<List<SubjectCategory>>(repository.loadSubjects())
    val subjects: LiveData<List<SubjectCategory>> = _subjects

    private val _theme = MutableLiveData<ThemePreference>(repository.loadTheme())
    val theme: LiveData<ThemePreference> = _theme

    private val _weekOffset = MutableLiveData(0)
    val weekOffset: LiveData<Int> = _weekOffset

    /** null means "all 7 days of the selected week" */
    private val _selectedDateISO = MutableLiveData<String?>(null)
    val selectedDateISO: LiveData<String?> = _selectedDateISO

    private val _statusFilter = MutableLiveData(StatusFilter.ALL)
    val statusFilter: LiveData<StatusFilter> = _statusFilter

    private val _searchQuery = MutableLiveData("")
    val searchQuery: LiveData<String> = _searchQuery

    fun currentWeekDays(): List<WeekDayInfo> = JalaliCalendar.getWeekDays(_weekOffset.value ?: 0)

    fun shiftWeek(delta: Int) {
        _weekOffset.value = (_weekOffset.value ?: 0) + delta
        _selectedDateISO.value = null
    }

    fun jumpToCurrentWeek() {
        _weekOffset.value = 0
        _selectedDateISO.value = null
    }

    fun selectDate(dateISO: String?) {
        _selectedDateISO.value = dateISO
    }

    fun setStatusFilter(filter: StatusFilter) {
        _statusFilter.value = filter
    }

    fun setSearchQuery(query: String) {
        _searchQuery.value = query
    }

    fun filteredWeekTasks(): List<StudyTask> {
        val weekDates = currentWeekDays().map { it.dateISO }.toSet()
        return TaskOperations.filterTasks(
            tasks = _tasks.value.orEmpty(),
            weekDateISOs = weekDates,
            selectedDateISO = _selectedDateISO.value,
            statusFilter = _statusFilter.value ?: StatusFilter.ALL,
            searchQuery = _searchQuery.value.orEmpty()
        )
    }

    fun weeklyAnalytics(): WeeklyAnalyticsSnapshot =
        TaskOperations.computeWeeklyAnalytics(
            tasks = _tasks.value.orEmpty(),
            subjects = _subjects.value.orEmpty(),
            weekDays = currentWeekDays()
        )

    fun saveTask(
        editingId: String?,
        title: String,
        notes: String,
        dateISO: String,
        repeatAllWeek: Boolean,
        subjectId: String,
        priority: PriorityLevel,
        reminderEnabled: Boolean,
        reminderTime: String
    ): Int {
        val trimmedTitle = title.trim()
        if (trimmedTitle.isEmpty()) return 0

        val current = _tasks.value.orEmpty().toMutableList()
        val subjectName = _subjects.value.orEmpty().firstOrNull { it.id == subjectId }?.name.orEmpty()
        val ctx = getApplication<Application>()

        if (editingId != null) {
            val idx = current.indexOfFirst { it.id == editingId }
            if (idx >= 0) {
                val updated = current[idx].copy(
                    title = trimmedTitle,
                    notes = notes.trim(),
                    dateISO = dateISO,
                    subjectId = subjectId,
                    priority = priority,
                    reminderEnabled = reminderEnabled,
                    reminderTime = reminderTime
                )
                current[idx] = updated
                updateTasks(current)
                ReminderScheduler.scheduleTaskReminder(ctx, updated, subjectName)
                return 1
            }
        }

        val targetDates = TaskOperations.expandDatesForWeek(dateISO, repeatAllWeek)
        val createdAt = StudyRepository.nowIsoTimestamp()
        val createdItems = targetDates.map { targetDate ->
            StudyTask(
                id = "task-${UUID.randomUUID()}",
                title = trimmedTitle,
                notes = notes.trim(),
                dateISO = targetDate,
                subjectId = subjectId,
                priority = priority,
                completed = false,
                reminderEnabled = reminderEnabled,
                reminderTime = reminderTime,
                createdAt = createdAt
            )
        }
        current.addAll(0, createdItems)
        updateTasks(current)
        createdItems.forEach { ReminderScheduler.scheduleTaskReminder(ctx, it, subjectName) }
        return createdItems.size
    }

    fun toggleCompleted(taskId: String) {
        val current = _tasks.value.orEmpty().toMutableList()
        val idx = current.indexOfFirst { it.id == taskId }
        if (idx < 0) return
        val toggled = current[idx].copy(completed = !current[idx].completed)
        current[idx] = toggled
        updateTasks(current)
        val subName = _subjects.value.orEmpty().firstOrNull { it.id == toggled.subjectId }?.name.orEmpty()
        ReminderScheduler.scheduleTaskReminder(getApplication(), toggled, subName)
    }

    fun toggleReminder(taskId: String) {
        val current = _tasks.value.orEmpty().toMutableList()
        val idx = current.indexOfFirst { it.id == taskId }
        if (idx < 0) return
        val toggled = current[idx].copy(reminderEnabled = !current[idx].reminderEnabled)
        current[idx] = toggled
        updateTasks(current)
        val subName = _subjects.value.orEmpty().firstOrNull { it.id == toggled.subjectId }?.name.orEmpty()
        ReminderScheduler.scheduleTaskReminder(getApplication(), toggled, subName)
    }

    fun softDeleteTask(taskId: String): StudyTask? {
        val current = _tasks.value.orEmpty().toMutableList()
        val idx = current.indexOfFirst { it.id == taskId }
        if (idx < 0) return null
        val removed = current.removeAt(idx)
        val archived = removed.copy(deletedAt = StudyRepository.nowIsoTimestamp())
        updateTasks(current)
        updateTrash(listOf(archived) + _trashTasks.value.orEmpty())
        ReminderScheduler.cancelTaskReminder(getApplication(), taskId)
        return removed
    }

    fun restoreTaskFromTrash(taskId: String) {
        val trash = _trashTasks.value.orEmpty().toMutableList()
        val idx = trash.indexOfFirst { it.id == taskId }
        if (idx < 0) return
        val restored = trash.removeAt(idx).copy(deletedAt = null)
        updateTrash(trash)
        updateTasks(listOf(restored) + _tasks.value.orEmpty())
    }

    fun restoreAllFromTrash() {
        val trash = _trashTasks.value.orEmpty()
        if (trash.isEmpty()) return
        val restored = trash.map { it.copy(deletedAt = null) }
        updateTrash(emptyList())
        updateTasks(restored + _tasks.value.orEmpty())
    }

    fun deleteForeverFromTrash(taskId: String) {
        val next = _trashTasks.value.orEmpty().filterNot { it.id == taskId }
        updateTrash(next)
    }

    fun emptyTrash() {
        updateTrash(emptyList())
    }

    fun deleteTasksByScope(scope: DeleteScope, permanent: Boolean): Int {
        val weekDateSet = currentWeekDays().map { it.dateISO }.toSet()
        val currentTasks = _tasks.value.orEmpty()
        val result = TaskOperations.removeTasksByScope(
            tasks = currentTasks,
            trashTasks = _trashTasks.value.orEmpty(),
            scope = scope,
            weekDateISOs = weekDateSet,
            permanent = permanent,
            deletedAtISO = StudyRepository.nowIsoTimestamp()
        )
        if (result.removedCount > 0) {
            val keptIds = result.nextTasks.map { it.id }.toSet()
            currentTasks.filterNot { keptIds.contains(it.id) }.forEach {
                ReminderScheduler.cancelTaskReminder(getApplication(), it.id)
            }
            updateTasks(result.nextTasks)
            updateTrash(result.nextTrash)
        }
        return result.removedCount
    }

    fun upsertSubject(id: String?, name: String, colorHex: String) {
        val trimmed = name.trim()
        if (trimmed.isEmpty()) return
        val current = _subjects.value.orEmpty().toMutableList()
        if (id != null) {
            val idx = current.indexOfFirst { it.id == id }
            if (idx >= 0) {
                current[idx] = current[idx].copy(name = trimmed, colorHex = colorHex)
                updateSubjects(current)
                return
            }
        }
        current.add(SubjectCategory(id = "sub-${UUID.randomUUID()}", name = trimmed, colorHex = colorHex))
        updateSubjects(current)
    }

    fun deleteSubject(subjectId: String): Boolean {
        val current = _subjects.value.orEmpty()
        if (current.size <= 1) return false
        val nextSubjects = current.filterNot { it.id == subjectId }
        val fallbackId = nextSubjects.first().id
        val reassignedTasks = _tasks.value.orEmpty().map {
            if (it.subjectId == subjectId) it.copy(subjectId = fallbackId) else it
        }
        updateSubjects(nextSubjects)
        updateTasks(reassignedTasks)
        return true
    }

    fun setTheme(preference: ThemePreference) {
        _theme.value = preference
        repository.saveTheme(preference)
        applyNightMode(preference)
    }

    fun exportJsonBackup(): ExportResult {
        val today = JalaliCalendar.todayISO()
        val filename = BackupCodec.buildBackupFilename(today)
        val json = BackupCodec.serialize(
            tasks = _tasks.value.orEmpty(),
            subjects = _subjects.value.orEmpty(),
            theme = _theme.value ?: ThemePreference.SYSTEM,
            exportedAtISO = StudyRepository.nowIsoTimestamp()
        )
        return DownloadsExporter.saveBytes(
            context = getApplication(),
            filename = filename,
            mimeType = "application/json",
            bytes = json.toByteArray(Charsets.UTF_8)
        )
    }

    fun exportCurrentWeekPdf(): ExportResult {
        val days = currentWeekDays()
        return PdfScheduleExporter.exportWeekPdf(
            context = getApplication(),
            weekDays = days,
            tasks = _tasks.value.orEmpty(),
            subjects = _subjects.value.orEmpty()
        )
    }

    fun importBackupJson(rawJson: String, mode: ImportMode): Pair<Boolean, String> {
        return when (val parsed = BackupCodec.parse(rawJson, _subjects.value.orEmpty())) {
            is ParseBackupResult.Error -> false to parsed.message
            is ParseBackupResult.Success -> {
                val (nextSubjects, nextTasks) = BackupCodec.applyImport(
                    mode = mode,
                    imported = parsed.data,
                    currentTasks = _tasks.value.orEmpty(),
                    currentSubjects = _subjects.value.orEmpty()
                )
                updateSubjects(nextSubjects)
                updateTasks(nextTasks)
                parsed.data.theme?.let { setTheme(it) }
                val countFa = JalaliCalendar.toPersianDigits(parsed.data.tasks.size)
                true to "پشتیبان با موفقیت اعمال شد ($countFa تکلیف)."
            }
        }
    }

    private fun updateTasks(list: List<StudyTask>) {
        _tasks.value = list
        repository.saveTasks(list)
    }

    private fun updateTrash(list: List<StudyTask>) {
        _trashTasks.value = list
        repository.saveTrash(list)
    }

    private fun updateSubjects(list: List<SubjectCategory>) {
        _subjects.value = list
        repository.saveSubjects(list)
    }

    companion object {
        fun applyNightMode(preference: ThemePreference) {
            val mode = when (preference) {
                ThemePreference.LIGHT -> AppCompatDelegate.MODE_NIGHT_NO
                ThemePreference.DARK -> AppCompatDelegate.MODE_NIGHT_YES
                ThemePreference.SYSTEM -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            }
            AppCompatDelegate.setDefaultNightMode(mode)
        }
    }
}
