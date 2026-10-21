#!/bin/bash
# 安卓热更新开发：先建立 adb 端口转发，再启动 tauri android dev。
#
# 为什么必须先 reverse：
# Tauri 检测到局域网 IP 时会把 devUrl 改写成 http://<局域网IP>:9898，但 WebView 的
# 页面源是 http://tauri.localhost，Vite 客户端按页面源去连 localhost:9898——手机上
# 这个地址不存在，于是 HMR WebSocket 一直 failing。表现就是「改代码没反应，必须
# 重启 app 才能看到新版本」。reverse 之后手机访问 localhost:9898 会被 adb 转发到本机。
#
# reverse 是会话级的，拔线或 adb 重启即失效，所以每次启动都重建一次（幂等）。
set -euo pipefail
cd "$(dirname "$0")/.."

ADB="${ANDROID_HOME:-/opt/homebrew/share/android-commandlinetools}/platform-tools/adb"
[ -x "$ADB" ] || ADB="$(command -v adb || true)"
if [ -z "$ADB" ] || [ ! -x "$ADB" ]; then
    echo "找不到 adb：请设置 ANDROID_HOME 或把 platform-tools 加进 PATH" >&2
    exit 1
fi

if ! "$ADB" get-state >/dev/null 2>&1; then
    echo "没有已连接的安卓设备（先插线并确认 adb devices 能看到它）" >&2
    exit 1
fi

echo "==> 建立 adb reverse tcp:9898"
"$ADB" reverse tcp:9898 tcp:9898
"$ADB" reverse --list

echo "==> 启动 tauri android dev（前端改动热更新；Rust 改动会自动重编译重装）"
exec npx tauri android dev "$@"
