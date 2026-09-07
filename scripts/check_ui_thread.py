#!/usr/bin/env python3
"""Guard against freezing the window.

A synchronous #[tauri::command] runs on the UI thread. If it waits for a mutex
that connect/disconnect holds, the window stops repainting for as long as that
operation takes -- and those operations spawn processes and can sit on a UAC
prompt, which has no time limit.

So: a synchronous command may not call .lock(). It can use try_lock() and fall
back to a cached answer, or the command can be declared async, which moves it
off the UI thread.
"""

import re
import sys
from pathlib import Path

# Short-lived locks that never guard an external operation.
ALLOWED = {"GO_CLIENT_LOG_OFFSET"}


def commands(text):
    lines = text.splitlines()
    i = 0
    while i < len(lines):
        if lines[i].strip() == "#[tauri::command]":
            j = i + 1
            while j < len(lines) and lines[j].strip().startswith("#["):
                j += 1
            if j < len(lines):
                sig = lines[j].strip()
                m = re.match(r"(?:pub )?(async )?fn (\w+)", sig)
                if m:
                    is_async = bool(m.group(1))
                    name = m.group(2)
                    depth, k, body = 0, j, []
                    while k < len(lines):
                        depth += lines[k].count("{") - lines[k].count("}")
                        body.append((k + 1, lines[k]))
                        if depth == 0 and k > j:
                            break
                        k += 1
                    yield name, is_async, body
        i += 1


def main():
    root = Path(__file__).resolve().parent.parent
    failures = []
    for path in (root / "src-tauri" / "src").rglob("*.rs"):
        text = path.read_text(encoding="utf-8", errors="replace")
        for name, is_async, body in commands(text):
            if is_async:
                continue
            for lineno, line in body:
                if ".lock()" not in line:
                    continue
                if any(a in line for a in ALLOWED):
                    continue
                failures.append(f"{path.relative_to(root)}:{lineno}: {name} is synchronous and calls .lock()")

    if failures:
        print("A synchronous tauri command must not wait for a lock:\n")
        for f in failures:
            print("  " + f)
        print("\nDeclare the command async, or use try_lock() with a cached answer.")
        return 1

    print("ok: no synchronous command waits for a lock")
    return 0


if __name__ == "__main__":
    sys.exit(main())
