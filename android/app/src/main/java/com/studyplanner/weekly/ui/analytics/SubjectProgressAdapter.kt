package com.studyplanner.weekly.ui.analytics

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.studyplanner.weekly.databinding.ItemSubjectProgressBinding
import com.studyplanner.weekly.util.JalaliCalendar
import com.studyplanner.weekly.util.SubjectProgressItem

class SubjectProgressAdapter : RecyclerView.Adapter<SubjectProgressAdapter.ViewHolder>() {

    private var items: List<SubjectProgressItem> = emptyList()

    fun submitList(newItems: List<SubjectProgressItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemSubjectProgressBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    class ViewHolder(private val binding: ItemSubjectProgressBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: SubjectProgressItem) {
            binding.tvSubjectName.text = item.subject.name
            binding.tvSubjectRatio.text =
                "${JalaliCalendar.toPersianDigits(item.completed)} از ${JalaliCalendar.toPersianDigits(item.total)} (${JalaliCalendar.toPersianDigits(item.percentage)}٪)"
            binding.progressSubject.progress = item.percentage

            val color = try {
                Color.parseColor(item.subject.colorHex)
            } catch (_: Throwable) {
                Color.parseColor("#0F766E")
            }
            binding.viewSubjectColor.backgroundTintList = ColorStateList.valueOf(color)
            binding.progressSubject.setIndicatorColor(color)
        }
    }
}
