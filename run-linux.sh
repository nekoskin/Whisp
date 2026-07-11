#!/usr/bin/env bash
# One-shot: install deps + grant mihomo caps + run Whisp desktop (WSL2 Ubuntu / Arch).
# Usage:  bash run-linux.sh
set -e
cd "$(cd "$(dirname "$0")" && pwd)"

echo "== deps =="
if command -v apt >/dev/null 2>&1; then
  sudo apt update
  sudo apt install -y libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev \
    librsvg2-dev libssl-dev build-essential curl wget file libcap2-bin
  if ! command -v node >/dev/null 2>&1; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt install -y nodejs
  fi
elif command -v pacman >/dev/null 2>&1; then
  sudo pacman -Sy --needed --noconfirm webkit2gtk-4.1 gtk3 \
    librsvg openssl base-devel curl wget file libcap nodejs npm
  # tray dep lives in the AUR on Arch; skip if unavailable (tray is optional).
  sudo pacman -S --needed --noconfirm libayatana-appindicator 2>/dev/null \
    || echo "note: libayatana-appindicator not in official repos (AUR) — skipping"
else
  echo "unsupported distro (need apt or pacman)"; exit 1
fi

if ! command -v cargo >/dev/null 2>&1; then
  echo "== rust =="
  curl https://sh.rustup.rs -sSf | sh -s -- -y
  . "$HOME/.cargo/env"
fi

echo "== linux binaries =="
chmod +x src-tauri/binaries/* 2>/dev/null || true
MIHOMO="src-tauri/binaries/mihomo-x86_64-unknown-linux-gnu"
GOCLI="src-tauri/binaries/whispera-go-client-x86_64-unknown-linux-gnu"
for f in "$MIHOMO" "$GOCLI"; do
  [ -f "$f" ] || { echo "MISSING: $f"; exit 1; }
done
# Grant caps so mihomo/go-client raise the TUN without root or a pkexec prompt.
sudo setcap 'cap_net_admin,cap_net_bind_service=+ep' "$MIHOMO" || true
sudo setcap 'cap_net_admin,cap_net_bind_service=+ep' "$GOCLI" || true

echo "== build + run =="
npm install
exec npm run tauri dev
