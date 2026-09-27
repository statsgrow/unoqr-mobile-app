package com.statsgrow.unoqr

import android.content.ClipData
import android.content.ContentValues
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import java.io.File
import java.io.FileInputStream

// Saves app files in Android's public Downloads collection and opens them with system viewers.
class UnoqrDownloadsModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  override fun getName() = "UnoqrDownloads"

  // Copies a completed app file to public Downloads on Android 10 and newer.
  @ReactMethod
  fun saveFile(sourceUri: String, fileName: String, mimeType: String, promise: Promise) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
      promise.reject("UNSUPPORTED_ANDROID_VERSION", "Public Downloads needs Android 10 or newer.")
      return
    }

    Thread {
      val resolver = reactContext.contentResolver
      var savedUri: Uri? = null

      try {
        val source = Uri.parse(sourceUri)
        require(source.scheme == "file") { "A local app file is required." }
        val sourceFile = File(source.path ?: throw IllegalArgumentException("Invalid source file."))
        val safeName = File(fileName).name
        require(safeName.isNotBlank()) { "A file name is required." }

        val values = ContentValues().apply {
          put(MediaStore.Downloads.DISPLAY_NAME, safeName)
          put(MediaStore.Downloads.MIME_TYPE, mimeType)
          put(MediaStore.Downloads.RELATIVE_PATH, "${Environment.DIRECTORY_DOWNLOADS}/")
          put(MediaStore.Downloads.IS_PENDING, 1)
        }
        savedUri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
          ?: throw IllegalStateException("Android could not create the download.")

        FileInputStream(sourceFile).use { input ->
          resolver.openOutputStream(savedUri!!)?.use { output -> input.copyTo(output) }
            ?: throw IllegalStateException("Android could not write the download.")
        }

        values.clear()
        values.put(MediaStore.Downloads.IS_PENDING, 0)
        resolver.update(savedUri!!, values, null, null)
        promise.resolve(savedUri.toString())
      } catch (error: Exception) {
        savedUri?.let { resolver.delete(it, null, null) }
        promise.reject("DOWNLOAD_SAVE_FAILED", error.message, error)
      }
    }.start()
  }

  // Opens a saved Downloads item using Android's available file viewers.
  @ReactMethod
  fun openFile(uri: String, mimeType: String, promise: Promise) {
    try {
      val fileUri = Uri.parse(uri)
      val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(fileUri, mimeType)
        clipData = ClipData.newRawUri("download", fileUri)
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }
      val chooser = Intent.createChooser(intent, "Open downloaded file").apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_GRANT_READ_URI_PERMISSION)
      }

      reactContext.startActivity(chooser)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("DOWNLOAD_OPEN_FAILED", error.message, error)
    }
  }
}
