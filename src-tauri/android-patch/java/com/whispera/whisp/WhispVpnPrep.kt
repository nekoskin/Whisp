package com.whispera.whisp

import android.app.Activity
import android.content.Intent
import android.net.VpnService
import android.util.Log

object WhispVpnPrep {
    private const val REQ_CODE = 1717
    @Volatile private var currentActivity: Activity? = null

    @JvmStatic fun setActivity(a: Activity?) { currentActivity = a }

    @JvmStatic fun isPrepared(): Boolean {
        val a = currentActivity ?: return false
        return VpnService.prepare(a) == null
    }

    @JvmStatic fun requestPermission(): Int {
        val a = currentActivity ?: return -1
        val intent: Intent? = try { VpnService.prepare(a) } catch (t: Throwable) {
            Log.e("WhispVpnPrep", "prepare failed", t); return -2
        }
        if (intent == null) return 1
        try {
            a.runOnUiThread { a.startActivityForResult(intent, REQ_CODE) }
            return 0
        } catch (t: Throwable) {
            Log.e("WhispVpnPrep", "startActivityForResult failed", t); return -3
        }
    }
}
