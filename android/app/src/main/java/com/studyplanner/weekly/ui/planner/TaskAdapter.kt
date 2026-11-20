package com.studyplanner.weekly.ui.planner

import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Paint
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.PriorityLevel
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.data.SubjectCategory
import com.studyplanner.weekly.databinding.ItemTaskCardBinding
import com.studyplanner.weekly.util.JalaliCalendar

class TaskAdapter(
    private val onToggleComplete: (StudyTask) -> Unit,
    private val onToggleReminder: (StudyTask) -> Unit,
    private val onEdit: (StudyTask) -> Unit,
    private val onDelete: (StudyTask) -> Unit
) : ListAdapter<StudyTask, TaskAdapter.TaskViewHolder>(DIFF_CALLBACK) {

    private var subjectMap: Map<String, SubjectCategory> = emptyMap()

    fun setSubjects(subjects: List<SubjectCategory>) {
        subjectMap = subjects.associateBy { it.id }
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): TaskViewHolder {
        val binding = ItemTaskCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return TaskViewHolder(binding)
    }

    override fun onBindViewHolder(holder: TaskViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class TaskViewHolder(
        private val binding: ItemTaskCardBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(task: StudyTask) {
            val ctx = binding.root.context
            val subject = subjectMap[task.subjectId]

            binding.tvTaskTitle.text = task.title
            binding.tvTaskTitle.paintFlags = if (task.completed) {
                binding.tvTaskTitle.paintFlags or Paint.STRIKE_THRU_TEXT_FLAG
            } else {
                binding.tvTaskTitle.paintFlags and Paint.STRIKE_THRU_TEXT_FLAG.inv()
            }
            binding.tvTaskTitle.alpha = if (task.completed) 0.55f else 1.0f

            if (task.notes.isNotBlank()) {
                binding.tvTaskNotes.visibility = View.VISIBLE
                binding.tvTaskNotes.text = task.notes
            } else {
                binding.tvTaskNotes.visibility = View.GONE
            }

            val priorityColorRes = when (task.priority) {
                PriorityLevel.HIGH -> R.color.priority_high
                PriorityLevel.MEDIUM -> R.color.priority_medium
                PriorityLevel.LOW -> R.color.priority_low
            }
            binding.viewPriorityStrip.backgroundTintList =
                ColorStateList.valueOf(ContextCompat.getColor(ctx, priorityColorRes))

            val subjectColor = try {
                Color.parseColor(subject?.colorHex ?: "#0F766E")
            } catch (_: Throwable) {
                ContextCompat.getColor(ctx, R.color.brand_primary)
            }
            binding.viewSubjectDot.backgroundTintList = ColorStateList.valueOf(subjectColor)

            val jalali = JalaliCalendar.isoToJalali(task.dateISO)
            val weekday = JalaliCalendar.PERSIAN_WEEKDAYS[JalaliCalendar.getPersianWeekdayIndex(task.dateISO)]
            val dateLabel = "$weekday ${JalaliCalendar.formatJalaliLong(jalali)}"
            val reminderLabel = if (task.reminderEnabled) {
                " · ⏰ ${JalaliCalendar.toPersianDigits(task.reminderTime)}"
            } else {
                ""
            }
            binding.tvTaskMeta.text = "${subject?.name ?: "عمومی"} · $dateLabel$reminderLabel"

            binding.cbCompleted.setOnCheckedChangeListener(null)
            binding.cbCompleted.isChecked = task.completed
            binding.cbCompleted.setOnCheckedChangeListener { _, _ ->
                onToggleComplete(task)
            }

            binding.btnToggleReminder.setImageResource(
                if (task.reminderEnabled) R.drawable.ic_bell else R.drawable.ic_bell_off
            )
            binding.btnToggleReminder.imageTintList = ColorStateList.valueOf(
                ContextCompat.getColor(
                    ctx,
                    if (task.reminderEnabled) R.color.brand_secondary else R.color.text_muted
                )
            )
            binding.btnToggleReminder.setOnClickListener { onToggleReminder(task) }
            binding.btnEditTask.setOnClickListener { onEdit(task) }
            binding.btnDeleteTask.setOnClickListener { onDelete(task) }
            binding.cardTask.setOnClickListener { onEdit(task) }
        }
    }

    companion object {
        private val DIFF_CALLBACK = object : DiffUtil.ItemCallback<StudyTask>() {
            override fun areItemsTheSame(oldItem: StudyTask, newItem: StudyTask): Boolean =
                oldItem.id == newItem.id

            override fun areContentsTheSame(oldItem: StudyTask, newItem: StudyTask): Boolean =
                oldItem == newItem
        }
    }
}
