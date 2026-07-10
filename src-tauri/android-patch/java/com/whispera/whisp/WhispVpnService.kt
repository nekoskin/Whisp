package com.whispera.whisp

import android.app.ActivityManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.Network
import android.net.NetworkCapabilities
import android.net.NetworkRequest
import android.net.VpnService
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.ParcelFileDescriptor
import android.util.Log
import android.widget.Toast
import goclient.Goclient
import singbox.Singbox

class WhispVpnService : VpnService() {
    companion object {
        const val TAG = "WhispVpnService"
        const val ACTION_START = "com.whispera.whisp.ACTION_VPN_START"
        const val ACTION_STOP  = "com.whispera.whisp.ACTION_VPN_STOP"
        const val ACTION_BOOT  = "com.whispera.whisp.ACTION_VPN_BOOT"
        const val EXTRA_CONN_KEY   = "com.whispera.whisp.EXTRA_CONN_KEY"
        const val EXTRA_RULES_JSON = "com.whispera.whisp.EXTRA_RULES_JSON"
        const val EXTRA_VPN_DNS    = "com.whispera.whisp.EXTRA_VPN_DNS"
        const val EXTRA_IPV6       = "com.whispera.whisp.EXTRA_IPV6"
        const val EXTRA_HWID       = "com.whispera.whisp.EXTRA_HWID"
        const val EXTRA_TLS_FINGERPRINT = "com.whispera.whisp.EXTRA_TLS_FINGERPRINT"
        const val EXTRA_DNS_MODE   = "com.whispera.whisp.EXTRA_DNS_MODE"
        const val EXTRA_DNS_STRATEGY = "com.whispera.whisp.EXTRA_DNS_STRATEGY"
        const val EXTRA_MTU        = "com.whispera.whisp.EXTRA_MTU"
        const val EXTRA_TLS_FRAGMENT = "com.whispera.whisp.EXTRA_TLS_FRAGMENT"
        const val EXTRA_AUTO_CONNECT = "com.whispera.whisp.EXTRA_AUTO_CONNECT"
        const val EXTRA_MIXED_PORT = "com.whispera.whisp.EXTRA_MIXED_PORT"
        const val EXTRA_ALLOW_LAN  = "com.whispera.whisp.EXTRA_ALLOW_LAN"
        const val EXTRA_SOCKS_USER = "com.whispera.whisp.EXTRA_SOCKS_USER"
        const val EXTRA_SOCKS_PASS = "com.whispera.whisp.EXTRA_SOCKS_PASS"
        const val NOTIFICATION_ID = 1080
        const val CHANNEL_ID = "whisp_vpn_channel"
        const val CHANNEL_ID_EVENTS = "whisp_events"
        const val NOTIF_ID_EVENT = 18

        @Volatile @JvmField var isRunning: Boolean = false

        @JvmStatic
        fun isActuallyRunning(ctx: Context): Boolean {
            val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager ?: return false
            return try {
                @Suppress("DEPRECATION")
                am.getRunningServices(Int.MAX_VALUE).any { it.service.className == WhispVpnService::class.java.name }
            } catch (_: Throwable) {
                false
            }
        }
    }

    @Volatile private var didConnect = false
    private val stopping = java.util.concurrent.atomic.AtomicBoolean(false)
    private val starting = java.util.concurrent.atomic.AtomicBoolean(false)
    @Volatile private var vpnStartThread: Thread? = null

    private var tunInterface: ParcelFileDescriptor? = null
    private var networkCallback: ConnectivityManager.NetworkCallback? = null
    private var pendingWake: Runnable? = null
    private var pendingConnKey: String = ""
    private var pendingRulesJson: String = ""
    private var pendingVpnDns: String = "1.1.1.1"
    private var pendingIpv6: Boolean = true
    private var pendingHwid: Boolean = true
    private var pendingTlsFingerprint: String = ""
    private var pendingDnsMode: String = "udp"
    private var pendingDnsStrategy: String = "fakeip"
    private var pendingMtu: Int = 1500
    private var pendingTlsFragment: Boolean = false
    private var pendingAutoConnect: Boolean = false
    private var pendingMixedPort: Int = 0
    private var pendingAllowLan: Boolean = false
    private var pendingSocksUser: String = ""
    private var pendingSocksPass: String = ""

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
            .putBoolean("hwid",       pendingHwid)
            .putString("tls_fingerprint", pendingTlsFingerprint)
            .putString("dns_mode",    pendingDnsMode)
            .putString("dns_strategy", pendingDnsStrategy)
            .putInt("mtu",            pendingMtu)
            .putBoolean("tls_fragment", pendingTlsFragment)
            .putBoolean("auto_connect", pendingAutoConnect)
            .putInt("mixed_port",     pendingMixedPort)
            .putBoolean("allow_lan",  pendingAllowLan)
            .putString("socks_user",  pendingSocksUser)
            .putString("socks_pass",  pendingSocksPass)
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
        pendingHwid      = p.getBoolean("hwid", true)
        pendingTlsFingerprint = p.getString("tls_fingerprint", "") ?: ""
        pendingDnsMode   = p.getString("dns_mode", "udp") ?: "udp"
        pendingDnsStrategy = p.getString("dns_strategy", "fakeip") ?: "fakeip"
        pendingMtu       = p.getInt("mtu", 1500)
        pendingTlsFragment = p.getBoolean("tls_fragment", false)
        pendingAutoConnect = p.getBoolean("auto_connect", false)
        pendingMixedPort = p.getInt("mixed_port", 0)
        pendingAllowLan  = p.getBoolean("allow_lan", false)
        pendingSocksUser = p.getString("socks_user", "") ?: ""
        pendingSocksPass = p.getString("socks_pass", "") ?: ""
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
                ACTION_BOOT -> {
                    try { startForegroundCompat() } catch (t: Throwable) {
                        toast("startForeground: ${t.message}"); stopSelf(); return START_NOT_STICKY
                    }
                    if (!restoreParams() || !pendingAutoConnect) {
                        stopVpn(); return START_NOT_STICKY
                    }
                    isRunning = true
                    startVpnSafe()
                    return START_STICKY
                }
                else -> {
                    try { startForegroundCompat() } catch (t: Throwable) {
                        toast("startForeground: ${t.message}"); stopSelf(); return START_NOT_STICKY
                    }
                    if (intent != null) {
                        pendingConnKey   = intent.getStringExtra(EXTRA_CONN_KEY)   ?: ""
                        pendingRulesJson = intent.getStringExtra(EXTRA_RULES_JSON) ?: ""
                        pendingVpnDns    = intent.getStringExtra(EXTRA_VPN_DNS)?.takeIf { it.isNotEmpty() } ?: "1.1.1.1"
                        pendingIpv6      = (intent.getStringExtra(EXTRA_IPV6) ?: "1") != "0"
                        pendingHwid      = (intent.getStringExtra(EXTRA_HWID) ?: "1") != "0"
                        pendingTlsFingerprint = intent.getStringExtra(EXTRA_TLS_FINGERPRINT) ?: ""
                        pendingDnsMode   = intent.getStringExtra(EXTRA_DNS_MODE)?.takeIf { it in listOf("udp","tcp","doh") } ?: "udp"
                        pendingDnsStrategy = intent.getStringExtra(EXTRA_DNS_STRATEGY)?.takeIf { it in listOf("fakeip","local") } ?: "fakeip"
                        pendingMtu       = intent.getStringExtra(EXTRA_MTU)?.toIntOrNull()?.coerceIn(576, 9000) ?: 1500
                        pendingTlsFragment = (intent.getStringExtra(EXTRA_TLS_FRAGMENT) ?: "0") == "1"
                        pendingAutoConnect = (intent.getStringExtra(EXTRA_AUTO_CONNECT) ?: "0") == "1"
                        pendingMixedPort = intent.getStringExtra(EXTRA_MIXED_PORT)?.toIntOrNull() ?: 0
                        pendingAllowLan  = (intent.getStringExtra(EXTRA_ALLOW_LAN) ?: "0") == "1"
                        pendingSocksUser = intent.getStringExtra(EXTRA_SOCKS_USER) ?: ""
                        pendingSocksPass = intent.getStringExtra(EXTRA_SOCKS_PASS) ?: ""
                        saveParams()
                    } else {
                        if (!restoreParams()) { stopVpn(); return START_NOT_STICKY }
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
        return START_STICKY
    }

    private fun startVpnSafe() {
        vpnStartThread?.interrupt()
        vpnStartThread = null
        if (!starting.compareAndSet(false, true)) return
        var launched = false
        try {
        stopping.set(false)
        didConnect = false
        toast("starting")

        if (VpnService.prepare(this) != null) {
            toast("VPN permission not granted"); stopSelf(); return
        }

        val pfd = try {
            Builder()
                .setSession("Whisp VPN")
                .setMtu(pendingMtu)
                .addAddress("172.19.0.1", 30)
                .also { if (pendingIpv6) it.addAddress("fdfe:dcba:9876::1", 126) }
                .addRoute("0.0.0.0", 0)
                .also { if (pendingIpv6) it.addRoute("::", 0) }
                .also { if (pendingVpnDns != "system") it.addDnsServer(pendingVpnDns) }
                .also { if (pendingIpv6) it.addDnsServer("fdfe:dcba:9876::2") }
                .also { try { it.addDisallowedApplication(packageName) } catch (_: Throwable) {} }
                .also { applyAppRoutingRules(it) }
                .establish()
        } catch (t: Throwable) {
            toast("establish: ${t.message}"); stopVpn(); return
        } ?: run { toast("establish returned null"); stopVpn(); return }

        tunInterface = pfd
        toast("TUN fd=${pfd.fd}")

        val filesAbsDir = filesDir.absolutePath
        val t = Thread({
            try {
                var socksAddr = ""
                if (pendingConnKey.isNotEmpty()) {
                    val goLogPath = "${filesDir.absolutePath}/go-client.log"
                    val fp = if (pendingTlsFingerprint.isNotEmpty() && pendingTlsFingerprint != "random") pendingTlsFingerprint else ""
                    Log.i(TAG, "go-client Start() in-process")
                    Goclient.start(pendingConnKey, "127.0.0.1:1080", goLogPath, fp, pendingHwid)
                    socksAddr = "127.0.0.1:1080"
                    if (waitForPort("127.0.0.1", 1080, 4000)) toast("go-client started")
                    else Log.w(TAG, "go-client did not bind on :1080 within 4s, proceeding anyway")
                }

                if (Thread.currentThread().isInterrupted) return@Thread

                Log.i(TAG, "singbox Start() fd=${pfd.fd}")
                Singbox.start(pfd.fd, filesAbsDir, socksAddr, pendingConnKey, pendingRulesJson, pendingIpv6, pendingDnsMode, pendingVpnDns, pendingDnsStrategy, pendingMtu, pendingTlsFragment, pendingMixedPort, pendingSocksUser, pendingSocksPass, pendingAllowLan)
                Log.i(TAG, "singbox running")
                didConnect = true
                toast("VPN started")
            } catch (t: Throwable) {
                if (t is InterruptedException) return@Thread
                Log.e(TAG, "singbox FATAL: ${t.stackTraceToString()}")
                postEvent("Whisp VPN — ошибка", t.message ?: "Ошибка подключения")
                toast("singbox: ${t.javaClass.simpleName}: ${t.message ?: t.toString()}")
                stopVpn()
            } finally {
                starting.set(false)
            }
        }, "vpn-start")
        vpnStartThread = t
        t.start()
        launched = true
        registerNetworkCallback()
        } finally {
            if (!launched) starting.set(false)
        }
    }

    private fun applyAppRoutingRules(builder: Builder) {
        if (pendingRulesJson.isEmpty()) return
        try {
            val arr = org.json.JSONArray(pendingRulesJson)
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                if (obj.optString("kind") != "process-name") continue
                val action = obj.optString("action", "DIRECT")
                if (action == "PROXY") continue
                val pkg = obj.optString("name").takeIf { it.isNotEmpty() } ?: continue
                if (pkg == packageName) continue
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
        if (!stopping.compareAndSet(false, true)) {
            Log.w(TAG, "stopVpn: already stopping, skipping")
            return
        }
        Log.i(TAG, "stopVpn")
        unregisterNetworkCallback()
        try { Singbox.stop() } catch (_: Throwable) {}
        try { Goclient.stop() } catch (_: Throwable) {}
        try { tunInterface?.close() } catch (_: Throwable) {}
        tunInterface = null
        try { stopForegroundCompat() } catch (_: Throwable) {}
        stopping.set(false)
        stopSelf()
        // go-client + sing-box run in-process in this ":vpn" process. Graceful
        // stop can leave go-client's reconnect goroutines alive, so it keeps
        // reconnecting. Hard-kill the whole ":vpn" process — the exact semantics
        // of the old forked process.destroy(). The UI runs in a separate process
        // and is untouched. Deferred so onStartCommand can first return
        // START_NOT_STICKY (ACTION_STOP), otherwise Android may respawn :vpn.
        mainHandler.postDelayed({
            android.os.Process.killProcess(android.os.Process.myPid())
        }, 250)
    }

    private fun registerNetworkCallback() {
        if (networkCallback != null) return
        val cm = getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager ?: return
        val req = NetworkRequest.Builder()
            .addCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
            .addCapability(NetworkCapabilities.NET_CAPABILITY_NOT_VPN)
            .build()
        val cb = object : ConnectivityManager.NetworkCallback() {
            override fun onAvailable(network: Network) {
                Log.i(TAG, "netcb onAvailable: $network")
                setUnderlyingNetworks(arrayOf(network))
                if (didConnect && isRunning) wakeGoClient()
            }
            override fun onCapabilitiesChanged(network: Network, capabilities: NetworkCapabilities) {
                Log.i(TAG, "netcb onCapabilitiesChanged: $network")
                setUnderlyingNetworks(arrayOf(network))
            }
            override fun onLost(network: Network) {
                Log.i(TAG, "netcb onLost: $network")
                setUnderlyingNetworks(null)
            }
        }
        Log.i(TAG, "registerNetworkCallback: registering")
        networkCallback = cb
        try {
            cm.registerNetworkCallback(req, cb)
        } catch (t: Throwable) {
            Log.w(TAG, "registerNetworkCallback: ${t.message}")
            networkCallback = null
        }
    }

    private fun unregisterNetworkCallback() {
        val cb = networkCallback ?: return
        networkCallback = null
        try {
            (getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager)
                ?.unregisterNetworkCallback(cb)
        } catch (_: Throwable) {}
    }

    private fun wakeGoClient() {
        pendingWake?.let { mainHandler.removeCallbacks(it) }
        val r = Runnable {
            Thread({
                try {
                    val conn = java.net.URL("http://127.0.0.1:10801/wake")
                        .openConnection() as java.net.HttpURLConnection
                    conn.requestMethod = "POST"
                    conn.connectTimeout = 1000
                    conn.readTimeout = 1000
                    conn.doOutput = true
                    conn.outputStream.use { it.write(ByteArray(0)) }
                    Log.i(TAG, "wake -> ${conn.responseCode}")
                    conn.disconnect()
                } catch (t: Throwable) {
                    Log.w(TAG, "wake failed: ${t.message}")
                }
            }, "wake-poke").apply { isDaemon = true }.start()
        }
        pendingWake = r
        mainHandler.postDelayed(r, 400)
    }

    private fun waitForPort(host: String, port: Int, timeoutMs: Long): Boolean {
        val deadline = System.currentTimeMillis() + timeoutMs
        while (System.currentTimeMillis() < deadline) {
            try { java.net.Socket(host, port).use { return true } } catch (_: Exception) {}
            Thread.sleep(50)
        }
        return false
    }

    override fun onTaskRemoved(rootIntent: Intent?) {
        super.onTaskRemoved(rootIntent)
    }

    override fun onRevoke() {
        Log.w(TAG, "onRevoke: VPN permission revoked")
        isRunning = false
        try { stopVpn() } catch (_: Throwable) {}
        super.onRevoke()
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
            .setContentText("VPN активен")
            .setSmallIcon(android.R.drawable.ic_lock_lock)
            .setOngoing(true)
            .build()
    }
}
