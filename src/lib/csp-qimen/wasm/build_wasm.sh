#!/bin/bash
set -e

# Path to the upstream CSP checkout. Set CSP_ROOT to update the kernel.
# Upstream: https://github.com/taynpg/csp
# 当前内核版本锚定（升级内核后务必更新此行）:
#   v1.5.4 @ commit 1bc9724 (2026-04-14)  —— 当前 public/wasm 部署版本（UPSTREAM_VERSION）
#   v1.5.5 @ commit a032876 (2026-08-31)  —— 已完成本脚本适配，尚未部署，原因见下
#
# ⚠️ v1.5.5 部署阻塞项：上游 print.cpp 改用 fmt::print（写 C 层 stdout FILE*），
#    不再经过 std::cout —— csp_wasm.cpp 的 run_captured（cout rdbuf 重定向）将捕获到
#    空字符串。部署 v1.5.5 前必须改造输出捕获：JS 侧 Module.print 回调收集，
#    或改走 JSON 结构化输出（见 docs/qimen-panmethod-fix-plan.md P6/P7）。
#    本脚本已为 v1.5.5 完成的适配：3rd/ 头文件路径、src/jsonExport.cpp、
#    -fno-rtti + -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0（emcc 6 embind 缺基础
#    typeinfo）、-lc++ -lc++abi（emcc 6 不自动链 libc++）、csp_wasm.cpp 内
#    __cxa_throw stub（emcc 6 libc++abi 缺该符号）。验证工具：
#    node scripts/qimen-kernel-regression.mjs --check <baseline.json>
CSP_ROOT="${CSP_ROOT:-../../../../../参考库/csp}"

if [ ! -f "${CSP_ROOT}/src/csp_base.hpp" ]; then
    echo "CSP source not found: ${CSP_ROOT}" >&2
    echo "Clone https://github.com/taynpg/csp and set CSP_ROOT to that directory." >&2
    exit 1
fi

echo "Compiling CSP to WebAssembly..."

# Compile to WASM
# -O3: Aggressive optimization
# --bind: Use Embind
# -s MODULARIZE=1: Wrap in function
# -s EXPORT_NAME='createCspModule': Function name
# -s ALLOW_MEMORY_GROWTH=1: Allow memory growth
# -std=c++17: Use C++17
# -D_CRT_SECURE_NO_WARNINGS: MSVC compat
# -DFMT_HEADER_ONLY -DFMT_UNICODE=0: fmt lib config

# v1.5.5 起 fmt/nlohmann 移至 3rd/（此前为 export/fmt/include），并新增 src/jsonExport.cpp
emcc -O3 --bind \
    -I"${CSP_ROOT}/src" \
    -I"${CSP_ROOT}/base" \
    -I"${CSP_ROOT}/zhcn" \
    -I"${CSP_ROOT}/qimen/include" \
    -I"${CSP_ROOT}/tyme4cpp" \
    -I"${CSP_ROOT}/3rd" \
    -std=c++17 \
    -fno-rtti \
    -DEMSCRIPTEN_HAS_UNBOUND_TYPE_NAMES=0 \
    -D_CRT_SECURE_NO_WARNINGS \
    -DFMT_HEADER_ONLY \
    -DFMT_UNICODE=0 \
    -s MODULARIZE=1 \
    -s EXPORT_NAME='createCspModule' \
    -s ALLOW_MEMORY_GROWTH=1 \
    -s SINGLE_FILE=0 \
    -o csp_qimen.js \
    csp_wasm.cpp \
    "${CSP_ROOT}/src/qmuse.cpp" \
    "${CSP_ROOT}/src/print.cpp" \
    "${CSP_ROOT}/src/jsonExport.cpp" \
    "${CSP_ROOT}/base/base.cpp" \
    "${CSP_ROOT}/zhcn/zh_lang.cpp" \
    "${CSP_ROOT}/tyme4cpp/tyme.cpp" \
    "${CSP_ROOT}/tyme4cpp/util.cpp" \
    "${CSP_ROOT}/qimen/src/qimen.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v1.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v2.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v3.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v4.cpp" \
    -lc++ -lc++abi

echo "✅ WASM build complete: csp_qimen.js and csp_qimen.wasm"

# Ensure public/wasm exists
mkdir -p ../../../../public/wasm

# Record upstream kernel version for traceability
if [ -d "${CSP_ROOT}/.git" ]; then
    CSP_VERSION_LINE=$(git -C "${CSP_ROOT}" log -1 --format='%h %ad %s' --date=short)
    echo "${CSP_VERSION_LINE}" > ../../../../public/wasm/UPSTREAM_VERSION
    echo "CSP kernel: ${CSP_VERSION_LINE}"
fi

# Copy artifacts
cp csp_qimen.js ../../../../public/wasm/
cp csp_qimen.wasm ../../../../public/wasm/

echo "✅ Copied artifacts to public/wasm/"
