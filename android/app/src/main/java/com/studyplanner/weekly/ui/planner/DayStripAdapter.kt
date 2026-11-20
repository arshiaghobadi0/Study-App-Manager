package com.studyplanner.weekly.ui.planner

import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import androidx.core.content.ContextCompat
import androidx.recyclerview.widget.RecyclerView
import com.studyplanner.weekly.R
import com.studyplanner.weekly.databinding.ItemDayChipBinding
import com.studyplanner.weekly.util.JalaliCalendar

data class DayChipItem(
    val dateISO: String?, // null = All Week
    val topLabel: String,
    val numberLabel: String,
    val taskCount: Int,
    val isToday: Boolean,
    val isSelected: Boolean
)

class DayStripAdapter(
    private val onSelect: (String?) -> Unit
) : RecyclerView.Adapter<DayStripAdapter.DayChipViewHolder>() {

    private var items: List<DayChipItem> = emptyList()

    fun submitList(newItems: List<DayChipItem>) {
        items = newItems
        notifyDataSetChanged()
    }

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): DayChipViewHolder {
        val binding = ItemDayChipBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return DayChipViewHolder(binding)
    }

    override fun onBindViewHolder(holder: DayChipViewHolder, position: Int) {
        holder.bind(items[position])
    }

    override fun getItemCount(): Int = items.size

    inner class DayChipViewHolder(
        private val binding: ItemDayChipBinding
    ) : RecyclerView.ViewHolder(binding.root) {

        fun bind(item: DayChipItem) {
            val ctx = binding.root.context
            binding.tvDayName.text = item.topLabel
            binding.tvDayNumber.text = item.numberLabel
            binding.tvDayTaskCount.text = JalaliCalendar.toPersianDigits(item.taskCount)
            binding.viewTodayDot.visibility = if (item.isToday) View.VISIBLE else View.INVISIBLE

            if (item.isSelected) {
                binding.cardDayChip.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.brand_primary))
                binding.cardDayChip.strokeColor = ContextCompat.getColor(ctx, R.color.brand_primary)
                binding.tvDayName.setTextColor(ContextCompat.getColor(ctx, R.color.brand_on_primary))
                binding.tvDayNumber.setTextColor(ContextCompat.getColor(ctx, R.color.brand_on_primary))
                binding.tvDayTaskCount.setTextColor(ContextCompat.getColor(ctx, R.color.brand_primary_dark))
            } else {
                binding.cardDayChip.setCardBackgroundColor(ContextCompat.getColor(ctx, R.color.surface_card))
                binding.cardDayChip.strokeColor = ContextCompat.getColor(
                    ctx,
                    if (item.isToday) R.color.brand_secondary else R.color.surface_stroke
                )
                binding.tvDayName.setTextColor(ContextCompat.getColor(ctx, R.color.text_secondary))
                binding.tvDayNumber.setTextColor(ContextCompat.getColor(ctx, R.color.text_primary))
                binding.tvDayTaskCount.setTextColor(ContextCompat.getColor(ctx, R.color.text_secondary))
            }

            binding.cardDayChip.setOnClickListener {
                onSelect(item.dateISO)
            }
        }
    }
}
