/*
 * Copyright 2019 balena.io
 * Copyright 2018 Robin Andersson <me@robinwassen.com>
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

#include <napi.h>
#include <map>
#include "../drivelist.hpp"

#import "REDiskList.h"
#import <Cocoa/Cocoa.h>
#import <DiskArbitration/DiskArbitration.h>

namespace Drivelist {
  bool IsDiskPartition(NSString *disk) {
    NSPredicate *partitionRegEx = [NSPredicate predicateWithFormat:@"SELF MATCHES %@", @"disk\\d+s\\d+"];
    return [partitionRegEx evaluateWithObject:disk];
  }

  bool IsCard(CFDictionaryRef diskDescription) {
    CFDictionaryRef mediaIconDict = (CFDictionaryRef)CFDictionaryGetValue(
      diskDescription,
      kDADiskDescriptionMediaIconKey
    );
    if (mediaIconDict == nil) {
      return false;
    }

    CFStringRef iconFileNameKeyRef = CFStringCreateWithCString(NULL, "IOBundleResourceFile", kCFStringEncodingUTF8);
    CFStringRef iconFileNameRef = (CFStringRef)CFDictionaryGetValue(mediaIconDict, iconFileNameKeyRef);
    CFRelease(iconFileNameKeyRef);

    if (iconFileNameRef == nil) {
      return false;
    }

    // macOS 10.14.3 - External SD card reader provides `Removable.icns`, not `SD.icns`.
    // But we can't use it to detect SD card, because external drive has `Removable.icns` as well.
    return [(NSString *)iconFileNameRef isEqualToString:@"SD.icns"];
  }

  NSNumber *DictionaryGetNumber(CFDictionaryRef dict, const void *key) {
    return (NSNumber*)CFDictionaryGetValue(dict, key);
  }

  DeviceDescriptor CreateDeviceDescriptorFromDiskDescription(std::string diskBsdName, CFDictionaryRef diskDescription) {
    NSString *deviceProtocol = (NSString*)CFDictionaryGetValue(diskDescription, kDADiskDescriptionDeviceProtocolKey);
    NSNumber *blockSize = DictionaryGetNumber(diskDescription, kDADiskDescriptionMediaBlockSizeKey);
    bool isInternal = [DictionaryGetNumber(diskDescription, kDADiskDescriptionDeviceInternalKey) boolValue];
    bool isRemovable = [DictionaryGetNumber(diskDescription, kDADiskDescriptionMediaRemovableKey) boolValue];
    bool isEjectable = [DictionaryGetNumber(diskDescription, kDADiskDescriptionMediaEjectableKey) boolValue];

    DeviceDescriptor device = DeviceDescriptor();
    NSString *mediaContent = (NSString*)CFDictionaryGetValue(diskDescription, kDADiskDescriptionMediaContentKey);
    if ([mediaContent isEqualToString:@"GUID_partition_scheme"]) {
      device.partitionTableType = "gpt";
    } else if ([mediaContent isEqualToString:@"FDisk_partition_scheme"]) {
      device.partitionTableType = "mbr";
    }
    device.enumerator = "DiskArbitration";
    device.busType = (deviceProtocol != nil) ? [deviceProtocol UTF8String] : "";
    device.busVersion = "";
    device.busVersionNull = true;
    device.device = "/dev/" + diskBsdName;
    NSString *devicePath = (NSString*)CFDictionaryGetValue(diskDescription, kDADiskDescriptionBusPathKey);
    device.devicePath = (devicePath != nil) ? [devicePath UTF8String] : "";
    device.raw = "/dev/r" + diskBsdName;
    NSString *description = (NSString*)CFDictionaryGetValue(diskDescription, kDADiskDescriptionMediaNameKey);
    device.description = (description != nil) ? [description UTF8String] : "";
    device.error = "";
    // NOTE: Not sure if kDADiskDescriptionMediaBlockSizeKey returns
    // the physical or logical block size since both values are equal
    // on my machine
    //
    // The can be checked with the following command:
    //      diskutil info / | grep "Block Size"
    device.blockSize = [blockSize unsignedIntValue];
    device.logicalBlockSize = [blockSize unsignedIntValue];
    device.size = [DictionaryGetNumber(diskDescription, kDADiskDescriptionMediaSizeKey) unsignedLongValue];
    device.isReadOnly = ![DictionaryGetNumber(diskDescription, kDADiskDescriptionMediaWritableKey) boolValue];
    device.isSystem = isInternal && !isRemovable;
    device.isVirtual = ((deviceProtocol != nil) && [deviceProtocol isEqualToString:@"Virtual Interface"]);
    device.isRemovable = isRemovable || isEjectable;
    device.isCard = IsCard(diskDescription);
    // NOTE(robin): Not convinced that these bus types should result
    // in device.isSCSI = true, it is rather "not usb or sd drive" bool
    // But the old implementation was like this so kept it this way
    NSArray *scsiTypes = [NSArray arrayWithObjects:@"SATA", @"SCSI", @"ATA", @"IDE", @"PCI", nil];
    device.isSCSI = ((deviceProtocol != nil) && [scsiTypes containsObject:deviceProtocol]);
    device.isUSB = ((deviceProtocol != nil) && [deviceProtocol isEqualToString:@"USB"]);
    device.isUAS = false;
    device.isUASNull = true;

    return device;
  }

  // anyfs fork: convert a DA description for a disk{N}s{M} entry into
  // a Partition struct on the parent disk{N}. Mountpoints are filled
  // in by the subsequent mountedVolumeURLs scan, so the FS-aware
  // fields here come straight from DA's volume probe.
  Partition CreatePartitionFromDiskDescription(std::string bsdName,
                                               CFDictionaryRef dd) {
    Partition p;
    p.device = "/dev/" + bsdName;

    size_t sIdx = bsdName.rfind('s');
    if (sIdx != std::string::npos && sIdx + 1 < bsdName.size()) {
      try {
        p.number = std::stoi(bsdName.substr(sIdx + 1));
      } catch (...) {
        // leave as -1
      }
    }

    NSNumber *sz = DictionaryGetNumber(dd, kDADiskDescriptionMediaSizeKey);
    if (sz != nil) {
      p.size = [sz unsignedLongLongValue];
    }

    NSString *vKind = (NSString *)CFDictionaryGetValue(
        dd, kDADiskDescriptionVolumeKindKey);
    if (vKind != nil) {
      p.fstype = [vKind UTF8String];
    }

    NSString *vName = (NSString *)CFDictionaryGetValue(
        dd, kDADiskDescriptionVolumeNameKey);
    if (vName != nil) {
      p.label = [vName UTF8String];
    }

    CFUUIDRef uuidRef = (CFUUIDRef)CFDictionaryGetValue(
        dd, kDADiskDescriptionVolumeUUIDKey);
    if (uuidRef != nil) {
      CFStringRef uuidStr = CFUUIDCreateString(NULL, uuidRef);
      if (uuidStr != nil) {
        p.uuid = [(NSString *)uuidStr UTF8String];
        CFRelease(uuidStr);
      }
    }

    NSString *mediaName = (NSString *)CFDictionaryGetValue(
        dd, kDADiskDescriptionMediaNameKey);
    if (mediaName != nil) {
      p.partlabel = [mediaName UTF8String];
    }

    // Media content carries the partition type. For GPT it's the
    // human name when known ("Apple_APFS", "EFI") or the GUID. For
    // MBR it's the hex byte form ("0x07").
    NSString *mediaContent = (NSString *)CFDictionaryGetValue(
        dd, kDADiskDescriptionMediaContentKey);
    if (mediaContent != nil) {
      p.parttype = [mediaContent UTF8String];
    }

    NSNumber *writable = DictionaryGetNumber(
        dd, kDADiskDescriptionMediaWritableKey);
    p.isReadOnly = writable != nil ? ![writable boolValue] : false;

    return p;
  }

  std::vector<DeviceDescriptor> ListStorageDevices() {
    std::vector<DeviceDescriptor> deviceList;

    DASessionRef session = DASessionCreate(kCFAllocatorDefault);
    if (session == nil) {
      return deviceList;
    }

    REDiskList *dl = [[REDiskList alloc] init];

    // anyfs fork: pass 1 — index every whole disk so pass 2 can
    // attach disk{N}s{M} entries to the right parent.
    std::map<std::string, size_t> wholeDisksByName;
    for (NSString* diskBsdName in dl.disks) {
      if (IsDiskPartition(diskBsdName)) {
        continue;
      }

      std::string diskBsdNameStr = [diskBsdName UTF8String];
      DADiskRef disk = DADiskCreateFromBSDName(kCFAllocatorDefault, session, diskBsdNameStr.c_str());
      if (disk == nil) {
        continue;
      }

      CFDictionaryRef diskDescription = DADiskCopyDescription(disk);
      if (diskDescription == nil) {
        CFRelease(disk);
        continue;
      }

      DeviceDescriptor device = CreateDeviceDescriptorFromDiskDescription(diskBsdNameStr, diskDescription);
      // Mark partitions[] as populated — even an unpartitioned disk
      // surfaces an empty array (consistent with Linux lsblk).
      device.partitionsNull = false;
      deviceList.push_back(device);
      wholeDisksByName[diskBsdNameStr] = deviceList.size() - 1;

      CFRelease(diskDescription);
      CFRelease(disk);
    }

    // anyfs fork: pass 2 — attach each disk{N}s{M} as a partition of
    // its disk{N} parent. APFS sub-volumes (disk{N}s{M}s{K}) belong
    // to the synthesized APFS container disk that DA reports as a
    // separate whole disk, so they naturally land there too.
    for (NSString* diskBsdName in dl.disks) {
      if (!IsDiskPartition(diskBsdName)) {
        continue;
      }
      std::string partBsdName = [diskBsdName UTF8String];
      // Parent name = up to the first "s" after the "diskN" prefix.
      size_t sIdx = partBsdName.find('s', 4);
      if (sIdx == std::string::npos) continue;
      std::string parentBsdName = partBsdName.substr(0, sIdx);
      auto it = wholeDisksByName.find(parentBsdName);
      if (it == wholeDisksByName.end()) continue;

      DADiskRef disk = DADiskCreateFromBSDName(
          kCFAllocatorDefault, session, partBsdName.c_str());
      if (disk == nil) continue;
      CFDictionaryRef diskDescription = DADiskCopyDescription(disk);
      if (diskDescription != nil) {
        Partition p = CreatePartitionFromDiskDescription(
            partBsdName, diskDescription);
        deviceList[it->second].partitions.push_back(p);
        CFRelease(diskDescription);
      }
      CFRelease(disk);
    }

    [dl release];

    // Add mount points
    NSArray *volumeKeys = [NSArray arrayWithObjects:NSURLVolumeNameKey, NSURLVolumeLocalizedNameKey, nil];
    NSArray *volumePaths = [
      [NSFileManager defaultManager]
      mountedVolumeURLsIncludingResourceValuesForKeys:volumeKeys
      options:0
    ];

    for (NSURL *path in volumePaths) {
      DADiskRef disk = DADiskCreateFromVolumePath(kCFAllocatorDefault, session, (__bridge CFURLRef)path);
      if (disk == nil) {
        continue;
      }

      const char *bsdnameChar = DADiskGetBSDName(disk);
      if (bsdnameChar == nil) {
        CFRelease(disk);
        continue;
      }

      NSString *volumeName;
      [path getResourceValue:&volumeName forKey:NSURLVolumeLocalizedNameKey error:nil];

      std::string partitionBsdName = std::string(bsdnameChar);
      std::string diskBsdName = partitionBsdName.substr(0, partitionBsdName.find("s", 5));

      for(std::vector<int>::size_type i = 0; i != deviceList.size(); i++) {
        DeviceDescriptor *dd = &deviceList[i];

        if (dd->device == "/dev/" + diskBsdName) {
          dd->mountpoints.push_back([[path path] UTF8String]);
          dd->mountpointLabels.push_back([volumeName UTF8String]);

          // anyfs fork: also reflect the mount on the matching
          // partition so per-partition info is self-contained.
          std::string partDevice = "/dev/" + partitionBsdName;
          for (Partition &p : dd->partitions) {
            if (p.device == partDevice) {
              p.mountpoints.push_back([[path path] UTF8String]);
              p.mountpointLabels.push_back([volumeName UTF8String]);
              break;
            }
          }
          break;
        }
      }

      CFRelease(disk);
    }
    CFRelease(session);

    return deviceList;
  }

}  // namespace Drivelist
