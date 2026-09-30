// Writes and reads zip files with nothing but Node, so building the skill needs no zip tool.
// Usage: node scripts/zip.ts out.zip folder
// The folder itself becomes the root of the zip, as claude.ai expects for a skill.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { crc32, deflateRawSync, inflateRawSync } from 'node:zlib';

const DOS_DATE = (1 << 5) | 1; // 1980-01-01, so the same files always give the same zip.
const UTF8 = 0x0800;

export function writeZip(entries: { name: string; data?: Buffer }[]): Buffer {
  const locals: Buffer[] = [];
  const centrals: Buffer[] = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const file = Buffer.from(name);
    const body = data ? deflateRawSync(data) : Buffer.alloc(0);
    const crc = data ? crc32(data) : 0;
    const size = data?.length ?? 0;
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(UTF8, 6);
    local.writeUInt16LE(data ? 8 : 0, 8);
    local.writeUInt16LE(DOS_DATE, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(body.length, 18);
    local.writeUInt32LE(size, 22);
    local.writeUInt16LE(file.length, 26);
    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(UTF8, 8);
    central.writeUInt16LE(data ? 8 : 0, 10);
    central.writeUInt16LE(DOS_DATE, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(body.length, 20);
    central.writeUInt32LE(size, 24);
    central.writeUInt16LE(file.length, 28);
    central.writeUInt32LE(data ? 0 : 0x10, 38); // 0x10 marks a folder.
    central.writeUInt32LE(offset, 42);
    locals.push(local, file, body);
    centrals.push(central, file);
    offset += local.length + file.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}

// Reads back what writeZip writes: every entry's name, and the contents of each file.
export function readZip(zip: Buffer): { name: string; data?: Buffer }[] {
  const end = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (end < 0) throw new Error('Not a zip file.');
  const count = zip.readUInt16LE(end + 10);
  let at = zip.readUInt32LE(end + 16);
  const entries: { name: string; data?: Buffer }[] = [];
  for (let i = 0; i < count; i++) {
    const method = zip.readUInt16LE(at + 10);
    const compressed = zip.readUInt32LE(at + 20);
    const nameLength = zip.readUInt16LE(at + 28);
    const skip = nameLength + zip.readUInt16LE(at + 30) + zip.readUInt16LE(at + 32);
    const local = zip.readUInt32LE(at + 42);
    const name = zip.toString('utf8', at + 46, at + 46 + nameLength);
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const body = zip.subarray(start, start + compressed);
    entries.push(name.endsWith('/') ? { name } : { name, data: method === 8 ? inflateRawSync(body) : Buffer.from(body) });
    at += 46 + skip;
  }
  return entries;
}

// Every folder and file under root, sorted, with folders ending in "/".
function walk(root: string, prefix: string): { name: string; data?: Buffer }[] {
  return readdirSync(root)
    .sort()
    .flatMap((item) => {
      const path = join(root, item);
      const name = `${prefix}${item}`;
      return statSync(path).isDirectory() ? [{ name: `${name}/` }, ...walk(path, `${name}/`)] : [{ name, data: readFileSync(path) }];
    });
}

if (import.meta.main) {
  const [out, folder] = process.argv.slice(2);
  if (!out || !folder) {
    console.error('Usage: node scripts/zip.ts out.zip folder');
    process.exit(2);
  }
  const root = `${basename(folder)}/`;
  writeFileSync(out, writeZip([{ name: root }, ...walk(folder, root)]));
}
