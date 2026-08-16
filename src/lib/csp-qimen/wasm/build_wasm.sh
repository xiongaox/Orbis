#!/bin/bash
set -e

# Path to the upstream CSP checkout. Set CSP_ROOT to update the kernel.
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

emcc -O3 --bind \
    -I"${CSP_ROOT}/src" \
    -I"${CSP_ROOT}/base" \
    -I"${CSP_ROOT}/zhcn" \
    -I"${CSP_ROOT}/qimen/include" \
    -I"${CSP_ROOT}/tyme4cpp" \
    -I"${CSP_ROOT}/export/fmt/include" \
    -std=c++17 \
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
    "${CSP_ROOT}/base/base.cpp" \
    "${CSP_ROOT}/zhcn/zh_lang.cpp" \
    "${CSP_ROOT}/tyme4cpp/tyme.cpp" \
    "${CSP_ROOT}/tyme4cpp/util.cpp" \
    "${CSP_ROOT}/qimen/src/qimen.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v1.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v2.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v3.cpp" \
    "${CSP_ROOT}/qimen/src/qm_v4.cpp"

echo "✅ WASM build complete: csp_qimen.js and csp_qimen.wasm"

# Ensure public/wasm exists
mkdir -p ../../../../public/wasm

# Copy artifacts
cp csp_qimen.js ../../../../public/wasm/
cp csp_qimen.wasm ../../../../public/wasm/

echo "✅ Copied artifacts to public/wasm/"
