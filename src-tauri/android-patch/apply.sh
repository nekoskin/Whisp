#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GEN="$ROOT/gen/android"
PKG_DIR="$GEN/app/src/main/java/com/whispera/whisp"
MANIFEST="$GEN/app/src/main/AndroidManifest.xml"
WRYACT="$GEN/app/src/main/java/com/whispera/whisp/generated/WryActivity.kt"

if [ ! -d "$GEN" ]; then
  echo "[android-patch] gen/android not found" >&2
  exit 1
fi

echo "[android-patch] copying Kotlin files → $PKG_DIR"
mkdir -p "$PKG_DIR"
cp "$ROOT/android-patch/java/com/whispera/whisp/"*.kt "$PKG_DIR/"

# Tauri 2 mobile НЕ копирует externalBin в APK (отличие от desktop). Делаем
# вручную: бинарь <name>-aarch64-linux-android → jniLibs/arm64-v8a/lib<name>.so.
# Только так файл попадает в applicationInfo.nativeLibraryDir на устройстве
# с правом exec (data dir noexec на Android 10+).
JNILIBS="$GEN/app/src/main/jniLibs/arm64-v8a"
mkdir -p "$JNILIBS"
for sidecar in whispera-go-client whispera-ml-server; do
  src="$ROOT/binaries/${sidecar}-aarch64-linux-android"
  dst="$JNILIBS/lib${sidecar}.so"
  if [ -f "$src" ]; then
    cp "$src" "$dst"
    chmod +x "$dst"
    echo "[android-patch] sidecar $sidecar → $dst"
  else
    echo "[android-patch] WARN: $src not found"
  fi
done

# Tauri 2 codegen на некоторых конфигурациях кладёт `import android.content.Intent`
# внутрь `companion object` в WryActivity.kt — невалидный Kotlin. Вырезаем строку.
if [ -f "$WRYACT" ]; then
  python3 - <<PY
import pathlib, re
p = pathlib.Path("$WRYACT")
src = p.read_text(encoding="utf-8")
new = re.sub(r"\n\s*import\s+android\.content\.Intent\s*\n", "\n", src)
if new != src:
    p.write_text(new, encoding="utf-8")
    print("[android-patch] WryActivity.kt: removed misplaced import")
PY
fi

if grep -q "WhispVpnService" "$MANIFEST"; then
  echo "[android-patch] manifest already patched"
else
  ADDITIONS="$ROOT/android-patch/manifest/manifest-additions.xml"
  PERMS_FILE=$(mktemp)
  SVC_FILE=$(mktemp)
  awk '/^PERMISSIONS:/{flag=1; next} /^SERVICE:/{flag=0} flag' "$ADDITIONS" > "$PERMS_FILE"
  awk '/^SERVICE:/{flag=1; next} flag' "$ADDITIONS" > "$SVC_FILE"
  python3 - "$MANIFEST" "$PERMS_FILE" "$SVC_FILE" <<'PY'
import re, sys, pathlib
manifest_path, perms_path, svc_path = sys.argv[1:4]
p = pathlib.Path(manifest_path)
src = p.read_text(encoding="utf-8")
perms = pathlib.Path(perms_path).read_text(encoding="utf-8").rstrip()
service = pathlib.Path(svc_path).read_text(encoding="utf-8").rstrip()
src = re.sub(r"(<manifest[^>]*>)", r"\1\n" + perms, src, count=1)
src = re.sub(r"(</application>)", service + "\n    " + r"\1", src, count=1)
p.write_text(src, encoding="utf-8")
print("[android-patch] manifest patched")
PY
  rm -f "$PERMS_FILE" "$SVC_FILE"
  echo "[android-patch] === resulting AndroidManifest.xml ==="
  cat "$MANIFEST"
fi

# extractNativeLibs=true через Gradle (надёжнее чем manifest patching).
# Без этого .so файлы лежат внутри APK без распаковки и File.exists() даёт false.
APP_GRADLE="$GEN/app/build.gradle.kts"
if [ -f "$APP_GRADLE" ]; then
  python3 - <<PY
import pathlib, re
p = pathlib.Path("$APP_GRADLE")
src = p.read_text(encoding="utf-8")

# useLegacyPackaging
if "useLegacyPackaging" not in src:
    inject = "    packagingOptions {\n        jniLibs {\n            useLegacyPackaging = true\n        }\n    }\n"
    src = re.sub(r"(android \{)", r"\1\n" + inject, src, count=1)
    print("[android-patch] gradle: useLegacyPackaging=true added")

# singbox.aar как fileTree dependency
if "fileTree" not in src:
    dep = '    implementation(fileTree(mapOf("dir" to "libs", "include" to listOf("*.aar"))))\n'
    src = re.sub(r"(dependencies \{)", r"\1\n" + dep, src, count=1)
    print("[android-patch] gradle: singbox.aar dependency added")

p.write_text(src, encoding="utf-8")
PY
fi

# Patch MainActivity: add onAttachedToWindow with systemGestureExclusionRects
# so left-edge swipes reach the WebView instead of being swallowed by system nav.
if [ -f "$PKG_DIR/MainActivity.kt" ] && ! grep -q "systemGestureExclusionRects" "$PKG_DIR/MainActivity.kt"; then
  export _MAINACT="$PKG_DIR/MainActivity.kt"
  python3 << 'PYEOF'
import pathlib, os
p = pathlib.Path(os.environ["_MAINACT"])
src = p.read_text(encoding="utf-8")

# Inject imports after last existing import line (or after package line)
override_method = """
    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
            window.decorView.post {
                window.systemGestureExclusionRects = listOf(android.graphics.Rect(0, 0, 200, window.decorView.height))
            }
        }
    }"""

# Insert before the last closing brace of the class
idx = src.rfind("}")
src = src[:idx] + override_method + "\n" + src[idx:]

# Add imports if missing
if "android.graphics.Rect" not in src:
    src = src.replace("import android.os.Bundle",
                      "import android.graphics.Rect\nimport android.os.Bundle", 1)

p.write_text(src, encoding="utf-8")
print("[android-patch] MainActivity: systemGestureExclusionRects injected")
PYEOF
fi

echo "[android-patch] done"
