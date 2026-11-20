package com.studyplanner.weekly.ui.analytics

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.studyplanner.weekly.R
import com.studyplanner.weekly.util.DayBarPoint
import com.studyplanner.weekly.util.JalaliCalendar

class WeeklyBarChartView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var points: List<DayBarPoint> = emptyList()

    private val completedPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.chart_completed)
    }

    private val pendingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.chart_pending)
    }

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.chart_track)
    }

    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_secondary)
        textSize = 30f
        textAlign = Paint.Align.CENTER
    }

    private val countPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_muted)
        textSize = 26f
        textAlign = Paint.Align.CENTER
    }

    private val barRect = RectF()

    fun setData(data: List<DayBarPoint>) {
        points = data
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        if (points.isEmpty()) return

        val topSpace = 36f
        val bottomSpace = 44f
        val chartHeight = (height - topSpace - bottomSpace).coerceAtLeast(40f)
        val colWidth = width.toFloat() / points.size
        val barWidth = (colWidth * 0.42f).coerceAtMost(48f)
        val maxTotal = points.maxOf { it.completed + it.pending }.coerceAtLeast(1)

        // Draw RTL: Saturday on the right, Friday on the left
        points.forEachIndexed { idx, point ->
            val rtlIdx = points.size - 1 - idx
            val centerX = rtlIdx * colWidth + colWidth / 2f
            val left = centerX - barWidth / 2f
            val right = centerX + barWidth / 2f
            val bottom = topSpace + chartHeight

            // Subtle background track
            barRect.set(left, topSpace, right, bottom)
            canvas.drawRoundRect(barRect, 12f, 12f, trackPaint)

            val total = point.completed + point.pending
            if (total > 0) {
                val totalHeight = (total.toFloat() / maxTotal) * chartHeight
                val doneHeight = (point.completed.toFloat() / maxTotal) * chartHeight
                val pendingTop = bottom - totalHeight

                if (point.pending > 0) {
                    barRect.set(left, pendingTop, right, bottom - doneHeight)
                    canvas.drawRoundRect(barRect, 12f, 12f, pendingPaint)
                }
                if (point.completed > 0) {
                    barRect.set(left, bottom - doneHeight, right, bottom)
                    canvas.drawRoundRect(barRect, 12f, 12f, completedPaint)
                }

                canvas.drawText(
                    JalaliCalendar.toPersianDigits(total),
                    centerX,
                    (pendingTop - 10f).coerceAtLeast(24f),
                    countPaint
                )
            }

            canvas.drawText(point.weekdayShort, centerX, height - 10f, labelPaint)
        }
    }
}
