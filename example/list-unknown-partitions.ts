// anyfs fork POC — demonstrate the two-tier permission UX:
// distinguish filesystems already identified by the host from partitions
// with unknown filesystem metadata. Enumeration does not itself grant
// permission to read a filesystem or its raw device.
//
//   npx ts-node example/list-unknown-partitions.ts
//
import { list, Drive, Partition } from '..';

function fmtBytes(n: number | null): string {
	if (n == null) return '?';
	const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
	let v = n;
	let i = 0;
	while (v >= 1024 && i < units.length - 1) {
		v /= 1024;
		i++;
	}
	return `${v.toFixed(v >= 100 ? 0 : 1)} ${units[i]}`;
}

function classifyPartition(p: Partition): 'recognized' | 'unknown' {
	return p.fstype ? 'recognized' : 'unknown';
}

function describePartition(p: Partition): string {
	const bits = [p.device, fmtBytes(p.size)];
	if (p.fstype) bits.push(p.fstype);
	if (p.label) bits.push(`label=${JSON.stringify(p.label)}`);
	if (p.partlabel && p.partlabel !== p.label) {
		bits.push(`partlabel=${JSON.stringify(p.partlabel)}`);
	}
	if (p.parttype) bits.push(`parttype=${p.parttype}`);
	if (p.mountpoints.length) {
		bits.push(`mounted@${p.mountpoints.map((m) => m.path).join(',')}`);
	}
	return bits.join('  ');
}

async function main() {
	const drives = await list();

	const recognized: { drive: Drive; partition: Partition }[] = [];
	const unknown: { drive: Drive; partition: Partition }[] = [];
	const unprobed: Drive[] = [];

	for (const d of drives) {
		if (d.partitions === null) {
			unprobed.push(d);
			continue;
		}
		for (const p of d.partitions) {
			(classifyPartition(p) === 'recognized' ? recognized : unknown).push({
				drive: d,
				partition: p,
			});
		}
	}

	console.log(`Drives enumerated: ${drives.length}\n`);

	console.log(`Recognized partitions (${recognized.length}) — identified by the host:`);
	if (recognized.length === 0) {
		console.log('  (none)');
	} else {
		for (const { partition } of recognized) {
			console.log(`  ${describePartition(partition)}`);
		}
	}

	console.log(
		`\nUnknown partitions (${unknown.length}) — OS doesn't recognize FS;` +
			` would need raw read to identify:`,
	);
	if (unknown.length === 0) {
		console.log('  (none)');
	} else {
		for (const { partition } of unknown) {
			console.log(`  ${describePartition(partition)}`);
		}
	}

	if (unprobed.length > 0) {
		console.log(
			`\nDrives without partition info (${unprobed.length}) — platform binding` +
				` did not provide per-partition metadata:`,
		);
		for (const d of unprobed) {
			console.log(`  ${d.device}  ${fmtBytes(d.size)}  ${d.description}`);
		}
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
