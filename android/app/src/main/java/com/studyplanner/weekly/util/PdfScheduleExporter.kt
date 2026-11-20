package com.studyplanner.weekly.util

import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import android.graphics.Typeface
import android.graphics.pdf.PdfDocument
import com.studyplanner.weekly.data.StudyTask
import com.studyplanner.weekly.data.SubjectCategory
import java.io.ByteArrayOutputStream

/**
 * Generates a crisp multi-page RTL A4 PDF of the weekly study plan using
 * Android's native PdfDocument API and saves it directly to Download/WeeklyStudyPlanner.
 */
object PdfScheduleExporter {

    private const val PAGE_WIDTH = 595 // A4 width in PostScript points (72 dpi)
    private const val PAGE_HEIGHT = 842 // A4 height in PostScript points
    private const val MARGIN = 36f

    fun exportWeekPdf(
        context: Context,
        weekDays: List<WeekDayInfo>,
        tasks: List<StudyTask>,
        subjects: List<SubjectCategory>
    ): ExportResult {
        val doc = PdfDocument()
        val subjectMap = subjects.associateBy { it.id }
        val (jalaliSpan, gregorianSpan) = JalaliCalendar.formatWeekSpan(weekDays)
        val firstDate = weekDays.firstOrNull()?.dateISO ?: JalaliCalendar.todayISO()
        val filename = "study-schedule-$firstDate.pdf"

        val headerBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#0F766E") }
        val titlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            textSize = 18f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.RIGHT
        }
        val subtitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#CCFBF1")
            textSize = 11f
            textAlign = Paint.Align.RIGHT
        }
        val dayHeaderBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.parseColor("#EDF3F2") }
        val dayTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#0F172A")
            textSize = 12.5f
            typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
            textAlign = Paint.Align.RIGHT
        }
        val dayDatePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#475569")
            textSize = 10f
            textAlign = Paint.Align.LEFT
        }
        val taskTitlePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#0F172A")
            textSize = 11.5f
            textAlign = Paint.Align.RIGHT
        }
        val taskDonePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#64748B")
            textSize = 11.5f
            isStrikeThruText = true
            textAlign = Paint.Align.RIGHT
        }
        val taskMetaPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#475569")
            textSize = 9.5f
            textAlign = Paint.Align.RIGHT
        }
        val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#DCE5E3")
            strokeWidth = 1f
        }

        var pageNumber = 1
        var page = doc.startPage(PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create())
        var canvas: Canvas = page.canvas
        var y = MARGIN

        fun drawBanner(c: Canvas) {
            val bannerRect = RectF(MARGIN, MARGIN, PAGE_WIDTH - MARGIN, MARGIN + 68f)
            c.drawRoundRect(bannerRect, 12f, 12f, headerBgPaint)
            c.drawText("برنامه درسی هفتگی", PAGE_WIDTH - MARGIN - 16f, MARGIN + 28f, titlePaint)
            c.drawText(
                "$jalaliSpan  |  $gregorianSpan",
                PAGE_WIDTH - MARGIN - 16f,
                MARGIN + 50f,
                subtitlePaint
            )
        }

        drawBanner(canvas)
        y = MARGIN + 86f

        fun ensureSpace(neededHeight: Float) {
            if (y + neededHeight > PAGE_HEIGHT - MARGIN) {
                doc.finishPage(page)
                pageNumber += 1
                page = doc.startPage(PdfDocument.PageInfo.Builder(PAGE_WIDTH, PAGE_HEIGHT, pageNumber).create())
                canvas = page.canvas
                y = MARGIN
            }
        }

        for (day in weekDays) {
            val dayTasks = tasks.filter { it.dateISO == day.dateISO }
            ensureSpace(56f)

            val headerRect = RectF(MARGIN, y, PAGE_WIDTH - MARGIN, y + 26f)
            canvas.drawRoundRect(headerRect, 6f, 6f, dayHeaderBgPaint)
            canvas.drawText(
                "${day.persianWeekday} — ${day.jalaliLong}",
                PAGE_WIDTH - MARGIN - 10f,
                y + 17f,
                dayTitlePaint
            )
            canvas.drawText(
                day.gregorianShort,
                MARGIN + 10f,
                y + 17f,
                dayDatePaint
            )
            y += 34f

            if (dayTasks.isEmpty()) {
                canvas.drawText(
                    "تکلیفی برای این روز ثبت نشده است.",
                    PAGE_WIDTH - MARGIN - 10f,
                    y + 10f,
                    taskMetaPaint
                )
                y += 24f
            } else {
                for (task in dayTasks) {
                    val hasNotes = task.notes.isNotBlank()
                    val rowHeight = if (hasNotes) 44f else 32f
                    ensureSpace(rowHeight + 6f)

                    val checkboxMark = if (task.completed) "☑" else "☐"
                    val titleStr = "$checkboxMark  ${task.title}"
                    canvas.drawText(
                        titleStr,
                        PAGE_WIDTH - MARGIN - 10f,
                        y + 12f,
                        if (task.completed) taskDonePaint else taskTitlePaint
                    )

                    val subjectName = subjectMap[task.subjectId]?.name ?: "عمومی"
                    val reminderPart = if (task.reminderEnabled) {
                        " · یادآور ${JalaliCalendar.toPersianDigits(task.reminderTime)}"
                    } else {
                        ""
                    }
                    canvas.drawText(
                        "$subjectName · ${task.priority.labelFa}$reminderPart",
                        PAGE_WIDTH - MARGIN - 14f,
                        y + 25f,
                        taskMetaPaint
                    )

                    if (hasNotes) {
                        canvas.drawText(
                            task.notes.take(90),
                            PAGE_WIDTH - MARGIN - 14f,
                            y + 37f,
                            taskMetaPaint
                        )
                    }

                    y += rowHeight
                    canvas.drawLine(MARGIN + 8f, y, PAGE_WIDTH - MARGIN - 8f, y, linePaint)
                    y += 8f
                }
            }
            y += 6f
        }

        doc.finishPage(page)

        val output = ByteArrayOutputStream()
        return try {
            doc.writeTo(output)
            doc.close()
            DownloadsExporter.saveBytes(
                context = context,
                filename = filename,
                mimeType = "application/pdf",
                bytes = output.toByteArray()
            )
        } catch (t: Throwable) {
            doc.close()
            ExportResult(ok = false, error = t.message ?: "خطا در ساخت فایل PDF")
        }
    }
}
