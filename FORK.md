# drivelist-anyfs

This is the drivelist fork used by [anyfs](https://github.com/xdqi/anyfs).
It starts from upstream [v12.0.2](https://github.com/balena-io-modules/drivelist/commit/a616aa9)
and retains the upstream history and [Apache-2.0 license](LICENSE).
The JavaScript package name remains `drivelist` for compatibility. This fork is
distributed as source on GitHub, not as a new npm release.

## Changes for anyfs

- `Drive.partitions` adds partition device, size, number, filesystem type, label,
  UUID, partition label/type, mountpoints and read-only status.
- Linux reads the metadata from `lsblk --json --output-all`, including modern
  multiple-mountpoint output. The legacy pairs fallback returns `null` when it
  cannot provide partition details.
- Windows reads partition layout information and enriches it with volume metadata.
- macOS uses Disk Arbitration descriptions and mounted-volume information.
- Electron build helpers support Linux with anyfs's Zig/glibc-floor wrappers and
  Windows x64 with MinGW-w64 and a Node/Electron delay-load hook.

`null` means unavailable metadata; an empty partition array means the backend
returned no partitions. Filesystem metadata depends on what the host OS can
identify. Disk enumeration does not grant permission to read a raw device or mount
its filesystem. Windows reports its volume serial in the `uuid` field; it is not a
filesystem UUID. Unrecognized Windows partitions use a descriptive synthetic device
identifier, which must not be assumed to be a directly openable Win32 path.

## Build and test

Use Node.js 18 or newer and the native build requirements listed in the upstream
README. On the target host:

```sh
npm ci --ignore-scripts
npm run build
npm test
```

For the anyfs Electron Linux build, use a sibling anyfs checkout or set its path:

```sh
ANYFS_READER=/path/to/anyfs ELECTRON_TARGET=42.3.0 \
  bash scripts/build-linux-electron.sh
npm run build-ts
```

The Windows helper is `scripts/build-win64-mingw.sh`. Set `ELECTRON_VERSION` to the
version being packaged; the helper also accepts `CROSS_PREFIX`, `LLD_FAKEBIN` and
`HEADER_CACHE`. Use a separate header cache for each Electron version. Build outputs
such as `build/`, `build-win64/`, `node_modules/` and generated `js/` are not source
files and are excluded from Git.

## Validation at initial publication

On Linux with Node.js 24.15.0, all 9 existing tests passed, including live drive
enumeration and the partition metadata fixtures; `npm run build-ts` also passed.
The Windows and macOS source implementations are included, but their current
Electron distribution integration and platform runtime validation are still in
progress in anyfs. Source publication alone is not a claim that every packaged
platform has passed runtime tests.
