package com.studyplanner.weekly.util

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import java.io.File
import java.io.IOException

data class ExportResult(
    val ok: Boolean,
    val displayPath: String = "",
    val error: String = ""
)

/**
 * Saves PDF and JSON exports into a dedicated public subfolder:
 *   Download/WeeklyStudyPlanner/
 */
object DownloadsExporter {

    const val SUBFOLDER = "WeeklyStudyPlanner"
    const val DISPLAY_FOLDER = "Download/$SUBFOLDER"

    fun sanitizeFilename(raw: String, expectedExtension: String): String {
        val ext = if (expectedExtension.startsWith(".")) expectedExtension else ".$expectedExtension"
        val cleaned = raw.trim()
            .replace(Regex("[^A-Za-z0-9._-]"), "_")
            .replace(Regex("\\.{2,}"), ".")
            .trimStart('.')
        if (cleaned.isEmpty()) return "study-planner-export$ext"
        return if (cleaned.endsWith(ext, ignoreCase = true)) cleaned else "$cleaned$ext"
    }

    fun saveBytes(
        context: Context,
        filename: String,
        mimeType: String,
        bytes: ByteArray
    ): ExportResult {
        val ext = if (mimeType.contains("pdf", ignoreCase = true)) ".pdf" else ".json"
        val safeName = sanitizeFilename(filename, ext)
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                saveMediaStore(context, safeName, mimeType, bytes)
            } else {
                saveLegacy(context, safeName, mimeType, bytes)
            }
        } catch (t: Throwable) {
            ExportResult(ok = false, error = t.message ?: "خطا در ذخیره فایل در $DISPLAY_FOLDER")
        }
    }

    private fun saveMediaStore(
        context: Context,
        safeName: String,
        mimeType: String,
        bytes: ByteArray
    ): ExportResult {
        val resolver = context.contentResolver
        val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/$SUBFOLDER"
        val values = ContentValues().apply {
            put(MediaStore.MediaColumns.DISPLAY_NAME, safeName)
            put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
            put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
            put(MediaStore.MediaColumns.IS_PENDING, 1)
        }

        val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IOException("امکان ایجاد فایل در $relativePath وجود ندارد")

        try {
            val stream = resolver.openOutputStream(uri, "w")
                ?: throw IOException("امکان باز کردن جریان خروجی برای $safeName وجود ندارد")
            stream.use { out ->
                out.write(bytes)
                out.flush()
            }
            val doneValues = ContentValues().apply {
                put(MediaStore.MediaColumns.IS_PENDING, 0)
            }
            resolver.update(uri, doneValues, null, null)
            return ExportResult(ok = true, displayPath = "$DISPLAY_FOLDER/$safeName")
        } catch (t: Throwable) {
            try {
                resolver.delete(uri, null, null)
            } catch (_: Throwable) {
            }
            throw t
        }
    }

    private fun saveLegacy(
        context: Context,
        safeName: String,
        mimeType: String,
        bytes: ByteArray
    ): ExportResult {
        @Suppress("DEPRECATION")
        val publicDownloads =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
        val preferred = File(publicDownloads, SUBFOLDER)

        val targetDir = try {
            if (!preferred.exists()) preferred.mkdirs()
            if (preferred.exists() && preferred.canWrite()) {
                preferred
            } else {
                val fallback =
                    context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
                File(fallback, SUBFOLDER).apply { mkdirs() }
            }
        } catch (_: Throwable) {
            val fallback =
                context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
            File(fallback, SUBFOLDER).apply { mkdirs() }
        }

        val file = File(targetDir, safeName)
        file.writeBytes(bytes)
        try {
            MediaScannerConnection.scanFile(context, arrayOf(file.absolutePath), arrayOf(mimeType), null)
        } catch (_: Throwable) {
        }

        val display = if (targetDir == preferred) "$DISPLAY_FOLDER/$safeName" else file.absolutePath
        return ExportResult(ok = true, displayPath = display)
    }
}
