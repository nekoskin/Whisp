package com.whispera.whisp

import android.app.Activity
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Environment
import android.provider.MediaStore
import android.security.KeyChain
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

    /**
     * Installs a CA certificate.
     * Returns "ok" if KeyChain intent was launched (Android < 11),
     * "saved:/path/to/file" if saved to Downloads (Android 11+ blocks KeyChain for CAs),
     * "error:message" on failure.
     */
    @JvmStatic fun installCaCert(ctx: Context, certDer: ByteArray): String {
        // Always save to Downloads so user has the file regardless of Android version
        val savedPath = saveCertToDownloads(ctx, certDer)

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            // Android 11+ (API 30+): KeyChain.createInstallIntent() blocks CA cert installation
            // User must install manually via Settings → Security → Install certificate
            return if (savedPath != null) "saved:$savedPath" else "error:Failed to save cert to Downloads"
        }

        // Android < 11: try KeyChain install intent from activity context if available
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
        } catch (e: Exception) {
            Log.e("WhispVpnPrep", "installCaCert KeyChain failed", e)
            if (savedPath != null) "saved:$savedPath" else "error:${e.message}"
        }
    }

    private fun saveCertToDownloads(ctx: Context, certDer: ByteArray): String? {
        return try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                // Android 10+ (API 29+): MediaStore, no WRITE_EXTERNAL_STORAGE needed
                val existing = ctx.contentResolver.query(
                    MediaStore.Downloads.EXTERNAL_CONTENT_URI,
                    arrayOf(MediaStore.MediaColumns._ID),
                    "${MediaStore.MediaColumns.DISPLAY_NAME} = ?",
                    arrayOf("whisp-ca.crt"), null
                )
                // Delete existing entry if present to allow overwrite
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
        } catch (e: Exception) {
            Log.e("WhispVpnPrep", "saveCertToDownloads failed", e)
            null
        }
    }
}
