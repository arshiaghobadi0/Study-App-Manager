package com.studyplanner.weekly.reminder

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.util.JalaliCalendar
import java.util.Calendar

object ReminderScheduler {

    fun scheduleTaskReminder(context: Context, task: StudyTask, subjectName: String) {
        if (!task.reminderEnabled || task.completed) {
            cancelTaskReminder(context, task.id)
            return
        }

        val triggerAtMillis = computeTriggerMillis(task.dateISO, task.reminderTime) ?: return
        if (triggerAtMillis <= System.currentTimeMillis()) return

        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val pendingIntent = buildPendingIntent(context, task, subjectName)

        try {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        } catch (_: SecurityException) {
            alarmManager.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
        }
    }

    fun cancelTaskReminder(context: Context, taskId: String) {
        val alarmManager = context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager ?: return
        val intent = Intent(context, ReminderReceiver::class.java)
        val pendingIntent = PendingIntent.getBroadcast(
            context,
            taskId.hashCode(),
            intent,
            PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
        )
        if (pendingIntent != null) {
            alarmManager.cancel(pendingIntent)
            pendingIntent.cancel()
        }
    }

    private fun buildPendingIntent(
        context: Context,
        task: StudyTask,
        subjectName: String
    ): PendingIntent {
        val intent = Intent(context, ReminderReceiver::class.java).apply {
            putExtra(ReminderReceiver.EXTRA_TASK_ID, task.id)
            putExtra(ReminderReceiver.EXTRA_TASK_TITLE, task.title)
            putExtra(ReminderReceiver.EXTRA_SUBJECT_NAME, subjectName)
            putExtra(ReminderReceiver.EXTRA_REMINDER_TIME, JalaliCalendar.toPersianDigits(task.reminderTime))
        }
        return PendingIntent.getBroadcast(
            context,
            task.id.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
    }

    private fun computeTriggerMillis(dateISO: String, timeHHmm: String): Long? {
        if (!JalaliCalendar.isValidISO(dateISO)) return null
        val timeParts = timeHHmm.split(":")
        if (timeParts.size != 2) return null
        val hour = timeParts[0].toIntOrNull() ?: return null
        val minute = timeParts[1].toIntOrNull() ?: return null
        val g = JalaliCalendar.parseISO(dateISO)
        val cal = Calendar.getInstance().apply {
            set(Calendar.YEAR, g.gy)
            set(Calendar.MONTH, g.gm - 1)
            set(Calendar.DAY_OF_MONTH, g.gd)
            set(Calendar.HOUR_OF_DAY, hour)
            set(Calendar.MINUTE, minute)
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }
        return cal.timeInMillis
    }
}
