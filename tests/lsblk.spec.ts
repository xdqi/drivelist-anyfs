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

import { expect } from 'chai';
import { readFileSync } from 'fs';
import { join } from 'path';
import * as util from 'util';

import { transform as transformJSON } from '../lib/lsblk/json';
import { parse as parsePairs } from '../lib/lsblk/pairs';

function inspect(value: any) {
	console.log(
		util.inspect(value, {
			colors: true,
			depth: null,
		}),
	);
}

describe('Drivelist', () => {
	context('lsblk', () => {
		it('can handle --pairs output on Ubuntu 14.04', () => {
			const listData = readFileSync(
				join(__dirname, 'data', 'lsblk', 'ubuntu-14.04-1.txt'),
				'utf8',
			);
			const devices = parsePairs(listData);

			const expected = [
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sda',
					devicePath: null,
					raw: '/dev/sda',
					description: '(/boot/efi, /, [SWAP], /home)',
					partitionTableType: 'gpt',
					error: null,
					size: 1024209543168,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [
						{
							path: '/boot/efi',
							label: undefined,
						},
						{
							path: '/',
							label: undefined,
						},
						{
							path: '[SWAP]',
							label: undefined,
						},
						{
							path: '/home',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: true,
					isVirtual: null,
					isRemovable: false,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
			];

			inspect(parsePairs(listData));

			expect(devices).to.deep.equal(expected);
		});

		it('can handle --pairs output on Ubuntu 14.04, sample 2', () => {
			const listData = readFileSync(
				join(__dirname, 'data', 'lsblk', 'ubuntu-14.04-2.txt'),
				'utf8',
			);
			const devices = parsePairs(listData);

			const expected = [
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/fd0',
					devicePath: null,
					partitionTableType: null,
					raw: '/dev/fd0',
					description: 'fd0',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [],
					isReadOnly: false,
					isSystem: false,
					isVirtual: null,
					isRemovable: true,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sda',
					devicePath: null,
					raw: '/dev/sda',
					description: '(/, [SWAP])',
					partitionTableType: 'gpt',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [
						{
							path: '/',
							label: undefined,
						},
						{
							path: '[SWAP]',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: true,
					isVirtual: null,
					isRemovable: false,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
			];

			inspect(parsePairs(listData));

			expect(devices).to.deep.equal(expected);
		});

		it('can handle mountpoints on root devices', () => {
			const listData = require('./data/lsblk/no-children-mountpoints.json');
			const actual = transformJSON(listData);

			const expected = [
				{
					enumerator: 'lsblk:json',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sda',
					devicePath: null,
					raw: '/dev/sda',
					description: '',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					partitionTableType: null,
					mountpoints: [
						{
							path: '/media/jwentz/Temp',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: false,
					isVirtual: null,
					isRemovable: true,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: [],
				},
				{
					enumerator: 'lsblk:json',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/nvme0n1',
					devicePath: null,
					raw: '/dev/nvme0n1',
					partitionTableType: 'gpt',
					description: '([SWAP], /boot/efi, /)',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [
						{
							path: '[SWAP]',
							label: undefined,
						},
						{
							path: '/boot/efi',
							label: undefined,
						},
						{
							path: '/',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: true,
					isVirtual: null,
					isRemovable: false,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: [
						{
							device: '/dev/nvme0n1p3',
							size: null,
							number: null,
							fstype: null,
							label: null,
							uuid: null,
							partlabel: null,
							parttype: null,
							mountpoints: [{ path: '[SWAP]', label: null }],
							isReadOnly: false,
						},
						{
							device: '/dev/nvme0n1p1',
							size: null,
							number: null,
							fstype: null,
							label: null,
							uuid: null,
							partlabel: null,
							parttype: null,
							mountpoints: [{ path: '/boot/efi', label: null }],
							isReadOnly: false,
						},
						{
							device: '/dev/nvme0n1p2',
							size: null,
							number: null,
							fstype: null,
							label: null,
							uuid: null,
							partlabel: null,
							parttype: null,
							mountpoints: [{ path: '/', label: null }],
							isReadOnly: false,
						},
					],
				},
			];

			inspect(actual);

			expect(actual).to.deep.equal(expected);
		});

		it('can handle empty mountpoints in lsblk --pairs output', () => {
			const listData = readFileSync(
				join(__dirname, 'data', 'lsblk', 'ubuntu-14.04-3.txt'),
				'utf8',
			);
			const actual = parsePairs(listData);
			const expected = [
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sda',
					devicePath: null,
					raw: '/dev/sda',
					description: 'sda',
					partitionTableType: 'mbr',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [],
					isReadOnly: false,
					isSystem: true,
					isVirtual: null,
					isRemovable: false,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sdb',
					partitionTableType: null,
					devicePath: null,
					raw: '/dev/sdb',
					description: 'sdb',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [],
					isReadOnly: false,
					isSystem: false,
					isVirtual: null,
					isRemovable: true,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sdc',
					partitionTableType: null,
					devicePath: null,
					raw: '/dev/sdc',
					description: 'sdc',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [],
					isReadOnly: false,
					isSystem: false,
					isVirtual: null,
					isRemovable: true,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/sdd',
					partitionTableType: 'mbr',
					devicePath: null,
					raw: '/dev/sdd',
					description:
						'(/media/<username>/85CA-6700, /tmp/media/3E3E-E910 (\\xe2\\x88\\x95dev\\xe2\\x88\\x95sdi))',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [
						{
							path: '/media/<username>/85CA-6700',
							label: undefined,
						},
						{
							path:
								'/tmp/media/3E3E-E910 (\\xe2\\x88\\x95dev\\xe2\\x88\\x95sdi)',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: false,
					isVirtual: null,
					isRemovable: true,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
				{
					enumerator: 'lsblk:pairs',
					busType: 'UNKNOWN',
					busVersion: null,
					device: '/dev/nvme0n1',
					partitionTableType: 'gpt',
					devicePath: null,
					raw: '/dev/nvme0n1',
					description: '(/)',
					error: null,
					size: null,
					blockSize: 512,
					logicalBlockSize: 512,
					mountpoints: [
						{
							path: '/',
							label: undefined,
						},
					],
					isReadOnly: false,
					isSystem: true,
					isVirtual: null,
					isRemovable: false,
					isCard: null,
					isSCSI: null,
					isUSB: null,
					isUAS: null,
					partitions: null,
				},
			];

			inspect(actual);

			expect(actual).to.deep.equal(expected);
		});

		it('can handle mountpoints on root devices in --pairs output', () => {
			const listData = readFileSync(
				join(__dirname, 'data', 'lsblk', 'no-partition-table.txt'),
				'utf8',
			);
			const devices = parsePairs(listData);

			const expected = [
				{
					blockSize: 512,
					busType: 'UNKNOWN',
					busVersion: null,
					description: '(/boot/efi, /boot)',
					device: '/dev/sda',
					partitionTableType: 'gpt',
					devicePath: null,
					enumerator: 'lsblk:pairs',
					error: null,
					isCard: null,
					isReadOnly: false,
					isRemovable: false,
					isSCSI: null,
					isSystem: true,
					isUAS: null,
					isUSB: null,
					isVirtual: null,
					logicalBlockSize: 512,
					mountpoints: [
						{
							label: undefined,
							path: '/boot/efi',
						},
						{
							label: undefined,
							path: '/boot',
						},
					],
					partitions: null,
					raw: '/dev/sda',
					size: 240065183744,
				},
				{
					blockSize: 512,
					busType: 'UNKNOWN',
					busVersion: null,
					description: 'sdb',
					device: '/dev/sdb',
					partitionTableType: null,
					devicePath: null,
					enumerator: 'lsblk:pairs',
					error: null,
					isCard: null,
					isReadOnly: false,
					isRemovable: true,
					isSCSI: null,
					isSystem: false,
					isUAS: null,
					isUSB: null,
					isVirtual: null,
					logicalBlockSize: 512,
					mountpoints: [],
					partitions: null,
					raw: '/dev/sdb',
					size: null,
				},
				{
					blockSize: 512,
					busType: 'UNKNOWN',
					busVersion: null,
					description: '(/run/media/DA2E4172/BUILD)',
					device: '/dev/sdc',
					partitionTableType: null,
					devicePath: null,
					enumerator: 'lsblk:pairs',
					error: null,
					isCard: null,
					isReadOnly: false,
					isRemovable: true,
					isSCSI: null,
					isSystem: false,
					isUAS: null,
					isUSB: null,
					isVirtual: null,
					logicalBlockSize: 512,
					mountpoints: [
						{
							label: undefined,
							path: '/run/media/DA2E4172/BUILD',
						},
					],
					partitions: null,
					raw: '/dev/sdc',
					size: 31457280000,
				},
			];

			inspect(parsePairs(listData));

			expect(devices).to.deep.equal(expected);
		});

		// anyfs fork: lsblk --json --output-all on modern util-linux
		// reports rm/ro as booleans, size as a number, and emits
		// `mountpoints: [...]` per child alongside legacy `mountpoint`.
		// Also exercises the unknown-partition fallthrough (no fstype/
		// label/uuid) — the motivating case for surfacing partitions.
		it('parses modern --output-all and populates partitions[]', () => {
			const listData = require('./data/lsblk/output-all-modern.json');
			const actual = transformJSON(listData);

			expect(actual).to.have.lengthOf(2);

			const nvme = actual[0];
			expect(nvme.device).to.equal('/dev/nvme0n1');
			expect(nvme.busType).to.equal('NVME');
			expect(nvme.size).to.equal(1000204886016);
			expect(nvme.isRemovable).to.equal(false);
			expect(nvme.isSystem).to.equal(true);
			expect(nvme.isReadOnly).to.equal(false);
			expect(nvme.partitionTableType).to.equal('gpt');
			expect(nvme.description).to.equal(
				'Samsung SSD 980 PRO 1TB (EFI, boot, root)',
			);
			expect(nvme.mountpoints).to.deep.equal([
				{ path: '/boot/efi', label: 'EFI' },
				{ path: '/boot', label: 'boot' },
				{ path: '/', label: 'root' },
			]);
			expect(nvme.partitions).to.deep.equal([
				{
					device: '/dev/nvme0n1p1',
					size: 536870912,
					number: 1,
					fstype: 'vfat',
					label: 'EFI',
					uuid: '1A23-4B56',
					partlabel: 'EFI System Partition',
					parttype: 'c12a7328-f81f-11d2-ba4b-00a0c93ec93b',
					mountpoints: [{ path: '/boot/efi', label: 'EFI' }],
					isReadOnly: false,
				},
				{
					device: '/dev/nvme0n1p2',
					size: 1073741824,
					number: 2,
					fstype: 'ext4',
					label: 'boot',
					uuid: '22222222-2222-2222-2222-222222222222',
					partlabel: 'boot',
					parttype: 'bc13c2ff-59e6-4262-a352-b275fd6f7172',
					mountpoints: [{ path: '/boot', label: 'boot' }],
					isReadOnly: false,
				},
				{
					device: '/dev/nvme0n1p3',
					size: 998594273280,
					number: 3,
					fstype: 'ext4',
					label: 'root',
					uuid: '44444444-4444-4444-4444-444444444444',
					partlabel: 'root',
					parttype: '4f68bce3-e8cd-4db1-96e7-fbcaf984b709',
					mountpoints: [
						{ path: '/', label: 'root' },
						{ path: '/var/lib/docker/btrfs', label: 'root' },
					],
					isReadOnly: false,
				},
			]);

			const sda = actual[1];
			expect(sda.device).to.equal('/dev/sda');
			expect(sda.busType).to.equal('USB');
			expect(sda.isUSB).to.equal(true);
			expect(sda.isRemovable).to.equal(true);
			expect(sda.isSystem).to.equal(false);
			expect(sda.partitionTableType).to.equal('mbr');
			expect(sda.partitions).to.have.lengthOf(2);

			// Unknown partition: the OS hasn't identified the filesystem,
			// so fstype/label/uuid/partlabel all surface as null.
			// The UI uses this signal to ask for raw access.
			const unknown = sda.partitions![0];
			expect(unknown).to.deep.equal({
				device: '/dev/sda1',
				size: 104857600,
				number: 1,
				fstype: null,
				label: null,
				uuid: null,
				partlabel: null,
				parttype: '0xda',
				mountpoints: [],
				isReadOnly: false,
			});
		});

		// anyfs fork: confirm the unknown-partition signal survives
		// when transformJSON is called on a synthesized input — the
		// canonical "FS Linux doesn't recognize" shape.
		it('surfaces unknown partitions as null FS-info fields', () => {
			const actual = transformJSON({
				blockdevices: [
					{
						name: '/dev/sdz',
						kname: '/dev/sdz',
						subsystems: 'block:scsi:usb',
						tran: 'usb',
						rm: '1',
						ro: '0',
						size: '8000000000',
						'phy-sec': '512',
						'log-sec': '512',
						label: null,
						vendor: 'Generic',
						model: 'USB Stick',
						pttype: 'gpt',
						mountpoint: null,
						partlabel: null,
						children: [
							{
								name: '/dev/sdz1',
								kname: '/dev/sdz1',
								size: '8000000000',
								ro: '0',
								fstype: null,
								label: null,
								uuid: null,
								partlabel: null,
								partuuid: null,
								parttype:
									'0fc63daf-8483-4772-8e79-3d69d8477de4',
								partn: 1,
								mountpoint: null,
								mountpoints: [null],
							},
						],
					},
				],
			} as any);

			expect(actual).to.have.lengthOf(1);
			expect(actual[0].partitions).to.deep.equal([
				{
					device: '/dev/sdz1',
					size: 8000000000,
					number: 1,
					fstype: null,
					label: null,
					uuid: null,
					partlabel: null,
					parttype: '0fc63daf-8483-4772-8e79-3d69d8477de4',
					mountpoints: [],
					isReadOnly: false,
				},
			]);
		});
	});
});
