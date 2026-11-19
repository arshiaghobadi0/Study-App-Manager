package com.studyplanner.weekly

import android.content.ContentValues
import android.content.Context
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONObject
import java.io.File
import java.io.IOException

/**
 * Native Android WebView bridge that saves PDF and JSON exports into a dedicated
 * subfolder inside the public Downloads directory:
 *   Downloads/WeeklyStudyPlanner/
 *
 * - On Android 10+ (API 29+): uses MediaStore.Downloads with RELATIVE_PATH so no
 *   legacy storage permissions are required and the subfolder is created automatically
 *   in the user-visible Downloads directory.
 * - On Android 9 and below (API <= 28): writes into public Downloads/WeeklyStudyPlanner
 *   (falling back to app-external Downloads/WeeklyStudyPlanner if public storage is
 *   unavailable) and notifies MediaScanner so files appear immediately in Files apps.
 */
class AndroidDownloadsBridge(private val context: Context) {

  companion object {
    const val APP_DOWNLOAD_SUBFOLDER = "WeeklyStudyPlanner"
    const val DISPLAY_FOLDER_PATH = "Download/$APP_DOWNLOAD_SUBFOLDER"

    fun ensureLegacyFolderBestEffort() {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        try {
          @Suppress("DEPRECATION")
          val publicDownloads =
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
          val folder = File(publicDownloads, APP_DOWNLOAD_SUBFOLDER)
          if (!folder.exists()) {
            folder.mkdirs()
          }
        } catch (_: Throwable) {
          // Best-effort only; Android 10+ creates the subfolder via MediaStore on write.
        }
      }
    }

    private fun sanitizeFilename(raw: String, mimeType: String): String {
      val fallbackExt = if (mimeType.contains("pdf", ignoreCase = true)) ".pdf" else ".json"
      val fallbackName =
        if (fallbackExt == ".pdf") "study-planner-schedule.pdf" else "study-planner-backup.json"

      val cleaned = raw
        .trim()
        .replace(Regex("[^A-Za-z0-9._-]"), "_")
        .replace(Regex("\\.{2,}"), ".")
        .trimStart('.')

      if (cleaned.isEmpty()) {
        return fallbackName
      }
      return if (cleaned.endsWith(fallbackExt, ignoreCase = true)) {
        cleaned
      } else {
        "$cleaned$fallbackExt"
      }
    }
  }

  @JavascriptInterface
  fun getExportFolderPath(): String = DISPLAY_FOLDER_PATH

  @JavascriptInterface
  fun saveBase64File(filename: String, mimeType: String, base64Data: String): String {
    val safeMime = mimeType.ifBlank { "application/octet-stream" }
    val safeName = sanitizeFilename(filename, safeMime)

    return try {
      val bytes = Base64.decode(base64Data, Base64.DEFAULT)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        saveWithMediaStore(safeName, safeMime, bytes)
      } else {
        saveLegacyDownloads(safeName, safeMime, bytes)
      }
    } catch (e: Throwable) {
      JSONObject()
        .put("ok", false)
        .put("error", e.message ?: "Failed to save file to Downloads/$APP_DOWNLOAD_SUBFOLDER")
        .toString()
    }
  }

  private fun saveWithMediaStore(
    safeName: String,
    mimeType: String,
    bytes: ByteArray
  ): String {
    val resolver = context.contentResolver
    val relativePath = "${Environment.DIRECTORY_DOWNLOADS}/$APP_DOWNLOAD_SUBFOLDER"

    val values = ContentValues().apply {
      put(MediaStore.MediaColumns.DISPLAY_NAME, safeName)
      put(MediaStore.MediaColumns.MIME_TYPE, mimeType)
      put(MediaStore.MediaColumns.RELATIVE_PATH, relativePath)
      put(MediaStore.MediaColumns.IS_PENDING, 1)
    }

    val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
      ?: throw IOException("Unable to create MediaStore entry in $relativePath")

    try {
      val stream = resolver.openOutputStream(uri, "w")
        ?: throw IOException("Unable to open output stream for $safeName")
      stream.use { output ->
        output.write(bytes)
        output.flush()
      }

      val completedValues = ContentValues().apply {
        put(MediaStore.MediaColumns.IS_PENDING, 0)
      }
      resolver.update(uri, completedValues, null, null)

      return JSONObject()
        .put("ok", true)
        .put("folder", DISPLAY_FOLDER_PATH)
        .put("filename", safeName)
        .put("path", "$DISPLAY_FOLDER_PATH/$safeName")
        .put("uri", uri.toString())
        .toString()
    } catch (e: Throwable) {
      try {
        resolver.delete(uri, null, null)
      } catch (_: Throwable) {
        // Ignore cleanup failure
      }
      throw e
    }
  }

  private fun saveLegacyDownloads(
    safeName: String,
    mimeType: String,
    bytes: ByteArray
  ): String {
    @Suppress("DEPRECATION")
    val publicDownloads =
      Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
    val preferredDir = File(publicDownloads, APP_DOWNLOAD_SUBFOLDER)

    val targetDir = try {
      if (!preferredDir.exists()) {
        preferredDir.mkdirs()
      }
      if (preferredDir.exists() && preferredDir.canWrite()) {
        preferredDir
      } else {
        val fallbackBase =
          context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
        File(fallbackBase, APP_DOWNLOAD_SUBFOLDER).apply { mkdirs() }
      }
    } catch (_: Throwable) {
      val fallbackBase =
        context.getExternalFilesDir(Environment.DIRECTORY_DOWNLOADS) ?: context.filesDir
      File(fallbackBase, APP_DOWNLOAD_SUBFOLDER).apply { mkdirs() }
    }

    val targetFile = File(targetDir, safeName)
    targetFile.writeBytes(bytes)

    try {
      MediaScannerConnection.scanFile(
        context,
        arrayOf(targetFile.absolutePath),
        arrayOf(mimeType),
        null
      )
    } catch (_: Throwable) {
      // Non-fatal if media scan fails
    }

    val displayPath = if (targetDir == preferredDir) {
      "$DISPLAY_FOLDER_PATH/$safeName"
    } else {
      targetFile.absolutePath
    }

    return JSONObject()
      .put("ok", true)
      .put("folder", if (targetDir == preferredDir) DISPLAY_FOLDER_PATH else targetDir.absolutePath)
      .put("filename", safeName)
      .put("path", displayPath)
      .toString()
  }
}
