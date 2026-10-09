// anyfs fork POC — verify the partitions field is populated on Linux.
//
//   npx ts-node example/list-partitions.ts
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

function dumpPartition(p: Partition, indent: string) {
	const flags: string[] = [];
	if (p.isReadOnly) flags.push('ro');
	if (p.mountpoints.length) {
		flags.push('mounted@' + p.mountpoints.map((m) => m.path).join(','));
	}
	const head = [
		p.device || '(unnamed)',
		`#${p.number ?? '?'}`,
		fmtBytes(p.size),
		p.fstype || '(unknown FS)',
	].join('  ');
	console.log(`${indent}${head}${flags.length ? '  [' + flags.join(' ') + ']' : ''}`);
	const extras: string[] = [];
	if (p.label) extras.push(`label=${JSON.stringify(p.label)}`);
	if (p.partlabel) extras.push(`partlabel=${JSON.stringify(p.partlabel)}`);
	if (p.uuid) extras.push(`uuid=${p.uuid}`);
	if (p.parttype) extras.push(`parttype=${p.parttype}`);
	if (extras.length) console.log(`${indent}  ${extras.join('  ')}`);
}

function dumpDrive(d: Drive) {
	const tags: string[] = [];
	if (d.isRemovable) tags.push('removable');
	if (d.isSystem) tags.push('system');
	if (d.isUSB) tags.push('USB');
	if (d.isVirtual) tags.push('virtual');
	if (d.isReadOnly) tags.push('ro');
	console.log(
		`\n${d.device}  ${fmtBytes(d.size)}  ${d.busType}  ${d.partitionTableType ?? 'no-PT'}` +
			(tags.length ? `  [${tags.join(', ')}]` : ''),
	);
	console.log(`  ${d.description || '(no description)'}`);
	if (d.partitions === null) {
		console.log('  partitions: (not provided by this platform)');
	} else if (d.partitions.length === 0) {
		console.log('  partitions: (none)');
	} else {
		console.log('  partitions:');
		for (const p of d.partitions) dumpPartition(p, '    ');
	}
}

async function main() {
	const drives = await list();
	console.log(`Found ${drives.length} drives via drivelist.\n`);
	for (const d of drives) dumpDrive(d);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
