package com.studyplanner.weekly.ui.analytics

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.fragment.app.Fragment
import androidx.fragment.app.activityViewModels
import androidx.recyclerview.widget.LinearLayoutManager
import com.studyplanner.weekly.data.StudyViewModel
import com.studyplanner.weekly.databinding.FragmentAnalyticsBinding
import com.studyplanner.weekly.util.JalaliCalendar

class AnalyticsFragment : Fragment() {

    private var _binding: FragmentAnalyticsBinding? = null
    private val binding get() = _binding!!

    private val viewModel: StudyViewModel by activityViewModels()
    private lateinit var subjectProgressAdapter: SubjectProgressAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentAnalyticsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        subjectProgressAdapter = SubjectProgressAdapter()
        binding.rvSubjectProgress.layoutManager = LinearLayoutManager(requireContext())
        binding.rvSubjectProgress.adapter = subjectProgressAdapter

        viewModel.tasks.observe(viewLifecycleOwner) { renderAnalytics() }
        viewModel.subjects.observe(viewLifecycleOwner) { renderAnalytics() }
        viewModel.weekOffset.observe(viewLifecycleOwner) { renderAnalytics() }
    }

    private fun renderAnalytics() {
        val weekDays = viewModel.currentWeekDays()
        val (jalaliSpan, _) = JalaliCalendar.formatWeekSpan(weekDays)
        val stats = viewModel.weeklyAnalytics()

        binding.tvAnalyticsWeekSpan.text = jalaliSpan
        binding.tvAnalyticsCounts.text =
            "تکمیل‌شده: ${JalaliCalendar.toPersianDigits(stats.completed)}  ·  " +
                "باقی‌مانده: ${JalaliCalendar.toPersianDigits(stats.pending)}  ·  " +
                "کل: ${JalaliCalendar.toPersianDigits(stats.total)}"

        binding.completionRingView.setPercentage(stats.completionPercent)
        binding.weeklyBarChartView.setData(stats.dailyPoints)

        subjectProgressAdapter.submitList(stats.subjectProgress)
        binding.tvAnalyticsEmpty.visibility =
            if (stats.subjectProgress.isEmpty()) View.VISIBLE else View.GONE
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
