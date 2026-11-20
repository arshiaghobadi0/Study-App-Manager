package com.studyplanner.weekly.ui.tools

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.RecyclerView
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.databinding.ItemTrashTaskBinding
import com.studyplanner.weekly.util.JalaliCalendar

class TrashAdapter(
    private val onRestore: (StudyTask) -> Unit,
    private val onDeleteForever: (StudyTask) -> Unit
) : RecyclerView.Adapter<TrashAdapter.ViewHolder>() {

    private var items: List<StudyTask> = emptyList()

    fun submitList(newItems: List<StudyTask>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemTrashTaskBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class ViewHolder(private val binding: ItemTrashTaskBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(task: StudyTask) {
            binding.tvTrashTitle.text = task.title
            val jalali = JalaliCalendar.formatJalaliLong(JalaliCalendar.isoToJalali(task.dateISO))
            binding.tvTrashMeta.text = "$jalali · ${task.priority.labelFa}"
            binding.btnRestoreItem.setOnClickListener { onRestore(task) }
            binding.btnDeleteForever.setOnClickListener { onDeleteForever(task) }
        }
    }
}
