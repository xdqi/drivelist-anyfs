/*
 * Delay-load hook for napi imports on Windows.
 *
 * scripts/build-win64-mingw.sh links drivelist.node with
 *   ld.lld --delayload=node.exe
 * so napi_* symbols live in the PE's Delay Import directory pointing at a
 * "node.exe" DLL that doesn't actually exist on Electron systems
 * (electron.exe / your-app.exe is the loader). This hook redirects the
 * delay-load helper to GetModuleHandle(NULL) on the first napi_* call,
 * letting napi resolve against whichever EXE loaded us.
 *
 * Background: feedback_mingw_delayload_lld.md in claude memory.
 */
#ifdef _WIN32
#include <windows.h>
#include <delayimp.h>

static FARPROC WINAPI drivelist_dli_hook(unsigned ev, PDelayLoadInfo info) {
    if (ev == dliNotePreLoadLibrary && info->szDll
        && lstrcmpiA(info->szDll, "node.exe") == 0) {
        return reinterpret_cast<FARPROC>(GetModuleHandleW(NULL));
    }
    return nullptr;
}

extern "C" PfnDliHook __pfnDliNotifyHook2 = drivelist_dli_hook;
#endif
