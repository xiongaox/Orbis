#!/usr/bin/env bash
# ==============================================================================
# build-worktree.sh
# 在指定的 Worktree 目录下执行完整分级编译与代码自检
# 严格遵守交付纪律：绝不自启任何开发服务或 Tauri 客户端
# ==============================================================================
set -euo pipefail

# 颜色输出定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
GRAY='\033[0;90m'
NC='\033[0m' # No Color

print_info()    { echo -e "${CYAN}[*]${NC} $1"; }
print_success() { echo -e "${GREEN}[+]${NC} $1"; }
print_warn()    { echo -e "${YELLOW}[!]${NC} $1"; }
print_error()   { echo -e "${RED}[ERROR]${NC} $1"; }

TARGET_PATH=""
BUILD_TAURI=false
SKIP_LINT=false
SKIP_TEST=false
SKIP_TYPECHECK=false

usage() {
  cat <<EOF
用法: $0 [选项]

选项:
  -p, --path <dir>          指定需编译的 Worktree 目录（默认为当前目录）
  -t, --tauri               在前端构建完成后，额外执行 Rust cargo test 与 tauri build
  --skip-lint               跳过 ESLint 代码风格检查
  --skip-test               跳过 Vitest 单元测试
  --skip-typecheck          跳过 TypeScript 类型检查 (tsc -b)
  -h, --help                显示本帮助信息

示例:
  $0                        # 在当前 worktree 下执行标准前端自检与构建 (lint + tsc + test + build)
  $0 -p ../worktree/Orbis/dev-12345678  # 指定目标 worktree 目录
  $0 -t                     # 完整构建，包含 Tauri 客户端桌面构建与 Rust 校验
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--path)
      TARGET_PATH="$2"
      shift 2
      ;;
    -t|--tauri)
      BUILD_TAURI=true
      shift
      ;;
    --skip-lint)
      SKIP_LINT=true
      shift
      ;;
    --skip-test)
      SKIP_TEST=true
      shift
      ;;
    --skip-typecheck)
      SKIP_TYPECHECK=true
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      print_error "未知选项: $1"
      usage
      exit 1
      ;;
  esac
done

# 1. 确定目标工作树目录
if [[ -z "$TARGET_PATH" ]]; then
  TARGET_PATH="$(pwd -P)"
else
  TARGET_PATH="$(cd "$TARGET_PATH" && pwd -P)"
fi

if [[ ! -f "$TARGET_PATH/package.json" ]]; then
  print_error "目标路径不是有效的 Orbis 项目目录（未找到 package.json）: $TARGET_PATH"
  exit 1
fi

echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  Orbis Worktree 构建与自检                       ${NC}"
echo -e "${CYAN}==================================================${NC}"
print_info "工作树目录: $TARGET_PATH"
print_info "包含 Tauri 构建: $BUILD_TAURI"

START_TIME=$(date +%s)

# 2. 代码质量检查 (ESLint)
if [[ "$SKIP_LINT" == false ]]; then
  print_info "步骤 1/4: 执行 ESLint 代码规范检查 (npm run lint)..."
  (cd "$TARGET_PATH" && npm run lint)
  print_success "ESLint 检查通过。"
else
  print_warn "跳过 ESLint 代码规范检查。"
fi

# 3. TypeScript 严格类型检查 (tsc -b)
if [[ "$SKIP_TYPECHECK" == false ]]; then
  print_info "步骤 2/4: 执行 TypeScript 严格类型检查 (npx tsc -b)..."
  (cd "$TARGET_PATH" && npx tsc -b)
  print_success "TypeScript 类型检查通过。"
else
  print_warn "跳过 TypeScript 类型检查。"
fi

# 4. 单元测试 (Vitest)
if [[ "$SKIP_TEST" == false ]]; then
  print_info "步骤 3/4: 执行前端自动化单元测试 (npm test)..."
  (cd "$TARGET_PATH" && npm test)
  print_success "自动化单元测试通过。"
else
  print_warn "跳过自动化单元测试。"
fi

# 5. 前端生产构建 (Vite build)
print_info "步骤 4/4: 执行前端生产环境打包 (npm run build)..."
(cd "$TARGET_PATH" && npm run build)
print_success "前端生产打包成功！"

# 校验前端产物
DIST_INDEX="$TARGET_PATH/dist/index.html"
if [[ -f "$DIST_INDEX" ]]; then
  DIST_SIZE=$(du -sh "$TARGET_PATH/dist" | cut -f1)
  print_success "前端产物目录 dist/ 已生成 (总大小: $DIST_SIZE)。"
fi

# 6. 可选：Tauri 桌面端构建与 Rust 校验
if [[ "$BUILD_TAURI" == true ]]; then
  print_info "正在执行 Tauri Rust 安全层与核心逻辑测试 (cargo test)..."
  (cd "$TARGET_PATH/src-tauri" && cargo test)
  print_success "Tauri Rust 测试全部通过。"

  print_info "正在执行 Tauri 客户端打包 (npm run tauri:build)..."
  (cd "$TARGET_PATH" && npm run tauri:build)
  print_success "Tauri 客户端打包完成！"
fi

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}[+] 需求代码构建与自检全部成功！(耗时 ${DURATION}s)${NC}"
echo -e "    构建工作树: ${CYAN}$TARGET_PATH${NC}"
if [[ -f "$DIST_INDEX" ]]; then
  echo -e "    前端产物  : ${GREEN}$TARGET_PATH/dist/index.html${NC}"
fi
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${YELLOW}【重要交付提示】${NC}"
echo -e "根据 Orbis 项目交付规范，Agent 严格不会自动启动开发服务器或拉起桌面客户端。"
echo -e "请由用户根据实际调试诉求手动执行以下命令："
echo ""
echo -e "  # 1. 本地启动开发服务器调试 (推荐端口 9899)"
echo -e "  ${CYAN}cd \"$TARGET_PATH\" && npm run dev -- --port 9899${NC}"
echo ""
echo -e "  # 2. 启动 Tauri 桌面客户端调试"
echo -e "  ${CYAN}cd \"$TARGET_PATH\" && npm run tauri:dev:admin${NC}"
echo -e "${GREEN}==================================================${NC}"
