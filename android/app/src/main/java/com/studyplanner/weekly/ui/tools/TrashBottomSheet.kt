package com.studyplanner.weekly.ui.tools

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.bottomsheet.BottomSheetDialogFragment
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.BottomSheetTrashBinding

class TrashBottomSheet : BottomSheetDialogFragment() {

    private var _binding: BottomSheetTrashBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()
    private lateinit var adapter: TrashAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = BottomSheetTrashBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = TrashAdapter(
            onRestore = { viewModel.restoreTaskFromTrash(it.id) },
            onDeleteForever = { viewModel.deleteForeverFromTrash(it.id) }
        )
        binding.rvTrashTasks.layoutManager = LinearLayoutManager(requireContext())
        binding.rvTrashTasks.adapter = adapter

        binding.btnRestoreAllTrash.setOnClickListener { viewModel.restoreAllFromTrash() }
        binding.btnEmptyTrash.setOnClickListener { viewModel.emptyTrash() }

        viewModel.trashTasks.observe(viewLifecycleOwner) { items ->
            adapter.submitList(items)
            val isEmpty = items.isEmpty()
            binding.tvTrashEmpty.visibility = if (isEmpty) View.VISIBLE else View.GONE
            binding.rvTrashTasks.visibility = if (isEmpty) View.GONE else View.VISIBLE
            binding.btnRestoreAllTrash.isEnabled = !isEmpty
            binding.btnEmptyTrash.isEnabled = !isEmpty
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
