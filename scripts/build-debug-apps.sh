#!/bin/bash
# 一键构建 macOS 调试版(用户端 + 管理端)。
# 修复两个历史踩坑:
#   1) cp -R 到已存在 .app 会嵌套成子目录 → 一律 mv 原地改名,目标先删;
#   2) 旧实例未退出时双击新 app 只是唤起旧进程 → 构建前先 pkill。
set -euo pipefail
cd "$(dirname "$0")/.."
export PATH="$HOME/.cargo/bin:$PATH"
BUNDLE_DIR="src-tauri/target/debug/bundle/macos"

pkill -f "玄枢录-用户端-debug" 2>/dev/null || true
pkill -f "玄枢录-管理端-debug" 2>/dev/null || true

echo "==> 构建用户端 debug"
npx tauri build --debug --bundles app
rm -rf "$BUNDLE_DIR/玄枢录-用户端-debug.app"
mv "$BUNDLE_DIR/玄枢录.app" "$BUNDLE_DIR/玄枢录-用户端-debug.app"

echo "==> 构建管理端 debug"
npx tauri build --debug --bundles app --features admin-signing
rm -rf "$BUNDLE_DIR/玄枢录-管理端-debug.app"
mv "$BUNDLE_DIR/玄枢录.app" "$BUNDLE_DIR/玄枢录-管理端-debug.app"

echo "==> 完成(旧实例已退出,直接打开以下两个 app 即为最新代码):"
echo "  $BUNDLE_DIR/玄枢录-用户端-debug.app"
echo "  $BUNDLE_DIR/玄枢录-管理端-debug.app"
