package com.whispera.whisp

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * Перезапускает VPN один раз после ребута телефона, если пользователь включил
 * автозапуск и была активная сессия. НЕ срабатывает при каждом открытии
 * приложения — только на BOOT_COMPLETED.
 *
 * Работает в процессе :vpn (см. manifest), поэтому читает те же SharedPreferences
 * "whisp_vpn", что пишет WhispVpnService.saveParams(). Флаг auto_connect и conn_key
 * сохраняются при подключении; на ACTION_STOP параметры чистятся, так что после
 * ручного отключения ребут ничего не поднимает.
 */
class BootReceiver : BroadcastReceiver() {
    override fun onReceive(ctx: Context, intent: Intent?) {
        val action = intent?.action ?: return
        if (action != Intent.ACTION_BOOT_COMPLETED &&
            action != "android.intent.action.QUICKBOOT_POWERON"
        ) return

        val p = ctx.getSharedPreferences("whisp_vpn", Context.MODE_PRIVATE)
        val key = p.getString("conn_key", "") ?: ""
        val auto = p.getBoolean("auto_connect", false)
        if (key.isEmpty() || !auto) {
            Log.i("BootReceiver", "boot: skip (key empty=${key.isEmpty()} auto=$auto)")
            return
        }

        Log.i("BootReceiver", "boot: starting VPN (autostart)")
        val svc = Intent(ctx, WhispVpnService::class.java).apply {
            action = WhispVpnService.ACTION_BOOT
        }
        try {
            ctx.startForegroundService(svc)
        } catch (t: Throwable) {
            Log.w("BootReceiver", "startForegroundService failed: ${t.message}")
        }
    }
}
