package com.orbis.app

import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.VibrationEffect
import android.os.Vibrator
import android.os.VibratorManager
import android.provider.MediaStore
import android.provider.Settings
import android.util.Log
import android.view.HapticFeedbackConstants
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

    /**
     * 主题同步脚本：监听 <html> 的 class 变化（index.html 内联脚本与 React 切主题都会 toggle 'dark'），
     * 实时把明暗上报原生，用于切换系统状态栏 / 导航栏图标明暗。
     * Android WebView 的 JS 桥没有属性变化回调，只能靠 MutationObserver 主动上报。
     */
    private val THEME_SYNC_JS = """
      (function () {
        function sync() {
          try {
            var dark = document.documentElement.classList.contains('dark');
            window.OrbisNative && window.OrbisNative.setDarkMode(dark);
          } catch (e) {}
        }
        if (document.documentElement) {
          new MutationObserver(sync).observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
          sync();
        }
      })();
    """.trimIndent()
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

    // 状态栏/导航栏图标明暗随主题由 WebView 上报（见 ExternalLinkBridge.setDarkMode 与 THEME_SYNC_JS）。
    // 这里先按默认深色主题置浅色图标，避免首帧闪一下深色图标；主题脚本随后会按实际主题纠正。
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
    // 注入主题同步脚本：明亮主题下把状态栏/导航栏图标切成深色，否则白色图标压在浅底上看不清
    if (WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) {
      WebViewCompat.addDocumentStartJavaScript(webView, THEME_SYNC_JS, setOf("*"))
    }
    // WebView 的创建晚于首个 inset 回调，补发一次以免漏掉
    if (hasInsets) publishSafeArea(lastTopPx, lastBottomPx, force = true)
  }

  /** 前端 window.OrbisNative 的宿主对象；只放行 http/https，其余忽略。 */
  private inner class ExternalLinkBridge {
    /**
     * 主题同步：深色主题→状态栏/导航栏用浅色图标（isAppearanceLight* = false）；
     * 浅色主题→用深色图标（true）。由页面内 MutationObserver（THEME_SYNC_JS）在上报。
     */
    @JavascriptInterface
    fun setDarkMode(isDark: Boolean) {
      runOnUiThread {
        WindowCompat.getInsetsController(window, window.decorView).apply {
          isAppearanceLightStatusBars = !isDark
          isAppearanceLightNavigationBars = !isDark
        }
      }
    }

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
     * 触感反馈（可调三档强度）。
     * - strength：low / medium / high（前端设置决定），本方法再按 kind 微调节奏。
     * - 用 VibrationEffect.createOneShot(duration, amplitude) 直接控制强弱：低/中/高对应不同时长与振幅，
     *   形成低→高的手感梯度（无振幅控制的老马达上退化为纯时长差异）。
     * - confirm 用 createWaveform 打两段短震（双击确认）。
     * - API 24–25 无带振幅的 createOneShot，退回 View.performHapticFeedback 常量（无强度区分）。
     * - VIBRATE 普通权限；Vibrator 直调不遵守系统「触感反馈」总开关，故先读该开关。
     */
    @JavascriptInterface
    fun haptic(kind: String, strength: String) {
      val enabled = Settings.System.getInt(
        contentResolver, Settings.System.HAPTIC_FEEDBACK_ENABLED, 1
      ) == 1
      if (!enabled) return
      runOnUiThread {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
          val vibrator = systemVibrator() ?: return@runOnUiThread
          val baseDur: Long = when (strength) {
            "low" -> 10L
            "high" -> 55L
            else -> 30L
          }
          val amp: Int = when (strength) {
            "low" -> 45
            "high" -> 200
            else -> 140
          }
          when (kind) {
            // 双击确认：两段短震，间隔 ~70ms
            "confirm" -> vibrator.vibrate(
              VibrationEffect.createWaveform(
                longArrayOf(0, baseDur, 70, baseDur),
                intArrayOf(0, amp, 0, amp),
                -1
              )
            )
            // 手势落定：比按钮略长一点，更有「落定」感
            "light" -> vibrator.vibrate(
              VibrationEffect.createOneShot((baseDur * 1.25).toLong(), amp)
            )
            else -> vibrator.vibrate(VibrationEffect.createOneShot(baseDur, amp))
          }
        } else {
          val constant = when (kind) {
            "light" -> HapticFeedbackConstants.KEYBOARD_TAP
            "confirm" -> HapticFeedbackConstants.LONG_PRESS
            else -> HapticFeedbackConstants.VIRTUAL_KEY
          }
          webView?.performHapticFeedback(constant)
        }
      }
    }

    @Suppress("DEPRECATION")
    private fun systemVibrator(): Vibrator? = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      (getSystemService(Context.VIBRATOR_MANAGER_SERVICE) as? VibratorManager)?.defaultVibrator
    } else {
      getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
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
