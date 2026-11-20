package com.studyplanner.weekly.ui.subjects

import android.app.Dialog
import android.content.DialogInterface
import android.content.res.ColorStateList
import android.graphics.Color
import android.os.Bundle
import android.view.View
import android.widget.LinearLayout
import androidx.fragment.app.DialogFragment
import androidx.fragment.app.activityViewModels
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.DefaultStudySeed
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.DialogSubjectEditorBinding

class SubjectEditorDialog : DialogFragment() {

    private val viewModel: StudyViewModel by activityViewModels()
    private var selectedColor: String = DefaultStudySeed.SUBJECT_SWATCHES.first()

    override fun onCreateDialog(savedInstanceState: Bundle?): Dialog {
        val binding = DialogSubjectEditorBinding.inflate(layoutInflater)
        val editId = arguments?.getString(ARG_ID)
        val editName = arguments?.getString(ARG_NAME).orEmpty()
        selectedColor = arguments?.getString(ARG_COLOR) ?: DefaultStudySeed.SUBJECT_SWATCHES.first()

        binding.etSubjectName.setText(editName)
        renderSwatches(binding)

        val dialog = MaterialAlertDialogBuilder(requireContext())
            .setTitle(if (editId == null) R.string.subject_editor_add_title else R.string.subject_editor_edit_title)
            .setView(binding.root)
            .setNegativeButton(R.string.btn_cancel, null)
            .setPositiveButton(if (editId == null) R.string.btn_save_task else R.string.btn_save_changes, null)
            .create()

        dialog.setOnShowListener {
            dialog.getButton(DialogInterface.BUTTON_POSITIVE).setOnClickListener {
                val name = binding.etSubjectName.text?.toString()?.trim().orEmpty()
                if (name.isEmpty()) {
                    binding.tilSubjectName.error = getString(R.string.error_subject_name)
                    return@setOnClickListener
                }
                viewModel.upsertSubject(editId, name, selectedColor)
                dialog.dismiss()
            }
        }
        return dialog
    }

    private fun renderSwatches(binding: DialogSubjectEditorBinding) {
        binding.colorSwatchRow.removeAllViews()
        val density = resources.displayMetrics.density
        val sizePx = (30 * density).toInt()
        val marginPx = (6 * density).toInt()

        for (hex in DefaultStudySeed.SUBJECT_SWATCHES) {
            val dot = View(requireContext()).apply {
                layoutParams = LinearLayout.LayoutParams(sizePx, sizePx).apply {
                    marginEnd = marginPx
                }
                setBackgroundResource(R.drawable.bg_subject_dot)
                backgroundTintList = ColorStateList.valueOf(Color.parseColor(hex))
                alpha = if (hex.equals(selectedColor, ignoreCase = true)) 1.0f else 0.4f
                scaleX = if (hex.equals(selectedColor, ignoreCase = true)) 1.15f else 1.0f
                scaleY = if (hex.equals(selectedColor, ignoreCase = true)) 1.15f else 1.0f
                setOnClickListener {
                    selectedColor = hex
                    renderSwatches(binding)
                }
            }
            binding.colorSwatchRow.addView(dot)
        }
    }

    companion object {
        private const val ARG_ID = "arg_id"
        private const val ARG_NAME = "arg_name"
        private const val ARG_COLOR = "arg_color"

        fun newInstance(id: String? = null, name: String? = null, color: String? = null): SubjectEditorDialog {
            return SubjectEditorDialog().apply {
                arguments = Bundle().apply {
                    if (id != null) putString(ARG_ID, id)
                    if (name != null) putString(ARG_NAME, name)
                    if (color != null) putString(ARG_COLOR, color)
                }
            }
        }
    }
}
