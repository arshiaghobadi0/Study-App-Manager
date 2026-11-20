package com.studyplanner.weekly.ui.subjects

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.google.android.material.snackbar.Snackbar
import com.studyplanner.weekly.R
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.FragmentSubjectsBinding

class SubjectsFragment : Fragment() {

    private var _binding: FragmentSubjectsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()
    private lateinit var adapter: SubjectAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentSubjectsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        adapter = SubjectAdapter(
            onEdit = { subject ->
                SubjectEditorDialog.newInstance(subject.id, subject.name, subject.colorHex)
                    .show(parentFragmentManager, "SubjectEditorDialog")
            },
            onDelete = { subject ->
                val deleted = viewModel.deleteSubject(subject.id)
                if (!deleted) {
                    Snackbar.make(binding.root, R.string.error_last_subject, Snackbar.LENGTH_SHORT).show()
                }
            }
        )
        binding.rvSubjects.layoutManager = LinearLayoutManager(requireContext())
        binding.rvSubjects.adapter = adapter

        binding.fabAddSubject.setOnClickListener {
            SubjectEditorDialog.newInstance().show(parentFragmentManager, "SubjectEditorDialog")
        }

        viewModel.subjects.observe(viewLifecycleOwner) { renderSubjects() }
        viewModel.tasks.observe(viewLifecycleOwner) { renderSubjects() }
    }

    private fun renderSubjects() {
        val subjects = viewModel.subjects.value.orEmpty()
        val tasks = viewModel.tasks.value.orEmpty()
        val list = subjects.map { sub ->
            SubjectWithCount(sub, tasks.count { it.subjectId == sub.id })
        }
        adapter.submitList(list)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
