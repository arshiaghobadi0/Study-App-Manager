package com.studyplanner.weekly

import android.app.Application
import com.studyplanner.weekly.data.StudyRepository
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.reminder.ReminderReceiver

class StudyPlannerApp : Application() {
    override fun onCreate() {
        super.onCreate()
        val repository = StudyRepository(this)
        StudyViewModel.applyNightMode(repository.loadTheme())
        ReminderReceiver.ensureChannel(this)
    }
}
