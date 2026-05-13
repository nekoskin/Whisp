//! Whisp VPN core для Android.
//!
//! Общая стратегия: на desktop роутингом занимается mihomo (TUN + rules);
//! на Android нельзя запустить sidecar-демон — VPN-функциональность реализуется
//! внутри приложения через `android.net.VpnService`. Этот crate содержит
//! платформо-независимое ядро (rules engine + transport dispatcher) и JNI-мост,
//! через который Kotlin/Java слой отдаёт нам raw-пакеты из TUN-fd и принимает
//! обратно отправленные пакеты.
//!
//! Статус: skeleton. Настоящая логика роутинга будет добавляться по мере
//! миграции правил из mihomo config в нативный код.
//!
//! Не зависит от mihomo — чистый Rust, чтобы тестировать и на desktop.

mod rules;

pub use rules::{RoutingAction, RoutingRule, RulesEngine};

// Кольцевой буфер логов подпроцессов (go-client, sing-box).
// Заполняется drain-потоками; читается командой get_vpn_log из Tauri.
#[cfg(target_os = "android")]
static LOG_BUFFER: std::sync::Mutex<std::collections::VecDeque<String>> =
    std::sync::Mutex::new(std::collections::VecDeque::new());
#[cfg(target_os = "android")]
const LOG_MAX: usize = 500;

#[cfg(target_os = "android")]
pub fn push_log(line: String) {
    if let Ok(mut buf) = LOG_BUFFER.lock() {
        if buf.len() >= LOG_MAX { buf.pop_front(); }
        buf.push_back(line);
    }
}

#[cfg(target_os = "android")]
pub fn drain_log() -> Vec<String> {
    LOG_BUFFER.lock().map(|mut b| b.drain(..).collect()).unwrap_or_default()
}

#[cfg(all(target_os = "android", feature = "jni-bindings"))]
mod jni_glue;

// Отправка intent на WhispVpnService — используется из Tauri-команды `connect`
// в src-tauri/src/lib.rs под cfg(android), чтобы запустить VpnService.
#[cfg(target_os = "android")]
pub mod service_intent;

// Запуск mihomo с inherited TUN-fd — реальная маршрутизация пакетов на Android.
#[cfg(target_os = "android")]
pub mod mihomo_runner;

// go-client как локальный SOCKS5 upstream для mihomo.
#[cfg(target_os = "android")]
pub mod go_client_runner;

// PackageManager listing для UI пикера приложений в правилах маршрутизации.
#[cfg(target_os = "android")]
pub mod pkg_list;

/// Публичная точка входа для инициализации VPN-ядра.
/// На Android вызывается из Kotlin через JNI после `VpnService.Builder.establish()`.
/// На desktop — тесты / dev-smoke.
pub struct VpnCore {
    rules: RulesEngine,
}

impl VpnCore {
    pub fn new() -> Self {
        Self {
            rules: RulesEngine::new(),
        }
    }

    pub fn load_rules_json(&mut self, json: &str) -> Result<usize, String> {
        self.rules.load_from_json(json)
    }

    pub fn rules(&self) -> &RulesEngine {
        &self.rules
    }
}

impl Default for VpnCore {
    fn default() -> Self {
        Self::new()
    }
}
