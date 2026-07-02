package com.whispera.whisp

import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.view.View

class MainActivity : TauriActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        WhispVpnPrep.setActivity(this)
        enableEdgeToEdge()
    }

    private fun enableEdgeToEdge() {
        try {
            window.statusBarColor = Color.TRANSPARENT
            window.navigationBarColor = Color.TRANSPARENT
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                window.setDecorFitsSystemWindows(false)
            } else {
                @Suppress("DEPRECATION")
                window.decorView.systemUiVisibility = (
                    View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                    or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                    or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                )
            }
        } catch (_: Throwable) {}
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (WhispVpnService.isActuallyRunning(this)) {
            moveTaskToBack(true)
        } else {
            @Suppress("DEPRECATION")
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        WhispVpnPrep.setActivity(null)
        super.onDestroy()
    }

    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        if (requestCode == WhispVpnPrep.REQ_CODE && resultCode == Activity.RESULT_OK) {
            WhispVpnPrep.startPending(this)
        }
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            window.decorView.post {
                val h = window.decorView.height
                val exclusionPx = (60 * resources.displayMetrics.density + 0.5f).toInt()
                window.systemGestureExclusionRects = listOf(Rect(0, 0, exclusionPx, h))
            }
        }
    }
}
