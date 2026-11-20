package com.studyplanner.weekly.ui.tools

import android.app.Dialog
import android.os.Bundle
import android.view.View
import android.widget.Toast
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.DeleteScope
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.DialogDeleteAllBinding
import com.studyplanner.weekly.util.JalaliCalendar

class DeleteAllDialog : DialogFragment() {

    private val viewModel: StudyViewModel by activityViewModels()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val binding = DialogDeleteAllBinding.inflate(layoutInflater)
        val allTasks = viewModel.tasks.value.orEmpty()
        val weekDates = viewModel.currentWeekDays().map { it.dateISO }.toSet()
        val weekCount = allTasks.count { weekDates.contains(it.dateISO) }
        val totalCount = allTasks.size

        binding.tvDeleteAllSummary.text =
            "آیا مطمئن هستید که می‌خواهید ${JalaliCalendar.toPersianDigits(totalCount)} تکلیف را حذف کنید؟"

        if (weekCount in 1 until totalCount) {
            binding.rgDeleteScope.visibility = View.VISIBLE
            binding.rbScopeAll.text =
                "${getString(R.string.delete_all_scope_all)} (${JalaliCalendar.toPersianDigits(totalCount)})"
            binding.rbScopeWeek.text =
                "${getString(R.string.delete_all_scope_week)} (${JalaliCalendar.toPersianDigits(weekCount)})"
        } else {
            binding.rgDeleteScope.visibility = View.GONE
        }

        return MaterialAlertDialogBuilder(requireContext())
            .setTitle(R.string.delete_all_confirm_title)
            .setView(binding.root)
            .setNegativeButton(R.string.btn_cancel, null)
            .setPositiveButton(R.string.delete_all_confirm_btn) { _, _ ->
                val scope = if (
                    binding.rgDeleteScope.visibility == View.VISIBLE &&
                    binding.rbScopeWeek.isChecked
                ) {
                    DeleteScope.CURRENT_WEEK
                } else {
                    DeleteScope.ALL
                }
                val permanent = binding.cbDeletePermanent.isChecked
                val removed = viewModel.deleteTasksByScope(scope, permanent)
                val countFa = JalaliCalendar.toPersianDigits(removed)
                val msg = if (permanent) {
                    "$countFa تکلیف به‌صورت دائمی حذف شد."
                } else {
                    "$countFa تکلیف به بخش «اخیراً حذف‌شده» منتقل شد."
                }
                Toast.makeText(requireContext(), msg, Toast.LENGTH_LONG).show()
            }
            .create()
    }
}
