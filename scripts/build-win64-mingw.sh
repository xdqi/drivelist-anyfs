#!/usr/bin/env bash
# Cross-build drivelist-anyfs as a win64 Node/Electron native addon using
# the msys2-cross mingw-w64 toolchain. No MSVC, no Windows host needed.
#
# Output: build-win64/drivelist.node (PE32+ x86_64)
#
# Tested toolchain: /opt/msys2-cross gcc 16.1.0
# Tested ABI:       electron 33.x (node-api stable v8)

set -euo pipefail

cd "$(dirname "$0")/.."
SRC=$PWD

ELECTRON_VERSION=${ELECTRON_VERSION:-33.4.11}
HEADER_CACHE=${HEADER_CACHE:-/tmp/electron-build}
CROSS_PREFIX=${CROSS_PREFIX:-/opt/msys2-cross/bin/x86_64-w64-mingw32-}
LLD_FAKEBIN=${LLD_FAKEBIN:-/opt/msys2-cross/lld-bin}
OUT=$SRC/build-win64

[[ -x "$LLD_FAKEBIN/ld.lld" ]] || {
    echo "error: $LLD_FAKEBIN/ld.lld missing — run:" >&2
    echo "  mkdir -p $LLD_FAKEBIN && ln -sf \$(which ld.lld-20 || which ld.lld) $LLD_FAKEBIN/ld.lld" >&2
    exit 1
}

CXX=${CROSS_PREFIX}g++

# 1. Fetch electron headers + node.lib (cached)
mkdir -p "$HEADER_CACHE"
if [ ! -d "$HEADER_CACHE/node_headers" ]; then
  curl -sSL -o "$HEADER_CACHE/node-headers.tar.gz" \
    "https://electronjs.org/headers/v${ELECTRON_VERSION}/node-v${ELECTRON_VERSION}-headers.tar.gz"
  tar -xzf "$HEADER_CACHE/node-headers.tar.gz" -C "$HEADER_CACHE"
fi
if [ ! -f "$HEADER_CACHE/node.lib" ]; then
  curl -sSL -o "$HEADER_CACHE/node.lib" \
    "https://electronjs.org/headers/v${ELECTRON_VERSION}/win-x64/node.lib"
fi

# 2. Compile flags
INCS=(
  -I "$HEADER_CACHE/node_headers/include/node"
  -I "$SRC/node_modules/node-addon-api"
  -I "$SRC/src"
)
CXXFLAGS=(
  -std=c++17 -O2 -fexceptions -fpermissive
  -DBUILDING_NODE_EXTENSION -DNAPI_VERSION=8
  -DUNICODE -D_UNICODE
  -DWIN32 -D_WINDOWS -D_HAS_EXCEPTIONS=1
  -Wall -Wextra -Wno-unused-parameter -Wno-missing-field-initializers
  -Wno-unused-variable -Wno-unused-but-set-variable
)

mkdir -p "$OUT"
cd "$OUT"

# 3. Compile
$CXX -c "$SRC/src/drivelist.cpp"          "${INCS[@]}" "${CXXFLAGS[@]}" -o drivelist.o
$CXX -c "$SRC/src/device-descriptor.cpp"  "${INCS[@]}" "${CXXFLAGS[@]}" -o device-descriptor.o
$CXX -c "$SRC/src/windows/list.cpp"       "${INCS[@]}" "${CXXFLAGS[@]}" -o list.o
$CXX -c "$SRC/src/windows/delayhook.cpp"  "${INCS[@]}" "${CXXFLAGS[@]}" -o delayhook.o

# 4. Link as .node (= PE32+ DLL with custom suffix). Static libgcc/libstdc++
#    so no MSYS runtime DLLs leak into the deliverable. --export-all-symbols
#    keeps napi_register_module_v1 exported by name (GetProcAddress lookup).
#    ld.lld --delayload=node.exe + delayhook.cpp lets us skip the
#    node.exe shim DLL (see [[mingw-delayload-lld]]).
$CXX -shared -o drivelist.node \
  -B"$LLD_FAKEBIN" -fuse-ld=lld \
  drivelist.o device-descriptor.o list.o delayhook.o \
  "$HEADER_CACHE/node.lib" \
  -Wl,--delayload=node.exe \
  -lkernel32 -lshell32 -lsetupapi -ladvapi32 -lole32 -luuid \
  -static-libgcc -static-libstdc++ \
  -Wl,--export-all-symbols

file drivelist.node
echo "OK -> $OUT/drivelist.node"
