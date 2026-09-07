//! Список установленных пользовательских приложений через PackageManager.
//!
//! Используется UI Whisp (страница Маршруты → "Приложение") чтобы показать
//! пикер из реально установленных пакетов вместо file-input как на desktop.
//!
//! Возвращаем (package_name, label) — package для mihomo PROCESS-NAME,
//! label для отображения юзеру.
//!
//! Используем queryIntentActivities(ACTION_MAIN + CATEGORY_LAUNCHER) вместо
//! getInstalledApplications, чтобы получить ровно те приложения, которые
//! видны пользователю в лаунчере — без системных сервисов и фреймворков.

use jni::objects::{JObject, JValue};
use jni::JavaVM;
use std::collections::HashSet;

#[derive(Debug, Clone)]
pub struct InstalledApp {
    pub package: String,
    pub label: String,
}

pub fn list_user_packages() -> Result<Vec<InstalledApp>, String> {
    let ctx = ndk_context::android_context();
    if ctx.vm().is_null() || ctx.context().is_null() {
        return Err("ndk_context not initialized".to_string());
    }
    let vm = unsafe { JavaVM::from_raw(ctx.vm() as *mut _) }
        .map_err(|e| format!("JavaVM::from_raw: {}", e))?;
    let mut env = vm
        .attach_current_thread()
        .map_err(|e| format!("attach_current_thread: {}", e))?;
    let context = unsafe { JObject::from_raw(ctx.context() as jni::sys::jobject) };

    // PackageManager pm = context.getPackageManager();
    let pm = env
        .call_method(
            &context,
            "getPackageManager",
            "()Landroid/content/pm/PackageManager;",
            &[],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("getPackageManager: {}", e))?;

    // Intent intent = new Intent("android.intent.action.MAIN");
    let intent_class = env
        .find_class("android/content/Intent")
        .map_err(|e| format!("find_class Intent: {}", e))?;
    let action = env
        .new_string("android.intent.action.MAIN")
        .map_err(|e| format!("new_string action: {}", e))?;
    let intent = env
        .new_object(
            &intent_class,
            "(Ljava/lang/String;)V",
            &[JValue::Object(&action)],
        )
        .map_err(|e| format!("new Intent: {}", e))?;

    // intent.addCategory("android.intent.category.LAUNCHER");
    let category = env
        .new_string("android.intent.category.LAUNCHER")
        .map_err(|e| format!("new_string category: {}", e))?;
    env.call_method(
        &intent,
        "addCategory",
        "(Ljava/lang/String;)Landroid/content/Intent;",
        &[JValue::Object(&category)],
    )
    .map_err(|e| format!("addCategory: {}", e))?;

    // List<ResolveInfo> list = pm.queryIntentActivities(intent, 0);
    let list = env
        .call_method(
            &pm,
            "queryIntentActivities",
            "(Landroid/content/Intent;I)Ljava/util/List;",
            &[JValue::Object(&intent), JValue::Int(0)],
        )
        .and_then(|v| v.l())
        .map_err(|e| format!("queryIntentActivities: {}", e))?;

    let size = env
        .call_method(&list, "size", "()I", &[])
        .and_then(|v| v.i())
        .map_err(|e| format!("List.size: {}", e))?;

    let mut out = Vec::with_capacity(size as usize);
    let mut seen: HashSet<String> = HashSet::new();

    for i in 0..size {
        let resolve_info = env
            .call_method(&list, "get", "(I)Ljava/lang/Object;", &[JValue::Int(i)])
            .and_then(|v| v.l())
            .map_err(|e| format!("List.get({}): {}", i, e))?;

        // ResolveInfo.activityInfo (ActivityInfo extends ComponentInfo extends PackageItemInfo)
        let activity_info = env
            .get_field(
                &resolve_info,
                "activityInfo",
                "Landroid/content/pm/ActivityInfo;",
            )
            .and_then(|v| v.l())
            .map_err(|e| format!("activityInfo[{}]: {}", i, e))?;

        // ComponentInfo.packageName
        let pkg_obj = env
            .get_field(&activity_info, "packageName", "Ljava/lang/String;")
            .and_then(|v| v.l())
            .map_err(|e| format!("packageName[{}]: {}", i, e))?;
        let pkg: String = env
            .get_string(&pkg_obj.into())
            .map_err(|e| format!("packageName get_string[{}]: {}", i, e))?
            .into();

        if !seen.insert(pkg.clone()) {
            continue; // одно приложение может иметь несколько launcher-активностей
        }

        // ComponentInfo.applicationInfo
        let app_info = env
            .get_field(
                &activity_info,
                "applicationInfo",
                "Landroid/content/pm/ApplicationInfo;",
            )
            .and_then(|v| v.l())
            .map_err(|e| format!("applicationInfo[{}]: {}", i, e))?;

        // pm.getApplicationLabel(applicationInfo).toString()
        let label_cs = env
            .call_method(
                &pm,
                "getApplicationLabel",
                "(Landroid/content/pm/ApplicationInfo;)Ljava/lang/CharSequence;",
                &[JValue::Object(&app_info)],
            )
            .and_then(|v| v.l())
            .map_err(|e| format!("getApplicationLabel[{}]: {}", i, e))?;
        let label_str = env
            .call_method(&label_cs, "toString", "()Ljava/lang/String;", &[])
            .and_then(|v| v.l())
            .map_err(|e| format!("label.toString[{}]: {}", i, e))?;
        let label: String = env
            .get_string(&label_str.into())
            .map_err(|e| format!("label get_string[{}]: {}", i, e))?
            .into();

        out.push(InstalledApp {
            package: pkg,
            label,
        });
    }

    out.sort_by(|a, b| a.label.to_lowercase().cmp(&b.label.to_lowercase()));
    Ok(out)
}
