package com.studyplanner.weekly.ui.tools

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import com.google.android.material.snackbar.Snackbar
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.data.ThemePreference
import com.studyplanner.weekly.databinding.FragmentToolsBinding
import com.studyplanner.weekly.util.JalaliCalendar

class ToolsFragment : Fragment() {

    private var _binding: FragmentToolsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentToolsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.cardExportPdf.setOnClickListener {
            val result = viewModel.exportCurrentWeekPdf()
            val msg = if (result.ok) {
                "فایل PDF در ${result.displayPath} ذخیره شد."
            } else {
                result.error
            }
            Snackbar.make(binding.root, msg, Snackbar.LENGTH_LONG).show()
        }

        binding.cardExportJson.setOnClickListener {
            val result = viewModel.exportJsonBackup()
            val msg = if (result.ok) {
                "پشتیبان JSON در ${result.displayPath} ذخیره شد."
            } else {
                result.error
            }
            Snackbar.make(binding.root, msg, Snackbar.LENGTH_LONG).show()
        }

        binding.cardImportJson.setOnClickListener {
            ImportJsonBottomSheet().show(parentFragmentManager, "ImportJsonBottomSheet")
        }

        binding.cardTrash.setOnClickListener {
            TrashBottomSheet().show(parentFragmentManager, "TrashBottomSheet")
        }

        binding.cardDeleteAll.setOnClickListener {
            if (viewModel.tasks.value.orEmpty().isEmpty()) {
                Snackbar.make(binding.root, "تکلیفی برای حذف وجود ندارد.", Snackbar.LENGTH_SHORT).show()
            } else {
                DeleteAllDialog().show(parentFragmentManager, "DeleteAllDialog")
            }
        }

        val currentTheme = viewModel.theme.value ?: ThemePreference.SYSTEM
        val checkedThemeId = when (currentTheme) {
            ThemePreference.LIGHT -> R.id.btnThemeLight
            ThemePreference.DARK -> R.id.btnThemeDark
            ThemePreference.SYSTEM -> R.id.btnThemeSystem
        }
        binding.toggleTheme.check(checkedThemeId)

        binding.toggleTheme.addOnButtonCheckedListener { _, checkedId, isChecked ->
            if (!isChecked) return@addOnButtonCheckedListener
            val pref = when (checkedId) {
                R.id.btnThemeLight -> ThemePreference.LIGHT
                R.id.btnThemeDark -> ThemePreference.DARK
                else -> ThemePreference.SYSTEM
            }
            if (pref != viewModel.theme.value) {
                viewModel.setTheme(pref)
            }
        }

        viewModel.trashTasks.observe(viewLifecycleOwner) { trash ->
            binding.tvTrashCountSub.text =
                "${JalaliCalendar.toPersianDigits(trash.size)} مورد در سطل بازیافت — لمس برای بازیابی یا حذف دائمی"
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
