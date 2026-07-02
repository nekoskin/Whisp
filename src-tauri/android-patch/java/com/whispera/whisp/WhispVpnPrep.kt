package com.whispera.whisp

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.provider.Settings
import android.security.KeyChain
import android.util.Log

object WhispVpnPrep {
    const val REQ_CODE = 1717

    @Volatile private var currentActivity: Activity? = null

    @Volatile var hasPending: Boolean = false
    @Volatile private var pendingRulesJson: String = ""
    @Volatile private var pendingConnKey: String = ""
    @Volatile private var pendingVpnDns: String = "1.1.1.1"
    @Volatile private var pendingIpv6: Boolean = true
    @Volatile private var pendingMitm: Boolean = false
    @Volatile private var pendingHwid: Boolean = true
    @Volatile private var pendingTlsFingerprint: String = ""
    @Volatile private var pendingMixedPort: Int = 0
    @Volatile private var pendingAllowLan: Boolean = false
    @Volatile private var pendingSocksUser: String = ""
    @Volatile private var pendingSocksPass: String = ""
    @Volatile private var pendingDnsMode: String = "udp"
    @Volatile private var pendingDnsStrategy: String = "fakeip"
    @Volatile private var pendingMtu: Int = 1500
    @Volatile private var pendingTlsFragment: Boolean = false
    @Volatile private var pendingAutoConnect: Boolean = false

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

    @JvmStatic fun savePending(rulesJson: String, connKey: String, vpnDns: String, ipv6: Boolean, mitm: Boolean, hwid: Boolean, tlsFingerprint: String, mixedPort: Int, allowLan: Boolean, socksUser: String, socksPass: String, dnsMode: String, dnsStrategy: String, mtu: Int, tlsFragment: Boolean, autoConnect: Boolean) {
        pendingRulesJson = rulesJson
        pendingConnKey   = connKey
        pendingVpnDns    = vpnDns.ifEmpty { "1.1.1.1" }
        pendingIpv6      = ipv6
        pendingMitm      = mitm
        pendingHwid      = hwid
        pendingTlsFingerprint = tlsFingerprint
        pendingMixedPort = mixedPort
        pendingAllowLan  = allowLan
        pendingSocksUser = socksUser
        pendingSocksPass = socksPass
        pendingDnsMode   = dnsMode.ifEmpty { "udp" }
        pendingDnsStrategy = dnsStrategy.ifEmpty { "fakeip" }
        pendingMtu       = if (mtu in 576..9000) mtu else 1500
        pendingTlsFragment = tlsFragment
        pendingAutoConnect = autoConnect
        hasPending       = true
        Log.d("WhispVpnPrep", "savePending: key=${connKey.take(6)}… dns=$vpnDns ipv6=$ipv6 mitm=$mitm hwid=$hwid fp=$tlsFingerprint mixedPort=$mixedPort allowLan=$allowLan dnsMode=$pendingDnsMode dnsStrategy=$pendingDnsStrategy mtu=$pendingMtu tlsFragment=$pendingTlsFragment")
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
            putExtra(WhispVpnService.EXTRA_HWID,       if (pendingHwid) "1" else "0")
            putExtra(WhispVpnService.EXTRA_TLS_FINGERPRINT, pendingTlsFingerprint)
            putExtra(WhispVpnService.EXTRA_MIXED_PORT, pendingMixedPort.toString())
            putExtra(WhispVpnService.EXTRA_ALLOW_LAN,  if (pendingAllowLan) "1" else "0")
            putExtra(WhispVpnService.EXTRA_SOCKS_USER, pendingSocksUser)
            putExtra(WhispVpnService.EXTRA_SOCKS_PASS, pendingSocksPass)
            putExtra(WhispVpnService.EXTRA_DNS_MODE,   pendingDnsMode)
            putExtra(WhispVpnService.EXTRA_DNS_STRATEGY, pendingDnsStrategy)
            putExtra(WhispVpnService.EXTRA_MTU,        pendingMtu.toString())
            putExtra(WhispVpnService.EXTRA_TLS_FRAGMENT, if (pendingTlsFragment) "1" else "0")
            putExtra(WhispVpnService.EXTRA_AUTO_CONNECT, if (pendingAutoConnect) "1" else "0")
        }
        ctx.startForegroundService(intent)
    }

    @JvmStatic fun installCaCert(ctx: Context, certDer: ByteArray): String {
        val savedPath = saveCertToDownloads(ctx, certDer)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            if (savedPath != null) {
                try {
                    val intent = Intent(Settings.ACTION_SECURITY_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    ctx.startActivity(intent)
                } catch (t: Throwable) {
                    Log.w("WhispVpnPrep", "open security settings failed", t)
                }
                return "saved:$savedPath"
            }
            return "error:Failed to save cert to Downloads"
        }

        val activity = currentActivity
        return try {
            val intent = KeyChain.createInstallIntent().apply {
                putExtra("CERT", certDer)
                putExtra("name", "Whisp CA")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            if (activity != null) {
                activity.runOnUiThread { activity.startActivity(intent) }
            } else {
                ctx.startActivity(intent)
            }
            "ok"
        } catch (t: Throwable) {
            Log.e("WhispVpnPrep", "installCaCert KeyChain failed", t)
            if (savedPath != null) "saved:$savedPath" else "error:${t.message}"
        }
    }

    private fun saveCertToDownloads(ctx: Context, certDer: ByteArray): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val existing = ctx.contentResolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    arrayOf(MediaStore.MediaColumns._ID),
                    "${MediaStore.MediaColumns.DISPLAY_NAME} = ?",
                    arrayOf("whisp-ca.crt"), null
                )
                existing?.use { c ->
                    if (c.moveToFirst()) {
                        val id = c.getLong(0)
                        ctx.contentResolver.delete(
                            MediaStore.Downloads.EXTERNAL_CONTENT_URI.buildUpon().appendPath(id.toString()).build(),
                            null, null
                        )
                    }
                }
                val cv = ContentValues().apply {
                    put(MediaStore.MediaColumns.DISPLAY_NAME, "whisp-ca.crt")
                    put(MediaStore.MediaColumns.MIME_TYPE, "application/x-x509-ca-cert")
                    put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
                }
                val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, cv)
                    ?: return null
                ctx.contentResolver.openOutputStream(uri)?.use { it.write(certDer) }
                Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS)
                    .absolutePath + "/whisp-ca.crt"
            } else {
                @Suppress("DEPRECATION")
                val file = java.io.File(
                    Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS),
                    "whisp-ca.crt"
                )
                file.writeBytes(certDer)
                file.absolutePath
            }
        } catch (t: Throwable) {
            Log.e("WhispVpnPrep", "saveCertToDownloads failed", t)
            null
        }
    }
}
