//! Отправка intent на WhispVpnService.ACTION_START / ACTION_STOP.
//!
//! Без этого Connect-кнопка ни к чему не подключена: Kotlin-сервис написан,
//! permission в манифесте есть, но никто не запускает сервис.
//!
//! Контекст и JavaVM достаём через ndk_context — Tauri 2 на Android их
//! инициализирует в своём JNI_OnLoad, так что здесь просто читаем готовое.
//!
//! Скомпилируется только под `target_os = "android"`. На desktop тушится
//! через cfg в lib.rs.

use jni::objects::{JObject, JValue};
use jni::JavaVM;
use std::sync::atomic::{AtomicBool, Ordering};

static VPN_ACTIVE: AtomicBool = AtomicBool::new(false);

pub fn is_vpn_active() -> bool { VPN_ACTIVE.load(Ordering::SeqCst) }
pub fn set_vpn_active(v: bool) { VPN_ACTIVE.store(v, Ordering::SeqCst); }

const SERVICE_CLASS: &str = "com/whispera/whisp/WhispVpnService";
const ACTION_START: &str = "com.whispera.whisp.ACTION_VPN_START";
const ACTION_STOP: &str = "com.whispera.whisp.ACTION_VPN_STOP";
const EXTRA_RULES_JSON: &str = "com.whispera.whisp.EXTRA_RULES_JSON";
const EXTRA_CONN_KEY: &str = "com.whispera.whisp.EXTRA_CONN_KEY";
const EXTRA_VPN_DNS: &str = "com.whispera.whisp.EXTRA_VPN_DNS";
const EXTRA_IPV6: &str = "com.whispera.whisp.EXTRA_IPV6";
const EXTRA_MITM: &str = "com.whispera.whisp.EXTRA_MITM";
const EXTRA_HWID: &str = "com.whispera.whisp.EXTRA_HWID";

fn vm_and_ctx() -> Result<(JavaVM, *mut std::ffi::c_void), String> {
    // SAFETY: ndk_context::android_context() возвращает указатели,
    // которые валидны до выгрузки приложения. JavaVM::from_raw — unsafe,
    // потому что нужно гарантировать, что ndk_context уже инициализирован
    // (Tauri 2 это делает).
    let ctx = ndk_context::android_context();
    if ctx.vm().is_null() || ctx.context().is_null() {
        return Err("ndk_context not initialized (no VM/Context)".to_string());
    }
    let vm = unsafe { JavaVM::from_raw(ctx.vm() as *mut _) }
        .map_err(|e| format!("JavaVM::from_raw: {}", e))?;
    Ok((vm, ctx.context()))
}

fn send_action(action: &str, rules_json: Option<&str>, conn_key: Option<&str>, vpn_dns: Option<&str>, ipv6: Option<bool>, mitm: Option<bool>, hwid: Option<bool>, _stop: bool) -> Result<(), String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm
        .attach_current_thread()
        .map_err(|e| format!("attach_current_thread: {}", e))?;

    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };

    // ClassLoader app_loader = context.getClassLoader()
    // Без этого find_class из non-Java thread'а не находит наши Kotlin-классы:
    // JVM использует system loader, а наши классы только в app's DEX.
    let app_loader = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l())
        .map_err(|e| format!("getClassLoader: {}", e))?;
    let svc_name = env
        .new_string(SERVICE_CLASS.replace('/', "."))
        .map_err(|e| format!("new_string svc: {}", e))?;
    let svc_class = env
        .call_method(
            &app_loader,
            "loadClass",
            "(Ljava/lang/String;)Ljava/lang/Class;",
            &[JValue::Object(&svc_name.into())],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("loadClass {}: {}", SERVICE_CLASS, e))?;

    let intent_class = env
        .find_class("android/content/Intent")
        .map_err(|e| format!("find_class Intent: {}", e))?;
    let intent = env
        .new_object(
            &intent_class,
            "(Landroid/content/Context;Ljava/lang/Class;)V",
            &[JValue::Object(&context), JValue::Object(&svc_class)],
        )
        .map_err(|e| format!("new Intent: {}", e))?;

    // intent.setAction(action)
    let action_jstr = env
        .new_string(action)
        .map_err(|e| format!("new_string action: {}", e))?;
    env.call_method(
        &intent,
        "setAction",
        "(Ljava/lang/String;)Landroid/content/Intent;",
        &[JValue::Object(&action_jstr.into())],
    )
    .map_err(|e| format!("setAction: {}", e))?;

    let mut put_extra = |k: &str, v: &str| -> Result<(), String> {
        let kj = env.new_string(k).map_err(|e| e.to_string())?;
        let vj = env.new_string(v).map_err(|e| e.to_string())?;
        env.call_method(
            &intent,
            "putExtra",
            "(Ljava/lang/String;Ljava/lang/String;)Landroid/content/Intent;",
            &[JValue::Object(&kj.into()), JValue::Object(&vj.into())],
        )
        .map_err(|e| format!("putExtra {}: {}", k, e))?;
        Ok(())
    };
    if let Some(rules) = rules_json { put_extra(EXTRA_RULES_JSON, rules)?; }
    if let Some(key) = conn_key { put_extra(EXTRA_CONN_KEY, key)?; }
    if let Some(dns) = vpn_dns { put_extra(EXTRA_VPN_DNS, dns)?; }
    if let Some(v6) = ipv6 { put_extra(EXTRA_IPV6, if v6 { "1" } else { "0" })?; }
    if let Some(m) = mitm { put_extra(EXTRA_MITM, if m { "1" } else { "0" })?; }
    if let Some(h) = hwid { put_extra(EXTRA_HWID, if h { "1" } else { "0" })?; }

    // Для старта и для стопа используем startForegroundService:
    // stopService() не вызывает onStartCommand, поэтому ACTION_STOP не доходит.
    // startForegroundService → onStartCommand → наш when(action) обрабатывает оба кейса.
    env.call_method(
        &context,
        "startForegroundService",
        "(Landroid/content/Intent;)Landroid/content/ComponentName;",
        &[JValue::Object(&intent)],
    )
    .map_err(|e| format!("startForegroundService: {}", e))?;

    Ok(())
}

pub fn start_vpn_service(rules_json: &str, conn_key: &str, vpn_dns: &str, ipv6: bool, mitm: bool, hwid: bool) -> Result<(), String> {
    let dns = if vpn_dns.is_empty() { None } else { Some(vpn_dns) };
    let r = send_action(ACTION_START, Some(rules_json), Some(conn_key), dns, Some(ipv6), Some(mitm), Some(hwid), false);
    if r.is_ok() { set_vpn_active(true); }
    r
}

pub fn stop_vpn_service() -> Result<(), String> {
    let r = send_action(ACTION_STOP, None, None, None, None, None, None, true);
    set_vpn_active(false);
    r
}

const PREP_CLASS: &str = "com/whispera/whisp/WhispVpnPrep";

/// Возвращает true если VPN permission уже выдан, false — нужно вызвать request_vpn_permission.
pub fn is_vpn_prepared() -> Result<bool, String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };
    let app_loader = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l())
        .map_err(|e| format!("getClassLoader: {}", e))?;
    let cls_name = env
        .new_string(PREP_CLASS.replace('/', "."))
        .map_err(|e| e.to_string())?;
    let cls = env
        .call_method(
            &app_loader,
            "loadClass",
            "(Ljava/lang/String;)Ljava/lang/Class;",
            &[JValue::Object(&cls_name.into())],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("loadClass {}: {}", PREP_CLASS, e))?;
    let cls_class: jni::objects::JClass = cls.into();
    let result = env
        .call_static_method(&cls_class, "isPrepared", "()Z", &[])
        .and_then(|v| v.z())
        .map_err(|e| format!("isPrepared: {}", e))?;
    Ok(result)
}

/// Открывает системный диалог 'Allow VPN'. Возвращает Ok(true) если диалог
/// показан/уже approved, Err при отсутствии MainActivity.
pub fn request_vpn_permission() -> Result<i32, String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };
    let app_loader = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l())
        .map_err(|e| format!("getClassLoader: {}", e))?;
    let cls_name = env
        .new_string(PREP_CLASS.replace('/', "."))
        .map_err(|e| e.to_string())?;
    let cls = env
        .call_method(
            &app_loader,
            "loadClass",
            "(Ljava/lang/String;)Ljava/lang/Class;",
            &[JValue::Object(&cls_name.into())],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("loadClass {}: {}", PREP_CLASS, e))?;
    let cls_class: jni::objects::JClass = cls.into();
    let result = env
        .call_static_method(&cls_class, "requestPermission", "()I", &[])
        .and_then(|v| v.i())
        .map_err(|e| format!("requestPermission: {}", e))?;
    Ok(result)
}

/// Сохраняет параметры VPN в WhispVpnPrep.savePending() для авто-запуска
/// после onActivityResult (пользователь разрешил VPN).
pub fn save_pending_start(rules_json: &str, conn_key: &str, vpn_dns: &str, ipv6: bool, mitm: bool, hwid: bool) -> Result<(), String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };
    let app_loader = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l())
        .map_err(|e| format!("getClassLoader: {}", e))?;
    let cls_name = env.new_string(PREP_CLASS.replace('/', ".")).map_err(|e| e.to_string())?;
    let cls = env
        .call_method(&app_loader, "loadClass", "(Ljava/lang/String;)Ljava/lang/Class;", &[JValue::Object(&cls_name.into())])
        .and_then(|v| v.l())
        .map_err(|e| format!("loadClass WhispVpnPrep: {}", e))?;
    let cls_class: jni::objects::JClass = cls.into();
    let j_rules  = env.new_string(rules_json).map_err(|e| e.to_string())?;
    let j_key    = env.new_string(conn_key).map_err(|e| e.to_string())?;
    let j_dns    = env.new_string(vpn_dns).map_err(|e| e.to_string())?;
    env.call_static_method(
        &cls_class,
        "savePending",
        "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;ZZZ)V",
        &[
            JValue::Object(&j_rules.into()),
            JValue::Object(&j_key.into()),
            JValue::Object(&j_dns.into()),
            JValue::Bool(if ipv6 { 1 } else { 0 }),
            JValue::Bool(if mitm { 1 } else { 0 }),
            JValue::Bool(if hwid { 1 } else { 0 }),
        ],
    )
    .map_err(|e| format!("savePending: {}", e))?;
    Ok(())
}

pub fn is_vpn_service_running() -> bool {
    let Ok((vm, ctx_ptr)) = vm_and_ctx() else { return false; };
    let Ok(mut env) = vm.attach_current_thread() else { return false; };
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };
    let Ok(loader) = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l()) else { return false; };
    let Ok(cls_name) = env.new_string(SERVICE_CLASS.replace('/', ".")) else { return false; };
    let Ok(cls) = env
        .call_method(&loader, "loadClass", "(Ljava/lang/String;)Ljava/lang/Class;", &[JValue::Object(&cls_name.into())])
        .and_then(|v| v.l()) else { return false; };
    let cls_class: jni::objects::JClass = cls.into();
    env.call_static_method(
        &cls_class,
        "isActuallyRunning",
        "(Landroid/content/Context;)Z",
        &[JValue::Object(&context)],
    )
    .and_then(|v| v.z())
    .unwrap_or(false)
}

/// Installs a CA certificate via WhispVpnPrep.installCaCert().
/// Returns Ok(None) when KeyChain intent was launched (Android < 11),
/// Ok(Some(path)) when cert was saved to Downloads (Android 11+ blocks KeyChain for CAs).
pub fn install_ca_cert_android(cert_der: &[u8]) -> Result<Option<String>, String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm.attach_current_thread().map_err(|e| format!("attach: {}", e))?;
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };

    let app_loader = env
        .call_method(&context, "getClassLoader", "()Ljava/lang/ClassLoader;", &[])
        .and_then(|v| v.l())
        .map_err(|e| format!("getClassLoader: {}", e))?;
    let cls_name = env
        .new_string(PREP_CLASS.replace('/', "."))
        .map_err(|e| format!("new_string cls_name: {}", e))?;
    let prep_cls_obj = env
        .call_method(
            &app_loader,
            "loadClass",
            "(Ljava/lang/String;)Ljava/lang/Class;",
            &[JValue::Object(&cls_name.into())],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("loadClass {}: {}", PREP_CLASS, e))?;
    let prep_class: jni::objects::JClass = prep_cls_obj.into();

    let cert_jarray = env
        .byte_array_from_slice(cert_der)
        .map_err(|e| format!("byte_array_from_slice: {}", e))?;
    let cert_jobj: JObject = cert_jarray.into();

    let result_obj = env
        .call_static_method(
            &prep_class,
            "installCaCert",
            "(Landroid/content/Context;[B)Ljava/lang/String;",
            &[JValue::Object(&context), JValue::Object(&cert_jobj)],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("installCaCert: {}", e))?;

    let result: String = env
        .get_string(&result_obj.into())
        .map_err(|e| format!("get result string: {}", e))?
        .into();

    if let Some(path) = result.strip_prefix("saved:") {
        Ok(Some(path.to_string()))
    } else if result.starts_with("error:") {
        Err(result["error:".len()..].to_string())
    } else {
        Ok(None) // "ok" — KeyChain intent launched
    }
}

/// Открывает URL через Android Intent.ACTION_VIEW.
pub fn open_url_android(url: &str) -> Result<(), String> {
    let (vm, ctx_ptr) = vm_and_ctx()?;
    let mut env = vm.attach_current_thread().map_err(|e| e.to_string())?;
    let context = unsafe { JObject::from_raw(ctx_ptr as jni::sys::jobject) };

    let uri_class = env.find_class("android/net/Uri").map_err(|e| format!("find Uri: {}", e))?;
    let j_url = env.new_string(url).map_err(|e| e.to_string())?;
    let uri = env
        .call_static_method(&uri_class, "parse", "(Ljava/lang/String;)Landroid/net/Uri;",
            &[JValue::Object(&j_url.into())])
        .and_then(|v| v.l())
        .map_err(|e| format!("Uri.parse: {}", e))?;

    let intent_class = env.find_class("android/content/Intent").map_err(|e| format!("find Intent: {}", e))?;
    let action_view = env.new_string("android.intent.action.VIEW").map_err(|e| e.to_string())?;
    let intent = env
        .new_object(&intent_class, "(Ljava/lang/String;Landroid/net/Uri;)V",
            &[JValue::Object(&action_view.into()), JValue::Object(&uri)])
        .map_err(|e| format!("new Intent: {}", e))?;

    // FLAG_ACTIVITY_NEW_TASK required when starting Activity from non-Activity context
    env.call_method(&intent, "addFlags", "(I)Landroid/content/Intent;",
        &[JValue::Int(0x10000000)])  // FLAG_ACTIVITY_NEW_TASK
        .map_err(|e| format!("addFlags: {}", e))?;

    env.call_method(&context, "startActivity", "(Landroid/content/Intent;)V",
        &[JValue::Object(&intent)])
        .map_err(|e| format!("startActivity: {}", e))?;

    Ok(())
}
