/*
 * Copyright 2017 balena.io
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

#ifndef SRC_DRIVELIST_HPP_
#define SRC_DRIVELIST_HPP_

#include <napi.h>
#include <string>
#include <vector>

namespace Drivelist {

struct MountPoint {
  std::string path;
};

// anyfs fork: per-partition info surfaced by the host OS. FS-aware
// fields (fstype/label/uuid) end up empty when the OS hasn't probed
// the filesystem — that's the signal for the UI to ask for raw read.
struct Partition {
  std::string device;
  uint64_t size = 0;        // 0 → null (an unused PartitionEntry has length 0)
  int32_t number = -1;      // -1 → null (partitions are 1-indexed)
  std::string fstype;       // empty → null
  std::string label;        // empty → null
  std::string uuid;         // empty → null
  std::string partlabel;    // empty → null
  std::string parttype;     // empty → null
  std::vector<std::string> mountpoints;
  std::vector<std::string> mountpointLabels;
  bool isReadOnly = false;
};

struct DeviceDescriptor {
  std::string enumerator;
  std::string busType;
  std::string busVersion;
  bool busVersionNull;
  std::string device;
  std::string devicePath;
  bool devicePathNull;
  std::string raw;
  std::string description;
  std::string error;
  std::string partitionTableType;
  uint64_t size;
  uint32_t blockSize = 512;
  uint32_t logicalBlockSize = 512;
  std::vector<std::string> mountpoints;
  std::vector<std::string> mountpointLabels;
  bool isReadOnly;  // Device is read-only
  bool isSystem;  // Device is a system drive
  bool isVirtual;  // Device is a virtual storage device
  bool isRemovable;  // Device is removable from the running system
  bool isCard;  // Device is an SD-card
  bool isSCSI;  // Connected via the Small Computer System Interface (SCSI)
  bool isUSB;  // Connected via Universal Serial Bus (USB)
  bool isUAS;  // Connected via the USB Attached SCSI (UAS)
  bool isUASNull;
  // anyfs fork: populated by platform code that knows how. When
  // partitionsNull is true the JS layer emits `partitions: null`
  // (drive's partitions unknown — e.g. an OS we haven't taught yet).
  std::vector<Partition> partitions;
  bool partitionsNull = true;
};

std::vector<DeviceDescriptor> ListStorageDevices();
Napi::Object PackDriveDescriptor(Napi::Env env, const DeviceDescriptor *instance);

}  // namespace Drivelist

Napi::Value List(const Napi::CallbackInfo& info);

#endif  // SRC_DRIVELIST_HPP_
