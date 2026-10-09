/*
 * Copyright 2018 Balena.io
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

import { posix } from 'path';

import { getPartitionTableType } from '.';
import { Drive, Mountpoint, Partition } from '..';

interface LsblkJsonOutput {
	blockdevices: LsblkJsonOutputDevice[];
}

interface LsblkJsonOutputDevice {
	children: LsblkJsonOutputDeviceChild[];
	hotplug?: string;
	kname?: string;
	label: string | null;
	'log-sec'?: string;
	model: string | null;
	mountpoint: string | null;
	name: string;
	partlabel: string | null;
	'phy-sec'?: string;
	rm?: string;
	ro?: string;
	size?: string;
	subsystems?: string;
	tran?: string;
	vendor: string | null;
	pttype?: 'gpt' | 'dos';
}

// anyfs fork: per-partition fields lsblk --output-all already emits. We
// declare them so getPartitions() can extract a typed Partition[].
interface LsblkJsonOutputDeviceChild {
	name?: string;
	kname?: string;
	label: string | null;
	mountpoint?: string;
	mountpoints?: (string | null)[];
	partlabel: string | null;
	fstype?: string | null;
	uuid?: string | null;
	partuuid?: string | null;
	parttype?: string | null;
	partn?: string | number | null;
	size?: string;
	ro?: string;
}

function getMountpoints(
	children: Array<LsblkJsonOutputDeviceChild | LsblkJsonOutputDevice>,
): Mountpoint[] {
	return children
		.filter((child) => {
			return child.mountpoint;
		})
		.map((child) => {
			return {
				path: child.mountpoint!,
				label: child.label || child.partlabel,
			};
		});
}

// anyfs fork: collect every mountpoint a single child reports.
// Newer lsblk emits `mountpoints: [...]` (array) instead of/in addition
// to legacy `mountpoint: string`, so we union them.
function getChildMountpoints(child: LsblkJsonOutputDeviceChild): Mountpoint[] {
	const paths = new Set<string>();
	if (child.mountpoint) {
		paths.add(child.mountpoint);
	}
	if (child.mountpoints) {
		for (const p of child.mountpoints) {
			if (p) {
				paths.add(p);
			}
		}
	}
	const label = child.label || child.partlabel || null;
	return [...paths].map((path) => ({ path, label }));
}

function getPartitions(
	children: LsblkJsonOutputDeviceChild[] | undefined,
): Partition[] {
	if (!children) {
		return [];
	}
	return children.map((c): Partition => {
		const partn =
			c.partn == null
				? null
				: typeof c.partn === 'number'
				? c.partn
				: Number(c.partn) || null;
		return {
			device: resolveDeviceName(c.name) || resolveDeviceName(c.kname) || '',
			size: Number(c.size) || null,
			number: partn,
			fstype: c.fstype || null,
			label: c.label || null,
			uuid: c.uuid || null,
			partlabel: c.partlabel || null,
			parttype: c.parttype || null,
			mountpoints: getChildMountpoints(c),
			isReadOnly: Number(c.ro) === 1,
		};
	});
}

function getDescription(device: LsblkJsonOutputDevice): string {
	const description = [
		device.label || '',
		device.vendor || '',
		device.model || '',
	];
	if (device.children) {
		let subLabels = device.children
			.filter((c) => (c.label && c.label !== device.label) || c.mountpoint)
			.map((c) => c.label || c.mountpoint);
		subLabels = Array.from(new Set(subLabels));
		if (subLabels.length) {
			description.push(`(${subLabels.join(', ')})`);
		}
	}
	return description.join(' ').replace(/\s+/g, ' ').trim();
}

function resolveDeviceName(name?: string): string | null {
	if (!name) {
		return null;
	}
	if (!posix.isAbsolute(name)) {
		return posix.resolve('/dev', name);
	}
	return name;
}

export function transform(data: LsblkJsonOutput): Drive[] {
	return data.blockdevices
		.map((device) =>
			Object.assign({}, device, {
				name: resolveDeviceName(device.name),
				kname: resolveDeviceName(device.kname),
			}),
		)
		.filter(
			(device) =>
				// Omit loop devices, CD/DVD drives, and RAM
				!device.name.startsWith('/dev/loop') &&
				!device.name.startsWith('/dev/sr') &&
				!device.name.startsWith('/dev/ram'),
		)
		.map(
			(device: LsblkJsonOutputDevice): Drive => {
				const isVirtual = device.subsystems
					? /^(block)$/i.test(device.subsystems)
					: null;
				const isSCSI = device.tran
					? /^(sata|scsi|ata|ide|pci)$/i.test(device.tran)
					: null;
				const isUSB = device.tran ? /^(usb)$/i.test(device.tran) : null;
				const isReadOnly = Number(device.ro) === 1;
				const isRemovable =
					Number(device.rm) === 1 ||
					Number(device.hotplug) === 1 ||
					Boolean(isVirtual);
				return {
					enumerator: 'lsblk:json',
					busType: (device.tran || 'UNKNOWN').toUpperCase(),
					busVersion: null,
					device: device.name,
					devicePath: null,
					raw: device.kname || device.name,
					description: getDescription(device),
					error: null,
					size: Number(device.size) || null,
					blockSize: Number(device['phy-sec']) || 512,
					logicalBlockSize: Number(device['log-sec']) || 512,
					mountpoints: device.children
						? getMountpoints(device.children)
						: getMountpoints([device]),
					isReadOnly,
					isSystem: !isRemovable && !isVirtual,
					isVirtual,
					isRemovable,
					isCard: null,
					isSCSI,
					isUSB,
					isUAS: null,
					partitionTableType: getPartitionTableType(device.pttype),
					partitions: getPartitions(device.children),
				};
			},
		);
}

export function parse(stdout: string): Drive[] {
	return transform(JSON.parse(stdout));
}
