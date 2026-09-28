package com.orbis.app

import android.content.ContentValues
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.core.view.ViewCompat
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.webkit.ScriptHandler
import androidx.webkit.WebViewCompat
import androidx.webkit.WebViewFeature
import org.json.JSONObject
import java.io.File

class MainActivity : TauriActivity() {
  private var webView: WebView? = null
  private var insetScript: ScriptHandler? = null
  private var lastTopPx = 0
  private var lastBottomPx = 0
  private var hasInsets = false

  companion object {
    private const val TAG = "OrbisMainActivity"
    private const val BRIDGE_NAME = "OrbisNative"
  }

  override fun onCreate(savedInstanceState: Bundle?) {
    // 各 Android 版本统一走 edge-to-edge。Android 15+（targetSdk 35）起系统强制该行为
    // 并忽略 setDecorFitsSystemWindows(true)：沿用旧写法会让 WebView 顶到状态栏下面，
    // 顶部菜单被系统栏盖住且点不到，且模拟器与真机表现不一致。
    WindowCompat.setDecorFitsSystemWindows(window, false)
    super.onCreate(savedInstanceState)

    @Suppress("DEPRECATION")
    window.statusBarColor = Color.TRANSPARENT
    @Suppress("DEPRECATION")
    window.navigationBarColor = Color.TRANSPARENT

    // 正文为深色底，状态栏/导航栏使用浅色图标
    WindowCompat.getInsetsController(window, window.decorView).apply {
      isAppearanceLightStatusBars = false
      isAppearanceLightNavigationBars = false
    }

    val content = findViewById<View>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { _, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      publishSafeArea(bars.top, bars.bottom)
      insets
    }
    ViewCompat.requestApplyInsets(content)
  }

  override fun onWebViewCreate(webView: WebView) {
    super.onWebViewCreate(webView)
    this.webView = webView
    // 外部链接交给系统浏览器。放在 Kotlin 而不是 Rust 命令里，是因为 Tauri 的安卓插件
    // 接线由 CLI 生成、而本机调试脚本绕过了 CLI；这里是入库的源文件，任何构建路径都生效。
    webView.addJavascriptInterface(ExternalLinkBridge(), BRIDGE_NAME)
    // WebView 的创建晚于首个 inset 回调，补发一次以免漏掉
    if (hasInsets) publishSafeArea(lastTopPx, lastBottomPx, force = true)
  }

  /** 前端 window.OrbisNative 的宿主对象；只放行 http/https，其余忽略。 */
  private inner class ExternalLinkBridge {
    @JavascriptInterface
    fun openUrl(url: String) {
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        Log.w(TAG, "拒绝打开非 http(s) 链接: $url")
        return
      }
      // 注入的方法运行在 WebView 的 Java 桥线程，切回主线程再启动 Activity
      runOnUiThread {
        try {
          startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (e: Exception) {
          Log.w(TAG, "打开外部链接失败: $url", e)
        }
      }
    }

    /**
     * 导出文本文件到系统「下载」目录（MediaStore.Downloads，Android 10+ 无需存储权限）。
     * 结果经 evaluateJavascript 回调 window.__orbisExportResult(id, ok, detail)。
     * API < 29 没有 MediaStore.Downloads：兜底写入应用专属外部目录 exports/ 下。
     * 注入的方法运行在 Java 桥线程，ContentResolver 读写可在此线程，回调需切主线程。
     */
    @JavascriptInterface
    fun exportToDownloads(requestIdRaw: String, fileName: String, content: String, mimeType: String) {
      // requestId 会被拼进 JS 字符串，只放行安全字符防注入
      val requestId = requestIdRaw.replace(Regex("[^A-Za-z0-9_]"), "")
      val safeName = fileName.replace(Regex("[\\\\/:*?\"<>|]"), "_")
      try {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
          val values = ContentValues().apply {
            put(MediaStore.Downloads.DISPLAY_NAME, safeName)
            put(MediaStore.Downloads.MIME_TYPE, mimeType)
          }
          val resolver = applicationContext.contentResolver
          val uri = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
            ?: throw IllegalStateException("系统拒绝了下载目录写入")
          resolver.openOutputStream(uri)?.use { stream ->
            stream.write(content.toByteArray(Charsets.UTF_8))
            stream.flush()
          } ?: throw IllegalStateException("无法打开输出流")
          notifyExportResult(requestId, true, "已保存到系统下载目录")
        } else {
          val dir = getExternalFilesDir(null)
            ?: throw IllegalStateException("外部存储不可用")
          val target = File(dir, "exports/$safeName")
          target.parentFile?.mkdirs()
          target.writeText(content, Charsets.UTF_8)
          notifyExportResult(requestId, true, "已保存到应用目录 exports/")
        }
      } catch (e: Exception) {
        Log.w(TAG, "导出文件失败: $fileName", e)
        notifyExportResult(requestId, false, e.message ?: "导出失败")
      }
    }

    private fun notifyExportResult(requestId: String, ok: Boolean, detail: String) {
      val jsDetail = JSONObject.quote(detail)
      runOnUiThread {
        webView?.evaluateJavascript(
          "window.__orbisExportResult && window.__orbisExportResult('$requestId', $ok, $jsDetail);",
          null
        )
      }
    }
  }

  /**
   * 将系统栏高度以 CSS 变量形式喂给前端（--safe-area-inset-top / -bottom，单位 CSS px）。
   *
   * 必须由原生注入：实测 Android WebView 的 env(safe-area-inset-*) 恒为 0，
   * 即便已 edge-to-edge 且声明了 viewport-fit=cover。
   * 同时注册 document-start 脚本，保证页面重载（含开发期整页刷新）后变量仍然生效。
   */
  private fun publishSafeArea(topPx: Int, bottomPx: Int, force: Boolean = false) {
    val changed = !hasInsets || topPx != lastTopPx || bottomPx != lastBottomPx
    if (!changed && !force) return
    lastTopPx = topPx
    lastBottomPx = bottomPx
    hasInsets = true

    val density = resources.displayMetrics.density
    val js = """
      (function () {
        var el = document.documentElement;
        if (!el) return;
        el.style.setProperty('--safe-area-inset-top', '${topPx / density}px');
        el.style.setProperty('--safe-area-inset-bottom', '${bottomPx / density}px');
      })();
    """.trimIndent()

    val view = webView ?: return

    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      // 旧脚本携带的是上一次的插入值，需先注销再以当前值注册
      insetScript?.remove()
      insetScript = WebViewCompat.addDocumentStartJavaScript(view, js, setOf("*"))
    }
    view.evaluateJavascript(js, null)
  }
}
