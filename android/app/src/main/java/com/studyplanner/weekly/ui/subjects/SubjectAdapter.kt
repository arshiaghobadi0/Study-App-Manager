package com.studyplanner.weekly.ui.subjects

import android.content.res.ColorStateList
import android.graphics.Color
import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.studyplanner.weekly.data.SubjectCategory
import com.studyplanner.weekly.databinding.ItemSubjectCardBinding
import com.studyplanner.weekly.util.JalaliCalendar

data class SubjectWithCount(
    val subject: SubjectCategory,
    val taskCount: Int
)

class SubjectAdapter(
    private val onEdit: (SubjectCategory) -> Unit,
    private val onDelete: (SubjectCategory) -> Unit
) : RecyclerView.Adapter<SubjectAdapter.ViewHolder>() {

    private var items: List<SubjectWithCount> = emptyList()

    fun submitList(newItems: List<SubjectWithCount>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemSubjectCardBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class ViewHolder(private val binding: ItemSubjectCardBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(item: SubjectWithCount) {
            binding.tvSubjectTitle.text = item.subject.name
            binding.tvSubjectCount.text = "${JalaliCalendar.toPersianDigits(item.taskCount)} تکلیف ثبت‌شده"
            val color = try {
                Color.parseColor(item.subject.colorHex)
            } catch (_: Throwable) {
                Color.parseColor("#0F766E")
            }
            binding.viewSubjectSwatch.backgroundTintList = ColorStateList.valueOf(color)
            binding.btnEditSubject.setOnClickListener { onEdit(item.subject) }
            binding.btnDeleteSubject.setOnClickListener { onDelete(item.subject) }
        }
    }
}
