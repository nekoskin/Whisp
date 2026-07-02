package com.whispera.whisp

object WhispVpnNative {
    init { System.loadLibrary("whisp_lib") }
    @JvmStatic external fun nativeInit(): Long
    @JvmStatic external fun nativeStart(
        tunFd: Int,
        service: WhispVpnService,
        mihomoPath: String,
        goClientPath: String,
        rulesJson: String,
        connKey: String,
    ): Long
    @JvmStatic external fun nativeStop(handle: Long): Int
    @JvmStatic external fun nativeFree(handle: Long)
}
