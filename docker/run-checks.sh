#!/bin/sh
set -u

failed=""

check() {
  name=$1
  shift
  echo "==> $name"
  if "$@"; then
    echo "<== $name: ok"
  else
    echo "<== $name: FAILED"
    failed="$failed $name"
  fi
}

host_triple=$(rustc -vV | sed -n 's/^host: //p')
export WHISP_MIHOMO_BIN="${WHISP_MIHOMO_BIN:-$PWD/src-tauri/binaries/mihomo-$host_triple}"

check ui-thread python3 scripts/check_ui_thread.py
cd src-tauri
check fmt cargo fmt --all --check
check clippy cargo clippy --all-targets -- -D warnings
check unit-tests cargo test --workspace
check sidecar-tests cargo test --workspace -- --ignored

if [ -n "$failed" ]; then
  echo "failed:$failed"
  exit 1
fi
echo "all checks passed"
