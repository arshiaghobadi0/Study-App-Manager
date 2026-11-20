package com.studyplanner.weekly.ui.tools

import android.net.Uri
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.activity.result.contract.ActivityResultContracts
import androidx.fragment.app.activityViewModels
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.studyplanner.weekly.data.ImportMode
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.BottomSheetImportJsonBinding

class ImportJsonBottomSheet : BottomSheetDialogFragment() {

    private var _binding: BottomSheetImportJsonBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()

    private val openJsonFileLauncher =
        registerForActivityResult(ActivityResultContracts.OpenDocument()) { uri: Uri? ->
            if (uri == null) return@registerForActivityResult
            try {
                val content = requireContext().contentResolver.openInputStream(uri)
                    ?.bufferedReader(Charsets.UTF_8)
                    ?.use { it.readText() }
                    .orEmpty()
                binding.etJsonInput.setText(content)
                binding.tvImportError.visibility = View.GONE
            } catch (t: Throwable) {
                binding.tvImportError.text = "خطا در خواندن فایل: ${t.message}"
                binding.tvImportError.visibility = View.VISIBLE
            }
        }

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = BottomSheetImportJsonBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnPickJsonFile.setOnClickListener {
            openJsonFileLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
        }

        binding.btnCancelImport.setOnClickListener { dismiss() }

        binding.btnApplyImport.setOnClickListener {
            val raw = binding.etJsonInput.text?.toString().orEmpty()
            val mode = if (binding.rbImportReplace.isChecked) ImportMode.REPLACE else ImportMode.MERGE
            val (ok, message) = viewModel.importBackupJson(raw, mode)
            if (ok) {
                Toast.makeText(requireContext(), message, Toast.LENGTH_LONG).show()
                dismiss()
            } else {
                binding.tvImportError.text = message
                binding.tvImportError.visibility = View.VISIBLE
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
