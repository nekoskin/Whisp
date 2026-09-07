//! JNI bindings. Компилируется только когда target=android + feature=jni-bindings.
//!
//! Kotlin side (схематично):
//!
//! ```kotlin
//! object WhispVpnNative {
//!     init { System.loadLibrary("whisp_vpn_android") }
//!     external fun nativeInit(): Long
//!     external fun nativeStart(tunFd: Int, service: WhispVpnService, mihomoPath: String): Long
//!     external fun nativeStop(handle: Long): Int
//!     external fun nativeFree(handle: Long)
//! }
//! ```

use jni::objects::{JClass, JObject, JString};
use jni::sys::{jint, jlong};
use jni::JNIEnv;
use std::path::PathBuf;

use crate::go_client_runner::{spawn_go_client, wait_socks_ready, GoClientChild};
use crate::mihomo_runner::{spawn_mihomo, MihomoChild};
use crate::VpnCore;

/// Хэндл, который мы возвращаем в Kotlin как jlong.
/// Содержит VpnCore (rules) + дочерний mihomo, чтобы nativeStop корректно
/// его остановил.
struct VpnSession {
    _core: VpnCore,
    mihomo: Option<MihomoChild>,
    go_client: Option<GoClientChild>,
}

fn box_handle(s: VpnSession) -> jlong {
    Box::into_raw(Box::new(s)) as jlong
}

unsafe fn borrow_handle<'a>(handle: jlong) -> Option<&'a mut VpnSession> {
    if handle == 0 {
        return None;
    }
    (handle as *mut VpnSession).as_mut()
}

#[no_mangle]
pub extern "system" fn Java_com_whispera_whisp_WhispVpnNative_nativeInit(
    _env: JNIEnv,
    _class: JClass,
) -> jlong {
    box_handle(VpnSession {
        _core: VpnCore::new(),
        mihomo: None,
        go_client: None,
    })
}

#[no_mangle]
pub extern "system" fn Java_com_whispera_whisp_WhispVpnNative_nativeLoadRules(
    mut env: JNIEnv,
    _class: JClass,
    handle: jlong,
    rules_json: JString,
) -> jint {
    let Some(session) = (unsafe { borrow_handle(handle) }) else {
        return -1;
    };
    let Ok(s) = env.get_string(&rules_json) else {
        return -2;
    };
    let s: String = s.into();
    match session._core.load_rules_json(&s) {
        Ok(n) => n as jint,
        Err(_) => -3,
    }
}

/// Запуск VPN с уже полученным TUN-fd от VpnService.Builder.
/// Spawn'ит mihomo с inherited fd + пользовательские правила из JSON.
///
/// Параметры:
/// - tun_fd: fd от ParcelFileDescriptor.getFd()
/// - _service: WhispVpnService (зарезервирован для protect()-callback в будущем)
/// - mihomo_path: полный путь к бинарю — обычно nativeLibraryDir/libmihomo.so
/// - rules_json: JSON-массив RoutingRule (см. crate::rules), пусто = только
///   fallback DIRECT
#[no_mangle]
pub extern "system" fn Java_com_whispera_whisp_WhispVpnNative_nativeStart(
    mut env: JNIEnv,
    _class: JClass,
    tun_fd: jint,
    _service: JObject,
    mihomo_path: JString,
    go_client_path: JString,
    rules_json: JString,
    conn_key: JString,
) -> jlong {
    let mihomo_path: String = match env.get_string(&mihomo_path) {
        Ok(s) => s.into(),
        Err(e) => {
            eprintln!("[whisp-vpn-android] mihomo_path: {}", e);
            return 0;
        }
    };
    let go_client_path: String = env
        .get_string(&go_client_path)
        .map(Into::into)
        .unwrap_or_default();
    let rules_str: String = env
        .get_string(&rules_json)
        .map(Into::into)
        .unwrap_or_default();
    let conn_key: String = env
        .get_string(&conn_key)
        .map(Into::into)
        .unwrap_or_default();

    let mihomo_path = PathBuf::from(mihomo_path);
    let mut session = VpnSession {
        _core: VpnCore::new(),
        mihomo: None,
        go_client: None,
    };
    if !rules_str.trim().is_empty() && rules_str.trim() != "[]" {
        let _ = session._core.load_rules_json(&rules_str);
    }

    // 1. go-client как локальный SOCKS5 upstream — только если есть key и binary.
    let socks_addr = "127.0.0.1:1080";
    let mut have_upstream = false;
    if !conn_key.is_empty() && !go_client_path.is_empty() {
        let gc_path = PathBuf::from(&go_client_path);
        match spawn_go_client(&gc_path, &conn_key, socks_addr) {
            Ok(c) => {
                eprintln!("[whisp-vpn-android] go-client pid={}", c.child.id());
                session.go_client = Some(c);
                if wait_socks_ready(socks_addr, 5000) {
                    have_upstream = true;
                    eprintln!("[whisp-vpn-android] go-client SOCKS5 ready");
                } else {
                    eprintln!(
                        "[whisp-vpn-android] go-client SOCKS5 not ready in 5s, fallback DIRECT"
                    );
                }
            }
            Err(e) => eprintln!("[whisp-vpn-android] spawn_go_client: {}", e),
        }
    } else {
        eprintln!("[whisp-vpn-android] no conn_key/go-client — DIRECT mode");
    }

    // 2. mihomo с tun fd. Если go-client поднял 1080 → MATCH,PROXY,
    //    иначе MATCH,DIRECT (transparent passthrough, тоннель есть но без
    //    прокси-сервера).
    let rules: Vec<crate::RoutingRule> = session._core.rules().rules().to_vec();
    let upstream = if have_upstream {
        Some(socks_addr)
    } else {
        None
    };
    let mihomo = match spawn_mihomo(
        &mihomo_path,
        tun_fd as std::os::unix::io::RawFd,
        upstream,
        &rules,
        "system",
    ) {
        Ok(c) => c,
        Err(e) => {
            eprintln!("[whisp-vpn-android] spawn_mihomo: {}", e);
            if let Some(mut g) = session.go_client.take() {
                g.kill();
            }
            return 0;
        }
    };
    session.mihomo = Some(mihomo);
    box_handle(session)
}

#[no_mangle]
pub extern "system" fn Java_com_whispera_whisp_WhispVpnNative_nativeStop(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) -> jint {
    if handle == 0 {
        return 0;
    }
    let mut session = unsafe { Box::from_raw(handle as *mut VpnSession) };
    if let Some(mut m) = session.mihomo.take() {
        m.kill();
    }
    if let Some(mut g) = session.go_client.take() {
        g.kill();
    }
    eprintln!("[whisp-vpn-android] nativeStop done");
    1
}

#[no_mangle]
pub extern "system" fn Java_com_whispera_whisp_WhispVpnNative_nativeFree(
    _env: JNIEnv,
    _class: JClass,
    handle: jlong,
) {
    if handle == 0 {
        return;
    }
    let mut session = unsafe { Box::from_raw(handle as *mut VpnSession) };
    if let Some(mut m) = session.mihomo.take() {
        m.kill();
    }
    if let Some(mut g) = session.go_client.take() {
        g.kill();
    }
}
