#!/usr/bin/env bash
# ==============================================================================
# remove-worktree.sh
# 安全清理并回收已完成的 Orbis Git Worktree 及临时分支
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

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$REPO_ROOT" ]]; then
  print_error "当前目录不是 git 仓库！请在 Orbis 项目目录下运行本脚本。"
  exit 1
fi
REPO_ROOT="$(cd "$REPO_ROOT" && pwd -P)"

TARGET_PATH=""
DELETE_BRANCH=true
FORCE=false

usage() {
  cat <<EOF
用法: $0 [选项]

选项:
  -p, --path <dir>          指定需清理的工作树目录（必须）
  --keep-branch             保留 Git 本地分支，仅移除工作树目录
  -f, --force               强制移除（即使有未提交改动）
  -h, --help                显示本帮助信息

示例:
  $0 -p ../worktree/Orbis/dev-12345678              # 安全清理工作树及对应分支
  $0 -p ../worktree/Orbis/dev-12345678 --keep-branch # 仅清理目录，保留分支
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--path)
      TARGET_PATH="$2"
      shift 2
      ;;
    --keep-branch)
      DELETE_BRANCH=false
      shift
      ;;
    -f|--force)
      FORCE=true
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

if [[ -z "$TARGET_PATH" ]]; then
  print_error "必须通过 -p 或 --path 指定需要清理的工作树目录！"
  usage
  exit 1
fi

TARGET_PATH="$(cd "$TARGET_PATH" 2>/dev/null && pwd -P || echo "$TARGET_PATH")"

if [[ ! -d "$TARGET_PATH" ]]; then
  print_error "指定的工作树目录不存在: $TARGET_PATH"
  exit 1
fi

if [[ "$TARGET_PATH" == "$REPO_ROOT" ]]; then
  print_error "严禁删除主仓库根目录！"
  exit 1
fi

# 1. 检查工作树内是否有未提交改动
if [[ "$FORCE" == false ]]; then
  # 忽略 worktree 专属元数据标记文件
  DIRTY_STATUS="$(git -C "$TARGET_PATH" status --porcelain 2>/dev/null | grep -v -E "^\?\? \.worktree" || true)"
  if [[ -n "$DIRTY_STATUS" ]]; then
    print_error "检测到工作树中有未提交的代码改动！"
    echo -e "${YELLOW}请先在工作树中完成提交或放弃改动，或使用 -f/--force 强制删除。${NC}"
    git -C "$TARGET_PATH" status --short 2>/dev/null || true
    exit 1
  fi
fi

# 2. 获取分支名称
BRANCH_NAME="$(git -C "$TARGET_PATH" branch --show-current 2>/dev/null || true)"
if [[ -z "$BRANCH_NAME" && -f "$TARGET_PATH/.worktree-meta.json" ]]; then
  BRANCH_NAME=$(grep '"branch"' "$TARGET_PATH/.worktree-meta.json" | cut -d '"' -f 4 || true)
fi

echo -e "${CYAN}==================================================${NC}"
echo -e "${CYAN}  Orbis Worktree 安全回收                         ${NC}"
echo -e "${CYAN}==================================================${NC}"
print_info "清理目录: $TARGET_PATH"
print_info "关联分支: ${BRANCH_NAME:-未知}"

# 3. 移除 git worktree
print_info "正在从 Git 中注销并移除工作树..."
if [[ "$FORCE" == true ]]; then
  git -C "$REPO_ROOT" worktree remove --force "$TARGET_PATH"
else
  git -C "$REPO_ROOT" worktree remove "$TARGET_PATH"
fi
print_success "工作树目录已移除。"

# 4. 可选：删除本地临时分支
if [[ "$DELETE_BRANCH" == true && -n "$BRANCH_NAME" ]]; then
  # 避免删除主分支
  if [[ "$BRANCH_NAME" == "Dev" || "$BRANCH_NAME" == "main" ]]; then
    print_warn "分支名为受保护的主分支 ($BRANCH_NAME)，跳过分支删除。"
  else
    print_info "正在删除关联的临时分支 ($BRANCH_NAME)..."
    if [[ "$FORCE" == true ]]; then
      git -C "$REPO_ROOT" branch -D "$BRANCH_NAME" || true
    else
      git -C "$REPO_ROOT" branch -d "$BRANCH_NAME" || {
        print_warn "分支尚未完全合并，若确认不需要该分支，可手动执行: git branch -D $BRANCH_NAME"
      }
    fi
    print_success "临时分支处理完毕。"
  fi
fi

echo -e "${GREEN}==================================================${NC}"
echo -e "${GREEN}[+] Worktree 清理回收完成！${NC}"
echo -e "${GREEN}==================================================${NC}"
