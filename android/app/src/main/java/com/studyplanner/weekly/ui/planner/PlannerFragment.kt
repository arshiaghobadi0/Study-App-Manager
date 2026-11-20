package com.studyplanner.weekly.ui.planner

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.widget.doAfterTextChanged
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.StatusFilter
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.FragmentPlannerBinding
import com.studyplanner.weekly.ui.tools.DeleteAllDialog
import com.studyplanner.weekly.ui.tools.TrashBottomSheet
import com.studyplanner.weekly.util.JalaliCalendar

class PlannerFragment : Fragment() {

    private var _binding: FragmentPlannerBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()

    private lateinit var dayStripAdapter: DayStripAdapter
    private lateinit var taskAdapter: TaskAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentPlannerBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        dayStripAdapter = DayStripAdapter { chosenDate ->
            viewModel.selectDate(chosenDate)
        }
        binding.rvDayStrip.layoutManager =
            LinearLayoutManager(requireContext(), LinearLayoutManager.HORIZONTAL, false)
        binding.rvDayStrip.adapter = dayStripAdapter

        taskAdapter = TaskAdapter(
            onToggleComplete = { viewModel.toggleCompleted(it.id) },
            onToggleReminder = { viewModel.toggleReminder(it.id) },
            onEdit = { task ->
                TaskEditorBottomSheet.newInstance(taskId = task.id)
                    .show(parentFragmentManager, "TaskEditorBottomSheet")
            },
            onDelete = { task ->
                val deleted = viewModel.softDeleteTask(task.id)
                if (deleted != null) {
                    Snackbar.make(
                        binding.root,
                        "تکلیف «${deleted.title}» به اخیراً حذف‌شده منتقل شد",
                        Snackbar.LENGTH_LONG
                    ).setAction(R.string.action_undo) {
                        viewModel.restoreTaskFromTrash(deleted.id)
                    }.show()
                }
            }
        )
        binding.rvTasks.layoutManager = LinearLayoutManager(requireContext())
        binding.rvTasks.adapter = taskAdapter

        binding.plannerToolbar.setOnMenuItemClickListener { item ->
            when (item.itemId) {
                R.id.action_trash -> {
                    TrashBottomSheet().show(parentFragmentManager, "TrashBottomSheet")
                    true
                }
                R.id.action_delete_all -> {
                    if (viewModel.tasks.value.orEmpty().isEmpty()) {
                        Snackbar.make(binding.root, "تکلیفی برای حذف وجود ندارد.", Snackbar.LENGTH_SHORT).show()
                    } else {
                        DeleteAllDialog().show(parentFragmentManager, "DeleteAllDialog")
                    }
                    true
                }
                else -> false
            }
        }

        binding.btnPrevWeek.setOnClickListener { viewModel.shiftWeek(-1) }
        binding.btnNextWeek.setOnClickListener { viewModel.shiftWeek(1) }
        binding.btnCurrentWeek.setOnClickListener { viewModel.jumpToCurrentWeek() }

        binding.etSearch.doAfterTextChanged { text ->
            viewModel.setSearchQuery(text?.toString().orEmpty())
        }

        binding.chipGroupFilter.setOnCheckedStateChangeListener { _, checkedIds ->
            val filter = when (checkedIds.firstOrNull()) {
                R.id.chipFilterPending -> StatusFilter.PENDING
                R.id.chipFilterCompleted -> StatusFilter.COMPLETED
                R.id.chipFilterHigh -> StatusFilter.HIGH_PRIORITY
                else -> StatusFilter.ALL
            }
            viewModel.setStatusFilter(filter)
        }

        binding.fabAddTask.setOnClickListener {
            val defaultDate = viewModel.selectedDateISO.value ?: JalaliCalendar.todayISO()
            TaskEditorBottomSheet.newInstance(initialDateISO = defaultDate)
                .show(parentFragmentManager, "TaskEditorBottomSheet")
        }

        observeState()
    }

    private fun observeState() {
        viewModel.subjects.observe(viewLifecycleOwner) { subjects ->
            taskAdapter.setSubjects(subjects)
            renderPlanner()
        }
        viewModel.tasks.observe(viewLifecycleOwner) { renderPlanner() }
        viewModel.weekOffset.observe(viewLifecycleOwner) { renderPlanner() }
        viewModel.selectedDateISO.observe(viewLifecycleOwner) { renderPlanner() }
        viewModel.statusFilter.observe(viewLifecycleOwner) { renderPlanner() }
        viewModel.searchQuery.observe(viewLifecycleOwner) { renderPlanner() }
    }

    private fun renderPlanner() {
        val weekDays = viewModel.currentWeekDays()
        val (jalaliSpan, gregSpan) = JalaliCalendar.formatWeekSpan(weekDays)
        binding.tvWeekJalaliSpan.text = jalaliSpan
        binding.tvWeekGregorianSpan.text = gregSpan

        val allTasks = viewModel.tasks.value.orEmpty()
        val weekDateSet = weekDays.map { it.dateISO }.toSet()
        val weekTasks = allTasks.filter { weekDateSet.contains(it.dateISO) }
        val completedCount = weekTasks.count { it.completed }
        val remainingCount = weekTasks.size - completedCount

        binding.tvWeekSummaryCounts.text =
            "کل هفته: ${JalaliCalendar.toPersianDigits(weekTasks.size)}  ·  " +
                "تکمیل‌شده: ${JalaliCalendar.toPersianDigits(completedCount)}  ·  " +
                "باقی‌مانده: ${JalaliCalendar.toPersianDigits(remainingCount)}"

        val todayISO = JalaliCalendar.todayISO()
        val selectedDate = viewModel.selectedDateISO.value

        val chips = mutableListOf<DayChipItem>()
        chips.add(
            DayChipItem(
                dateISO = null,
                topLabel = getString(R.string.all_week_chip),
                numberLabel = "۷",
                taskCount = weekTasks.size,
                isToday = false,
                isSelected = selectedDate == null
            )
        )
        for (day in weekDays) {
            val dayCount = weekTasks.count { it.dateISO == day.dateISO }
            chips.add(
                DayChipItem(
                    dateISO = day.dateISO,
                    topLabel = day.persianWeekday,
                    numberLabel = JalaliCalendar.toPersianDigits(day.jalali.jd),
                    taskCount = dayCount,
                    isToday = day.dateISO == todayISO,
                    isSelected = selectedDate == day.dateISO
                )
            )
        }
        dayStripAdapter.submitList(chips)

        val filtered = viewModel.filteredWeekTasks()
        taskAdapter.submitList(filtered)
        binding.emptyTasksContainer.visibility = if (filtered.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
