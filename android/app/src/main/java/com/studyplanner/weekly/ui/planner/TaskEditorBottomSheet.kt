package com.studyplanner.weekly.ui.planner

import android.app.DatePickerDialog
import android.app.TimePickerDialog
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.AdapterView
import android.widget.ArrayAdapter
import androidx.fragment.app.activityViewModels
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.PriorityLevel
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.BottomSheetTaskEditorBinding
import com.studyplanner.weekly.util.GregorianDate
import com.studyplanner.weekly.util.JalaliCalendar
import java.util.Locale

class TaskEditorBottomSheet : BottomSheetDialogFragment() {

    private var _binding: BottomSheetTaskEditorBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()

    private var editingTaskId: String? = null
    private var selectedDateISO: String = JalaliCalendar.todayISO()
    private var selectedTime: String = "18:00"
    private var suppressSpinnerEvents = false

    private val jalaliYears = (1403..1410).toList()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = BottomSheetTaskEditorBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        val subjects = viewModel.subjects.value.orEmpty()
        editingTaskId = arguments?.getString(ARG_TASK_ID)
        val editingTask: StudyTask? = editingTaskId?.let { id ->
            viewModel.tasks.value.orEmpty().firstOrNull { it.id == id }
        }
        selectedDateISO = editingTask?.dateISO
            ?: arguments?.getString(ARG_INITIAL_DATE)
            ?: JalaliCalendar.todayISO()
        selectedTime = editingTask?.reminderTime ?: "18:00"

        // Subject Spinner
        val subjectAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            subjects.map { it.name }
        )
        binding.spinnerSubject.adapter = subjectAdapter

        if (editingTask != null) {
            binding.tvEditorHeading.setText(R.string.task_editor_edit_title)
            binding.etTaskTitle.setText(editingTask.title)
            binding.etTaskNotes.setText(editingTask.notes)
            val subIdx = subjects.indexOfFirst { it.id == editingTask.subjectId }.coerceAtLeast(0)
            binding.spinnerSubject.setSelection(subIdx)
            val prioBtnId = when (editingTask.priority) {
                PriorityLevel.HIGH -> R.id.btnPriorityHigh
                PriorityLevel.MEDIUM -> R.id.btnPriorityMedium
                PriorityLevel.LOW -> R.id.btnPriorityLow
            }
            binding.togglePriority.check(prioBtnId)
            binding.switchReminder.isChecked = editingTask.reminderEnabled
            binding.cbRepeatAllWeek.visibility = View.GONE
            binding.tvAllWeekHint.visibility = View.GONE
            binding.btnSaveTask.setText(R.string.btn_save_changes)
        } else {
            binding.tvEditorHeading.setText(R.string.task_editor_new_title)
            binding.togglePriority.check(R.id.btnPriorityMedium)
            binding.switchReminder.isChecked = true
            binding.cbRepeatAllWeek.visibility = View.VISIBLE
            binding.btnSaveTask.setText(R.string.btn_save_task)
        }

        setupJalaliSpinners()
        syncDateWidgets()
        syncTimeButton()

        binding.btnPickGregorianDate.setOnClickListener {
            val g = JalaliCalendar.parseISO(selectedDateISO)
            DatePickerDialog(
                requireContext(),
                { _, year, monthZeroBased, dayOfMonth ->
                    selectedDateISO = JalaliCalendar.formatISO(
                        GregorianDate(year, monthZeroBased + 1, dayOfMonth)
                    )
                    syncDateWidgets()
                },
                g.gy,
                g.gm - 1,
                g.gd
            ).show()
        }

        binding.cbRepeatAllWeek.setOnCheckedChangeListener { _, isChecked ->
            binding.tvAllWeekHint.visibility = if (isChecked) View.VISIBLE else View.GONE
            binding.btnSaveTask.setText(
                if (isChecked) R.string.btn_save_all_week else R.string.btn_save_task
            )
            updateDatePreviewText()
        }

        binding.switchReminder.setOnCheckedChangeListener { _, isChecked ->
            binding.btnPickTime.isEnabled = isChecked
        }
        binding.btnPickTime.isEnabled = binding.switchReminder.isChecked

        binding.btnPickTime.setOnClickListener {
            val parts = selectedTime.split(":")
            val hour = parts.getOrNull(0)?.toIntOrNull() ?: 18
            val minute = parts.getOrNull(1)?.toIntOrNull() ?: 0
            TimePickerDialog(
                requireContext(),
                { _, h, m ->
                    selectedTime = String.format(Locale.US, "%02d:%02d", h, m)
                    syncTimeButton()
                },
                hour,
                minute,
                true
            ).show()
        }

        binding.btnCancelTask.setOnClickListener { dismiss() }

        binding.btnSaveTask.setOnClickListener {
            val title = binding.etTaskTitle.text?.toString()?.trim().orEmpty()
            if (title.isEmpty()) {
                binding.tilTitle.error = getString(R.string.error_title_required)
                return@setOnClickListener
            }
            binding.tilTitle.error = null

            val chosenSubjectId = subjects.getOrNull(binding.spinnerSubject.selectedItemPosition)?.id
                ?: subjects.firstOrNull()?.id
                ?: "math"

            val priority = when (binding.togglePriority.checkedButtonId) {
                R.id.btnPriorityHigh -> PriorityLevel.HIGH
                R.id.btnPriorityLow -> PriorityLevel.LOW
                else -> PriorityLevel.MEDIUM
            }

            viewModel.saveTask(
                editingId = editingTaskId,
                title = title,
                notes = binding.etTaskNotes.text?.toString().orEmpty(),
                dateISO = selectedDateISO,
                repeatAllWeek = editingTaskId == null && binding.cbRepeatAllWeek.isChecked,
                subjectId = chosenSubjectId,
                priority = priority,
                reminderEnabled = binding.switchReminder.isChecked,
                reminderTime = selectedTime
            )
            dismiss()
        }
    }

    private fun setupJalaliSpinners() {
        val monthAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            JalaliCalendar.PERSIAN_MONTHS
        )
        binding.spinnerJalaliMonth.adapter = monthAdapter

        val yearAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            jalaliYears.map { JalaliCalendar.toPersianDigits(it) }
        )
        binding.spinnerJalaliYear.adapter = yearAdapter

        val listener = object : AdapterView.OnItemSelectedListener {
            override fun onItemSelected(parent: AdapterView<*>?, v: View?, pos: Int, id: Long) {
                if (suppressSpinnerEvents) return
                val jy = jalaliYears.getOrElse(binding.spinnerJalaliYear.selectedItemPosition) { 1405 }
                val jm = binding.spinnerJalaliMonth.selectedItemPosition + 1
                val maxDay = JalaliCalendar.monthLength(jy, jm)
                val jd = (binding.spinnerJalaliDay.selectedItemPosition + 1).coerceIn(1, maxDay)
                selectedDateISO = JalaliCalendar.jalaliToISO(jy, jm, jd)
                refreshJalaliDaySpinner(jy, jm, jd)
                updateDatePreviewText()
            }

            override fun onNothingSelected(parent: AdapterView<*>?) {}
        }

        binding.spinnerJalaliDay.onItemSelectedListener = listener
        binding.spinnerJalaliMonth.onItemSelectedListener = listener
        binding.spinnerJalaliYear.onItemSelectedListener = listener
    }

    private fun refreshJalaliDaySpinner(jy: Int, jm: Int, selectedDay: Int) {
        val maxDay = JalaliCalendar.monthLength(jy, jm)
        val days = (1..maxDay).map { JalaliCalendar.toPersianDigits(it) }
        suppressSpinnerEvents = true
        val dayAdapter = ArrayAdapter(
            requireContext(),
            android.R.layout.simple_spinner_dropdown_item,
            days
        )
        binding.spinnerJalaliDay.adapter = dayAdapter
        binding.spinnerJalaliDay.setSelection((selectedDay - 1).coerceIn(0, maxDay - 1))
        suppressSpinnerEvents = false
    }

    private fun syncDateWidgets() {
        val j = JalaliCalendar.isoToJalali(selectedDateISO)
        suppressSpinnerEvents = true
        val yearIndex = jalaliYears.indexOf(j.jy).coerceAtLeast(0)
        binding.spinnerJalaliYear.setSelection(yearIndex)
        binding.spinnerJalaliMonth.setSelection((j.jm - 1).coerceIn(0, 11))
        suppressSpinnerEvents = false
        refreshJalaliDaySpinner(j.jy, j.jm, j.jd)
        updateDatePreviewText()
    }

    private fun updateDatePreviewText() {
        if (editingTaskId == null && binding.cbRepeatAllWeek.isChecked) {
            val days = JalaliCalendar.getWeekDays(0, selectedDateISO)
            val (jalaliSpan, gregSpan) = JalaliCalendar.formatWeekSpan(days)
            binding.tvSelectedDatePreview.text = "کل هفته: $jalaliSpan  ($gregSpan)"
        } else {
            val j = JalaliCalendar.isoToJalali(selectedDateISO)
            val g = JalaliCalendar.parseISO(selectedDateISO)
            val weekday = JalaliCalendar.PERSIAN_WEEKDAYS[JalaliCalendar.getPersianWeekdayIndex(selectedDateISO)]
            binding.tvSelectedDatePreview.text =
                "$weekday · ${JalaliCalendar.formatJalaliLong(j)} / ${JalaliCalendar.formatGregorianShort(g)}"
        }
    }

    private fun syncTimeButton() {
        binding.btnPickTime.text = JalaliCalendar.toPersianDigits(selectedTime)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }

    companion object {
        private const val ARG_TASK_ID = "arg_task_id"
        private const val ARG_INITIAL_DATE = "arg_initial_date"

        fun newInstance(taskId: String? = null, initialDateISO: String? = null): TaskEditorBottomSheet {
            return TaskEditorBottomSheet().apply {
                arguments = Bundle().apply {
                    if (taskId != null) putString(ARG_TASK_ID, taskId)
                    if (initialDateISO != null) putString(ARG_INITIAL_DATE, initialDateISO)
                }
            }
        }
    }
}
