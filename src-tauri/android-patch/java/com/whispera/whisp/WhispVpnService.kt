package com.whispera.whisp

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.util.Log
import android.widget.Toast
import singbox.Singbox

class WhispVpnService : VpnService() {
    companion object {
        const val TAG = "WhispVpnService"
        const val ACTION_START = "com.whispera.whisp.ACTION_VPN_START"
        const val ACTION_STOP  = "com.whispera.whisp.ACTION_VPN_STOP"
        const val EXTRA_CONN_KEY   = "com.whispera.whisp.EXTRA_CONN_KEY"
        const val EXTRA_RULES_JSON = "com.whispera.whisp.EXTRA_RULES_JSON"
        const val EXTRA_VPN_DNS    = "com.whispera.whisp.EXTRA_VPN_DNS"
        const val EXTRA_IPV6       = "com.whispera.whisp.EXTRA_IPV6"
        const val EXTRA_MITM       = "com.whispera.whisp.EXTRA_MITM"
        const val NOTIFICATION_ID = 17
        const val CHANNEL_ID = "whisp_vpn_channel"
        const val CHANNEL_ID_EVENTS = "whisp_events"
        const val NOTIF_ID_EVENT = 18

        @Volatile @JvmField var isRunning: Boolean = false
    }

    @Volatile private var didConnect = false

    private var tunInterface: ParcelFileDescriptor? = null
    private var goClientProc: Process? = null
    private var pendingConnKey: String = ""
    private var pendingRulesJson: String = ""
    private var pendingVpnDns: String = "1.1.1.1"
    private var pendingIpv6: Boolean = true
    private var pendingMitm: Boolean = false

    private val mainHandler = Handler(Looper.getMainLooper())
    private fun toast(msg: String) {
        Log.i(TAG, msg)
        mainHandler.post { Toast.makeText(this, "Whisp VPN: $msg", Toast.LENGTH_LONG).show() }
    }

    private fun prefs() = getSharedPreferences("whisp_vpn", Context.MODE_PRIVATE)

    private fun saveParams() {
        prefs().edit()
            .putString("conn_key",    pendingConnKey)
            .putString("rules_json",  pendingRulesJson)
            .putString("vpn_dns",     pendingVpnDns)
            .putBoolean("ipv6",       pendingIpv6)
            .putBoolean("mitm",       pendingMitm)
            .apply()
    }

    private fun restoreParams(): Boolean {
        val p = prefs()
        val key = p.getString("conn_key", "") ?: ""
        if (key.isEmpty()) return false
        pendingConnKey   = key
        pendingRulesJson = p.getString("rules_json", "") ?: ""
        pendingVpnDns    = p.getString("vpn_dns", "1.1.1.1") ?: "1.1.1.1"
        pendingIpv6      = p.getBoolean("ipv6", true)
        pendingMitm      = p.getBoolean("mitm", false)
        return true
    }

    private fun clearParams() {
        prefs().edit().clear().apply()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        try {
            when (intent?.action) {
                ACTION_STOP -> {
                    isRunning = false
                    clearParams()
                    stopVpn()
                    return START_NOT_STICKY
                }
                else -> {
                    if (intent != null) {
                        // Normal start — load params from intent and persist them.
                        pendingConnKey   = intent.getStringExtra(EXTRA_CONN_KEY)   ?: ""
                        pendingRulesJson = intent.getStringExtra(EXTRA_RULES_JSON) ?: ""
                        pendingVpnDns    = intent.getStringExtra(EXTRA_VPN_DNS)?.takeIf { it.isNotEmpty() } ?: "1.1.1.1"
                        pendingIpv6      = (intent.getStringExtra(EXTRA_IPV6) ?: "1") != "0"
                        pendingMitm      = (intent.getStringExtra(EXTRA_MITM) ?: "0") == "1"
                        saveParams()
                    } else {
                        // OS restarted the service (START_STICKY) — restore saved params.
                        if (!restoreParams()) { stopSelf(); return START_NOT_STICKY }
                    }
                    isRunning = true
                    startVpnSafe()
                }
            }
        } catch (t: Throwable) {
            toast("crash: ${t.javaClass.simpleName}: ${t.message}")
            try { stopForegroundCompat() } catch (_: Throwable) {}
            stopSelf()
        }
        // START_STICKY: if the OS kills this process (OEM RAM management, low memory),
        // Android will restart the service with a null intent so we restore from prefs.
        return START_STICKY
    }

    private fun startVpnSafe() {
        toast("starting")

        if (VpnService.prepare(this) != null) {
            toast("VPN permission not granted"); stopSelf(); return
        }

        try { startForegroundCompat() } catch (t: Throwable) {
            toast("startForeground: ${t.message}"); stopSelf(); return
        }

        val pfd = try {
            Builder()
                .setSession("Whisp VPN")
                .setMtu(1500)
                .addAddress("172.19.0.1", 30)
                .also { if (pendingIpv6) it.addAddress("fdfe:dcba:9876::1", 126) }
                .addRoute("0.0.0.0", 0)
                .also { if (pendingIpv6) it.addRoute("::", 0) }
                .addDnsServer(pendingVpnDns)
                .also { try { it.addDisallowedApplication(packageName) } catch (_: Throwable) {} }
                .also { applyAppRoutingRules(it) }
                .establish()
        } catch (t: Throwable) {
            toast("establish: ${t.message}"); stopVpn(); return
        } ?: run { toast("establish returned null"); stopVpn(); return }

        tunInterface = pfd
        toast("TUN fd=${pfd.fd}")

        // Запускаем go-client как SOCKS5 upstream на :1080
        val libDir = applicationInfo.nativeLibraryDir
        val goClientPath = "$libDir/libwhispera-go-client.so"
        if (pendingConnKey.isNotEmpty() && java.io.File(goClientPath).exists()) {
            try {
                val goArgs = mutableListOf(goClientPath,
                    "-key", pendingConnKey,
                    "-socks", "127.0.0.1:1080",
                    "-no-tun")
                if (pendingMitm) goArgs.add("-mitm")
                goClientProc = ProcessBuilder(goArgs)
                    .redirectErrorStream(true)
                    .start()
                // Drain stdout/stderr — without this, a full pipe buffer blocks the process
                goClientProc?.inputStream?.let { stream ->
                    Thread({
                        try { val buf = ByteArray(8192); while (stream.read(buf) != -1) {} } catch (_: Throwable) {}
                    }, "goclient-drain").apply { isDaemon = true }.start()
                }
                Thread.sleep(800)
                toast("go-client started")
            } catch (t: Throwable) {
                toast("go-client failed: ${t.message}")
            }
        }

        // Запускаем sing-box: TUN fd → SOCKS5 → go-client
        
        Thread({
            try {
                Log.i(TAG, "singbox Start() fd=${pfd.fd}")
                Singbox.start(pfd.fd, filesDir.absolutePath, if (goClientProc != null) "127.0.0.1:1080" else "", pendingConnKey, pendingRulesJson, pendingIpv6)
                Log.i(TAG, "singbox running")
                didConnect = true
                postEvent("Whisp VPN", "Подключено")
                toast("VPN started")
            } catch (t: Throwable) {
                Log.e(TAG, "singbox FATAL: ${t.stackTraceToString()}")
                postEvent("Whisp VPN — ошибка", t.message ?: "Ошибка подключения")
                toast("singbox: ${t.javaClass.simpleName}: ${t.message ?: t.toString()}")
                stopVpn()
            }
        }, "singbox-start").start()
    }

    // Парсит pendingRulesJson и применяет split-tunneling для process-name правил.
    // action=DIRECT → addDisallowedApplication: пакет обходит VPN-туннель.
    // action=PROXY  → ничего: трафик идёт через VPN по умолчанию (disallow-mode).
    // action=REJECT → addDisallowedApplication: обходит тоннель (блокировку на
    //                 уровне VPN реализовать нельзя без root/nfqueue).
    private fun applyAppRoutingRules(builder: Builder) {
        if (pendingRulesJson.isEmpty()) return
        try {
            val arr = org.json.JSONArray(pendingRulesJson)
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                if (obj.optString("kind") != "process-name") continue
                val action = obj.optString("action", "DIRECT")
                if (action == "PROXY") continue   // уже идёт через VPN по умолчанию
                val pkg = obj.optString("name").takeIf { it.isNotEmpty() } ?: continue
                if (pkg == packageName) continue  // наш же пакет — уже добавлен выше
                try {
                    builder.addDisallowedApplication(pkg)
                    Log.d(TAG, "appRule $action bypass: $pkg")
                } catch (e: Exception) {
                    Log.w(TAG, "applyAppRoutingRules: $pkg — ${e.message}")
                }
            }
        } catch (e: Exception) {
            Log.w(TAG, "applyAppRoutingRules parse: ${e.message}")
        }
    }

    private fun stopVpn() {
        Log.i(TAG, "stopVpn")
        try { Singbox.stop() } catch (_: Throwable) {}
        goClientProc?.destroy()
        goClientProc = null
        try { tunInterface?.close() } catch (_: Throwable) {}
        tunInterface = null
        try { stopForegroundCompat() } catch (_: Throwable) {}
        stopSelf()
    }

    // App swiped away from recents — stopWithTask=false keeps the service alive
    // under normal conditions, but some OEM ROMs kill the process anyway.
    // Returning START_STICKY from onStartCommand handles automatic restart by the OS.
    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    }

    override fun onDestroy() {
        if (didConnect && isRunning) {
            postEvent("Whisp VPN", "Соединение прервано")
        }
        isRunning = false
        try { stopVpn() } catch (_: Throwable) {}
        super.onDestroy()
    }

    private fun ensureEventsChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val nm = getSystemService(NOTIFICATION_SERVICE) as NotificationManager
        if (nm.getNotificationChannel(CHANNEL_ID_EVENTS) != null) return
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL_ID_EVENTS, "Whisp VPN события", NotificationManager.IMPORTANCE_DEFAULT)
        )
    }

    private fun postEvent(title: String, body: String) {
        try {
            ensureEventsChannel()
            val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
                ?.apply { addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP) }
            val pi = launchIntent?.let {
                PendingIntent.getActivity(
                    this, 0, it,
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            }
            val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
                Notification.Builder(this, CHANNEL_ID_EVENTS)
            else
                @Suppress("DEPRECATION") Notification.Builder(this)
            val notif = builder
                .setContentTitle(title)
                .setContentText(body)
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setAutoCancel(true)
                .also { if (pi != null) it.setContentIntent(pi) }
                .build()
            (getSystemService(NOTIFICATION_SERVICE) as NotificationManager)
                .notify(NOTIF_ID_EVENT, notif)
        } catch (t: Throwable) {
            Log.w(TAG, "postEvent failed: ${t.message}")
        }
    }

    private fun startForegroundCompat() {
        val notif = buildNotification()
        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notif,
                android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notif)
        }
    }

    private fun stopForegroundCompat() {
        @Suppress("DEPRECATION") stopForeground(true)
    }

    private fun buildNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Whisp VPN", NotificationManager.IMPORTANCE_LOW)
            )
        }
        val builder = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O)
            Notification.Builder(this, CHANNEL_ID)
        else
            @Suppress("DEPRECATION") Notification.Builder(this)
        return builder
            .setContentTitle("Whisp VPN")
            .setContentText("Connected")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()
    }
}
