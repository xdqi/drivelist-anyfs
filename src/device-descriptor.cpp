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

#include <napi.h>

#include "drivelist.hpp"

using Napi::Boolean;
using Napi::Number;
using Napi::String;
using Napi::Value;

namespace Drivelist {

Napi::Object PackDriveDescriptor(Napi::Env env,
                                 const DeviceDescriptor *instance) {
  Napi::Object object = Napi::Object::New(env);

  object.Set(String::New(env, "enumerator"),
             String::New(env, instance->enumerator));

  object.Set(String::New(env, "busType"), String::New(env, instance->busType));

  Napi::Value busVersion =
      instance->busVersionNull
          ? (Napi::Value)env.Null()
          : (Napi::Value)String::New(env, instance->busVersion);

  object.Set(String::New(env, "busVersion"), busVersion);

  object.Set(String::New(env, "device"), String::New(env, instance->device));

  Napi::Value devicePath =
      instance->devicePathNull
          ? (Napi::Value)env.Null()
          : (Napi::Value)String::New(env, instance->devicePath);

  object.Set(String::New(env, "devicePath"), devicePath);

  object.Set(String::New(env, "raw"), String::New(env, instance->raw));

  object.Set(String::New(env, "description"),
             String::New(env, instance->description));

  if (instance->partitionTableType != "") {
    object.Set(String::New(env, "partitionTableType"),
               String::New(env, instance->partitionTableType));
  } else {
    object.Set(String::New(env, "partitionTableType"), env.Null());
  }

  if (instance->error != "") {
    object.Set(String::New(env, "error"), String::New(env, instance->error));
  } else {
    object.Set(String::New(env, "error"), env.Null());
  }

  object.Set(String::New(env, "size"),
             Number::New(env, static_cast<double>(instance->size)));

  object.Set(String::New(env, "blockSize"),
             Number::New(env, static_cast<double>(instance->blockSize)));

  object.Set(String::New(env, "logicalBlockSize"),
             Number::New(env, static_cast<double>(instance->logicalBlockSize)));

  Napi::Object mountpoints = Napi::Array::New(env);

  uint32_t index = 0;
  for (std::string mountpointPath : instance->mountpoints) {
    Napi::Object mountpoint = Napi::Object::New(env);
    mountpoint.Set(String::New(env, "path"), String::New(env, mountpointPath));

    if (index < instance->mountpointLabels.size()) {
      mountpoint.Set(String::New(env, "label"),
                     String::New(env, instance->mountpointLabels[index]));
    }

    mountpoints.Set(index, mountpoint);
    index++;
  }

  object.Set(String::New(env, "mountpoints"), mountpoints);

  object.Set(String::New(env, "isReadOnly"),
             Boolean::New(env, instance->isReadOnly));

  object.Set(String::New(env, "isSystem"),
             Boolean::New(env, instance->isSystem));

  object.Set(String::New(env, "isVirtual"),
             Boolean::New(env, instance->isVirtual));

  object.Set(String::New(env, "isRemovable"),
             Boolean::New(env, instance->isRemovable));

  object.Set(String::New(env, "isCard"), Boolean::New(env, instance->isCard));

  object.Set(String::New(env, "isSCSI"), Boolean::New(env, instance->isSCSI));

  object.Set(String::New(env, "isUSB"), Boolean::New(env, instance->isUSB));

  Napi::Value isUAS = instance->isUASNull
                          ? (Napi::Value)env.Null()
                          : (Napi::Value)Boolean::New(env, instance->isUAS);

  object.Set(String::New(env, "isUAS"), isUAS);

  // anyfs fork: emit partitions[] when the platform code populated
  // them, otherwise null. Each entry's empty-string fields are mapped
  // to null in JS so the shape matches the lsblk path 1:1.
  if (instance->partitionsNull) {
    object.Set(String::New(env, "partitions"), env.Null());
  } else {
    Napi::Object partitionsArr = Napi::Array::New(env);
    uint32_t pIndex = 0;
    for (const Partition &p : instance->partitions) {
      Napi::Object partObj = Napi::Object::New(env);
      partObj.Set(String::New(env, "device"), String::New(env, p.device));

      if (p.size == 0) {
        partObj.Set(String::New(env, "size"), env.Null());
      } else {
        partObj.Set(String::New(env, "size"),
                    Number::New(env, static_cast<double>(p.size)));
      }

      if (p.number < 0) {
        partObj.Set(String::New(env, "number"), env.Null());
      } else {
        partObj.Set(String::New(env, "number"),
                    Number::New(env, static_cast<double>(p.number)));
      }

      auto setStringOrNull = [&](const char *key, const std::string &val) {
        if (val.empty()) {
          partObj.Set(String::New(env, key), env.Null());
        } else {
          partObj.Set(String::New(env, key), String::New(env, val));
        }
      };
      setStringOrNull("fstype", p.fstype);
      setStringOrNull("label", p.label);
      setStringOrNull("uuid", p.uuid);
      setStringOrNull("partlabel", p.partlabel);
      setStringOrNull("parttype", p.parttype);

      Napi::Object mps = Napi::Array::New(env);
      uint32_t mpIdx = 0;
      for (const std::string &path : p.mountpoints) {
        Napi::Object mp = Napi::Object::New(env);
        mp.Set(String::New(env, "path"), String::New(env, path));
        if (mpIdx < p.mountpointLabels.size() &&
            !p.mountpointLabels[mpIdx].empty()) {
          mp.Set(String::New(env, "label"),
                 String::New(env, p.mountpointLabels[mpIdx]));
        } else {
          mp.Set(String::New(env, "label"), env.Null());
        }
        mps.Set(mpIdx, mp);
        mpIdx++;
      }
      partObj.Set(String::New(env, "mountpoints"), mps);

      partObj.Set(String::New(env, "isReadOnly"),
                  Boolean::New(env, p.isReadOnly));

      partitionsArr.Set(pIndex, partObj);
      pIndex++;
    }
    object.Set(String::New(env, "partitions"), partitionsArr);
  }

  return object;
}

}  // namespace Drivelist
