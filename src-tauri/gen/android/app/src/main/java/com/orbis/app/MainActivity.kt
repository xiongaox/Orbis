package com.orbis.app

import android.os.Bundle
import android.graphics.Color
import androidx.core.view.WindowCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    WindowCompat.setDecorFitsSystemWindows(window, true)
    window.statusBarColor = Color.rgb(16, 17, 18)
    window.navigationBarColor = Color.rgb(16, 17, 18)
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightStatusBars = false
    WindowCompat.getInsetsController(window, window.decorView).isAppearanceLightNavigationBars = false
    super.onCreate(savedInstanceState)
  }
}
