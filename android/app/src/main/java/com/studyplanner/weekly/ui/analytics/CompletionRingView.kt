package com.studyplanner.weekly.ui.analytics

import android.content.Context
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.util.AttributeSet
import android.view.View
import androidx.core.content.ContextCompat
import com.studyplanner.weekly.R
import com.studyplanner.weekly.util.JalaliCalendar

class CompletionRingView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : View(context, attrs, defStyleAttr) {

    private var percentage: Int = 0

    private val trackPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 22f
        color = ContextCompat.getColor(context, R.color.chart_track)
    }

    private val progressPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.STROKE
        strokeWidth = 22f
        strokeCap = Paint.Cap.ROUND
        color = ContextCompat.getColor(context, R.color.chart_completed)
    }

    private val textPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = ContextCompat.getColor(context, R.color.text_primary)
        textSize = 42f
        textAlign = Paint.Align.CENTER
        typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
    }

    private val arcRect = RectF()

    fun setPercentage(percent: Int) {
        percentage = percent.coerceIn(0, 100)
        invalidate()
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val pad = 16f
        val size = minOf(width, height).toFloat()
        val left = (width - size) / 2f + pad
        val top = (height - size) / 2f + pad
        arcRect.set(left, top, left + size - pad * 2, top + size - pad * 2)

        canvas.drawOval(arcRect, trackPaint)
        val sweep = (percentage / 100f) * 360f
        canvas.drawArc(arcRect, -90f, sweep, false, progressPaint)

        val label = "${JalaliCalendar.toPersianDigits(percentage)}٪"
        val baseline = height / 2f - (textPaint.descent() + textPaint.ascent()) / 2f
        canvas.drawText(label, width / 2f, baseline, textPaint)
    }
}
