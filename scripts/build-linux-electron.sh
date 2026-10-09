#!/usr/bin/env bash
# Build drivelist's linux native addon (drivelist.node) against Electron's
# vendored node-api headers. Required because Electron N's bundled libnode
# may differ from the host node — building against host headers can compile
# but crash on require() inside Electron.
#
# Default ELECTRON_TARGET tracks anyfs-reader's electron-demo installed
# version (ts/examples/electron-demo/node_modules/electron/package.json).
# Override via env when bumping electron.
#
# Compiles with anyfs-reader's zig wrappers at glibc 2.25 (Electron 42's own
# floor): zig links libc++ statically, so the .node needs no libstdc++ or
# libgcc_s. ANYFS_READER points at the anyfs-reader checkout (default: the
# sibling directory).
set -euo pipefail

cd "$(dirname "$0")/.."

ANYFS_READER="${ANYFS_READER:-$(cd .. && pwd)/anyfs-reader}"
if [[ -z "${ELECTRON_TARGET:-}" ]]; then
    demo_pkg="$ANYFS_READER/ts/examples/electron-demo/node_modules/electron/package.json"
    if [[ -f "$demo_pkg" ]]; then
        ELECTRON_TARGET="$(node -p "require('$demo_pkg').version")"
    else
        ELECTRON_TARGET="42.3.0"
    fi
fi

# LINK stays unset so node-gyp links with $(CXX) — zig c++ is what pulls
# libc++ in.
export CC="$ANYFS_READER/scripts/lib/zig-cc" CXX="$ANYFS_READER/scripts/lib/zig-c++"
export ANYFS_ZIG_TARGET=x86_64-linux-gnu.2.25
unset LINK

# Fetch electron's node-api headers + write them to ~/.cache/node-gyp/<ver>.
# node-gyp's --runtime=electron --dist-url switches the headers tarball URL
# to electronjs.org/headers (rather than nodejs.org/dist).
npx node-gyp install \
    --target="$ELECTRON_TARGET" \
    --dist-url=https://electronjs.org/headers \
    --runtime=electron

npx node-gyp rebuild \
    --target="$ELECTRON_TARGET" \
    --dist-url=https://electronjs.org/headers \
    --runtime=electron \
    --arch=x64

"$ANYFS_READER/scripts/check_linux_abi.sh" --allow-undefined='^(napi_|node_api_)' \
    2.25 build/Release/drivelist.node

echo
echo "Built: $(file build/Release/drivelist.node | head -1)"
echo "Size : $(stat -c %s build/Release/drivelist.node) bytes"
