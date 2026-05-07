package com.whispera.whisp

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.util.Log

object WhispVpnPrep {
    const val REQ_CODE = 1717

    @Volatile private var currentActivity: Activity? = null

    // Pending VPN params saved before requesting permission; used by onActivityResult
    @Volatile var hasPending: Boolean = false
    @Volatile private var pendingRulesJson: String = ""
    @Volatile private var pendingConnKey: String = ""
    @Volatile private var pendingVpnDns: String = "1.1.1.1"
    @Volatile private var pendingIpv6: Boolean = true
    @Volatile private var pendingMitm: Boolean = false

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

    @JvmStatic fun savePending(rulesJson: String, connKey: String, vpnDns: String, ipv6: Boolean, mitm: Boolean) {
        pendingRulesJson = rulesJson
        pendingConnKey   = connKey
        pendingVpnDns    = vpnDns.ifEmpty { "1.1.1.1" }
        pendingIpv6      = ipv6
        pendingMitm      = mitm
        hasPending       = true
        Log.d("WhispVpnPrep", "savePending: key=${connKey.take(6)}… dns=$vpnDns ipv6=$ipv6 mitm=$mitm")
    }

    @JvmStatic fun startPending(ctx: Context) {
        if (!hasPending) return
        hasPending = false
        Log.d("WhispVpnPrep", "startPending → launching WhispVpnService")
        val intent = Intent(ctx, WhispVpnService::class.java).apply {
            action = WhispVpnService.ACTION_START
            putExtra(WhispVpnService.EXTRA_CONN_KEY,   pendingConnKey)
            putExtra(WhispVpnService.EXTRA_RULES_JSON, pendingRulesJson)
            putExtra(WhispVpnService.EXTRA_VPN_DNS,    pendingVpnDns)
            putExtra(WhispVpnService.EXTRA_IPV6,       if (pendingIpv6) "1" else "0")
            putExtra(WhispVpnService.EXTRA_MITM,       if (pendingMitm) "1" else "0")
        }
        ctx.startForegroundService(intent)
    }
}
