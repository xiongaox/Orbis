#!/usr/bin/env bash
# ==============================================================================
# create-worktree.sh
# 为 Orbis 项目创建并初始化独立的 Git Worktree 开发环境
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

# 1. 确认当前目录属于 Orbis 仓库
REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  print_error "当前目录不是 git 仓库！请在 Orbis 项目目录下运行本脚本。"
  exit 1
fi
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"

# 默认参数
WORKTREE_BASE="${WORKTREE_BASE:-$(dirname "$REPO_ROOT")/worktree/Orbis}"
CUSTOM_BRANCH=""
SHARE_RUST_TARGET=false
SKIP_DIRTY_CHECK=false

usage() {
  cat <<EOF
用法: $0 [选项]

选项:
  -b, --branch <name>       指定工作树分支名称（严禁包含 '/' 字符）
  -p, --path <dir>          指定工作树目标根目录（默认: $WORKTREE_BASE/<branch>）
  --share-rust-target       软链接共享 src-tauri/target 目录以加速 Rust 编译
  --skip-dirty-check        跳过未提交改动检查（仅供调试或特殊场景使用）
  -h, --help                显示本帮助信息

示例:
  $0                        # 自动生成基于当前提交 ID 的无斜杠分支并初始化
  $0 -b dev-perf-bazi       # 使用指定分支名称
  $0 --share-rust-target    # 同时共享 Tauri Rust 编译缓存
EOF
}

# 解析命令行参数
CUSTOM_PATH=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    -b|--branch)
      CUSTOM_BRANCH="$2"
      shift 2
      ;;
    -p|--path)
      CUSTOM_PATH="$2"
      shift 2
      ;;
    --share-rust-target)
      SHARE_RUST_TARGET=true
      shift
      ;;
    --skip-dirty-check)
      SKIP_DIRTY_CHECK=true
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

# 2. 前置未提交改动安全检查 (Dirty Check)
if [[ "$SKIP_DIRTY_CHECK" == false ]]; then
  DIRTY_STATUS="$(git -C "$REPO_ROOT" status --porcelain)"
  if [[ -n "$DIRTY_STATUS" ]]; then
    echo -e "${RED}================================================================${NC}"
    print_error "检测到主仓库有未提交的代码改动或未跟踪文件！"
    echo -e "${YELLOW}为了防止代码意外覆盖或丢失，请先提交本地 Git 改动（或执行 git stash）后再进行 worktree 操作。${NC}"
    echo -e "${RED}================================================================${NC}"
    git -C "$REPO_ROOT" status --short
    exit 1
  fi
fi

# 3. 确定分支名称（严格禁止包含 '/'）
CURRENT_BRANCH="$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || true)"
COMMIT_SHORT="$(git -C "$REPO_ROOT" rev-parse --short=8 HEAD)"

if [[ -n "$CUSTOM_BRANCH" ]]; then
  BRANCH_NAME="$CUSTOM_BRANCH"
else
  # 清理当前分支名中的斜杠（如 codex/tauri-migration -> codex-tauri-migration）
  CLEAN_CURRENT="${CURRENT_BRANCH//\//-}"
  if [[ -z "$CLEAN_CURRENT" || "$CLEAN_CURRENT" == "HEAD" ]]; then
    CLEAN_CURRENT="dev"
  fi
  CANDIDATE_BRANCH="${CLEAN_CURRENT}-${COMMIT_SHORT}"

  # 检查分支或目标路径是否已存在，若存在则生成唯一 8 位随机十六进制字符
  BRANCH_EXISTS="$(git -C "$REPO_ROOT" rev-parse --verify --quiet "refs/heads/$CANDIDATE_BRANCH" || true)"
  TARGET_DIR_CANDIDATE="${WORKTREE_BASE}/${CANDIDATE_BRANCH}"

  if [[ -n "$BRANCH_EXISTS" || -d "$TARGET_DIR_CANDIDATE" ]]; then
    UNIQUE_HEX="$(head -c 16 /dev/urandom | md5 | cut -c 1-8 2>/dev/null || openssl rand -hex 4 2>/dev/null || echo "$RANDOM")"
    BRANCH_NAME="${CLEAN_CURRENT}-${UNIQUE_HEX}"
  else
    BRANCH_NAME="$CANDIDATE_BRANCH"
  fi
fi

# 核心安全约束：严禁斜杠
if [[ "$BRANCH_NAME" == *"/"* ]]; then
  print_error "分支名称严禁包含 '/' 字符，以规避 Git ref 冲突与目录删除异常！当前分支名: $BRANCH_NAME"
  exit 1
fi

# 4. 确定工作树存储路径
if [[ -n "$CUSTOM_PATH" ]]; then
  TARGET_WORKTREE_PATH="$CUSTOM_PATH"
else
  TARGET_WORKTREE_PATH="${WORKTREE_BASE}/${BRANCH_NAME}"
fi

echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  Orbis Git Worktree 环境初始化                   ${NC}"
echo -e "${CYAN}==================================================${NC}"
print_info "仓库根目录: $REPO_ROOT"
print_info "基础分支  : ${CURRENT_BRANCH:-HEAD} ($COMMIT_SHORT)"
print_info "新分支名称: $BRANCH_NAME"
print_info "工作树路径: $TARGET_WORKTREE_PATH"

# 5. 确保基础目录存在并执行 git worktree add
mkdir -p "$(dirname "$TARGET_WORKTREE_PATH")"

print_info "正在执行 git worktree add ..."
git -C "$REPO_ROOT" worktree add -b "$BRANCH_NAME" "$TARGET_WORKTREE_PATH" HEAD

# 6. 项目专属优化 1: node_modules 毫秒级软链接共享
SRC_NODE_MODULES="$REPO_ROOT/node_modules"
DST_NODE_MODULES="$TARGET_WORKTREE_PATH/node_modules"
if [[ -d "$SRC_NODE_MODULES" ]]; then
  print_info "正在软链接共享 node_modules (秒级就绪，零额外磁盘占用)..."
  ln -s "$SRC_NODE_MODULES" "$DST_NODE_MODULES"
  print_success "已建立 node_modules 软链接。"
else
  print_warn "主仓库未找到 node_modules 目录！进入新工作树后需手动执行 npm install。"
fi

# 7. 项目专属优化 2: 离线加密案例包 (dist-cases/) 与作者签发密钥 (keys/)
SRC_DIST_CASES="$REPO_ROOT/dist-cases"
DST_DIST_CASES="$TARGET_WORKTREE_PATH/dist-cases"
if [[ -d "$SRC_DIST_CASES" ]]; then
  print_info "正在链接 dist-cases/ 离线案例加密包 (确保 Tauri 构建包含语料)..."
  ln -s "$SRC_DIST_CASES" "$DST_DIST_CASES"
  print_success "已建立 dist-cases/ 软链接。"
else
  print_warn "主仓库未找到 dist-cases/ 目录，构建 Tauri 时可能不含完整离线案例包。"
fi

SRC_KEYS="$REPO_ROOT/keys"
DST_KEYS="$TARGET_WORKTREE_PATH/keys"
if [[ -d "$SRC_KEYS" ]]; then
  print_info "正在链接 keys/ 作者签发密钥..."
  ln -s "$SRC_KEYS" "$DST_KEYS"
  print_success "已建立 keys/ 软链接。"
fi

# 7a. 项目专属优化 2b: 案例语料目录 (src/data/cases/ 已迁至 orbis-lore,主仓不入库)
# worktree checkout 只含 README/AGENTS(被跟踪文件),语料本体按子目录软链主仓还原产物
for CORPUS_SUB in bazi qimen; do
  SRC_CORPUS="$REPO_ROOT/src/data/cases/$CORPUS_SUB"
  DST_CORPUS="$TARGET_WORKTREE_PATH/src/data/cases/$CORPUS_SUB"
  if [[ -d "$SRC_CORPUS" && ! -e "$DST_CORPUS" ]]; then
    ln -s "$SRC_CORPUS" "$DST_CORPUS"
    print_success "已建立 src/data/cases/$CORPUS_SUB/ 语料软链接。"
  elif [[ ! -d "$SRC_CORPUS" ]]; then
    print_warn "主仓库未找到 src/data/cases/$CORPUS_SUB/，先在主仓执行 npm run cases:unpack 还原语料。"
  fi
done

# 8. 项目专属优化 3: 同步 .env 环境变量
SRC_ENV="$REPO_ROOT/.env"
DST_ENV="$TARGET_WORKTREE_PATH/.env"
if [[ -f "$SRC_ENV" ]]; then
  print_info "正在复制 .env 环境变量配置..."
  cp "$SRC_ENV" "$DST_ENV"
  print_success "已同步 .env 配置。"
fi

# 9. 项目专属优化 4: Rust 编译缓存共享 (src-tauri/target)
if [[ "$SHARE_RUST_TARGET" == true ]]; then
  SRC_RUST_TARGET="$REPO_ROOT/src-tauri/target"
  DST_RUST_TARGET="$TARGET_WORKTREE_PATH/src-tauri/target"
  if [[ -d "$SRC_RUST_TARGET" ]]; then
    print_info "正在链接 src-tauri/target 共享编译缓存..."
    mkdir -p "$TARGET_WORKTREE_PATH/src-tauri"
    ln -s "$SRC_RUST_TARGET" "$DST_RUST_TARGET"
    print_success "已建立 src-tauri/target 软链接 (复用 15GB 编译缓存)。"
  fi
fi

# 10. 记录工作树元信息供后续构建与清理使用
META_FILE="$TARGET_WORKTREE_PATH/.worktree-meta.json"
cat > "$META_FILE" <<EOF
{
  "project": "Orbis",
  "branch": "$BRANCH_NAME",
  "baseCommit": "$COMMIT_SHORT",
  "createdAt": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "repoRoot": "$REPO_ROOT"
}
EOF

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}[+] Orbis Worktree 创建并初始化成功！${NC}"
echo -e "    工作树路径: ${CYAN}$TARGET_WORKTREE_PATH${NC}"
echo -e "    独立分支  : ${CYAN}$BRANCH_NAME${NC}"
echo -e "    依赖与资源: ${GREEN}node_modules (软链接) / dist-cases / keys / .env${NC}"
echo -e "${GREEN}==================================================${NC}"
echo ""
echo -e "${YELLOW}【后续操作指引】${NC}"
echo -e "1. 进入工作树目录开始开发:"
echo -e "   ${CYAN}cd \"$TARGET_WORKTREE_PATH\"${NC}"
echo ""
echo -e "2. 启动前端热重载开发服务器 (推荐指定 9899 端口，避免与主仓库 9898 冲突):"
echo -e "   ${CYAN}npm run dev -- --port 9899${NC}"
echo ""
echo -e "3. 需求完成时，调用构建与验证脚本:"
echo -e "   ${CYAN}\"$REPO_ROOT/.agents/skills/worktree/scripts/build-worktree.sh\" -p \"$TARGET_WORKTREE_PATH\"${NC}"
echo ""
