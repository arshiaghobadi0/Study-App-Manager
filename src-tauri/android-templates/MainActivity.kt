package com.studyplanner.weekly

import android.os.Bundle
import android.webkit.WebView

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    AndroidDownloadsBridge.ensureLegacyFolderBestEffort()
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    webView.addJavascriptInterface(
      AndroidDownloadsBridge(applicationContext),
      "AndroidStudyExports"
    )
  }
}
