{
  "targets": [
    {
      "target_name": "drivelist",
      "cflags!": [ "-fno-exceptions" ],
      "cflags_cc!": [ "-fno-exceptions" ],
      "xcode_settings": { "GCC_ENABLE_CPP_EXCEPTIONS": "YES",
        "CLANG_CXX_LIBRARY": "libc++",
        "MACOSX_DEPLOYMENT_TARGET": "10.7",
      },
      "msvs_settings": {
        "VCCLCompilerTool": { "ExceptionHandling": 1 },
      },
      'include_dirs': [
        "<!@(node -p \"require('node-addon-api').include\")",
        "."
      ],
      'dependencies': ["<!(node -p \"require('node-addon-api').gyp\")"],
      "defines": [
        "NAPI_VERSION=<(napi_build_version)"
      ],
      "sources": [
        "src/drivelist.cpp",
        "src/device-descriptor.cpp",
      ],
      "msvs_settings": {
        "VCLinkerTool": {
          "SetChecksum": "true"
        },
        "VCCLCompilerTool": {
          "ExceptionHandling": 1,
          "AdditionalOptions": [
            "/EHsc"
          ]
        }
      },
      "conditions": [
        [ 'OS=="mac"', {
          "xcode_settings": {
            "OTHER_CPLUSPLUSFLAGS": [
              "-stdlib=libc++"
            ],
            "OTHER_LDFLAGS": [
              "-stdlib=libc++"
            ]
          },
          "sources": [
            "src/darwin/list.mm",
            "src/darwin/REDiskList.m"
          ],
          "link_settings": {
            "libraries": [
              "-framework Carbon,DiskArbitration"
            ]
          }
        }],
        [ 'OS=="win"', {
          "sources": [
            "src/windows/list.cpp"
          ],
          "libraries": [
            "-lKernel32.lib",
            "-lShell32.lib",
            "-lSetupAPI.lib"
          ]
        }],
        [ 'OS=="linux"', {
          "sources": [
            "src/linux/list.cpp"
          ],
          # Export only the N-API entry points (scripts/build-linux-electron.sh
          # links libc++ statically; keep its symbols out of Electron's way).
          "cflags": [ "-fvisibility=hidden" ],
          "cflags_cc": [ "-fvisibility-inlines-hidden" ],
          "ldflags": [ "-Wl,--version-script=<(module_root_dir)/exports.map" ]
        }]
      ]
    }
  ]
}
