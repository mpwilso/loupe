// Builds a team folder from the Pellwick example: loupe/context/, loupe/learned.md, loupe/templates/ and an empty
// loupe/stories/. It leaves out the expected stories, so a trial stays blind. Plain Node, no packages.
// Usage: node scripts/build-team-folder.ts <out-dir>   (writes <out-dir>/loupe; never overwrites one)
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const example = fileURLToPath(new URL('../examples/pellwick/', import.meta.url));
const [out] = process.argv.slice(2);
if (!out) {
  console.error('Usage: node scripts/build-team-folder.ts <out-dir>');
  process.exit(2);
}
const dir = join(out, 'loupe');
if (existsSync(dir)) {
  console.error(`${dir} already exists. Move it or delete it first; this script never overwrites a team folder.`);
  process.exit(1);
}
mkdirSync(join(dir, 'context'), { recursive: true });
mkdirSync(join(dir, 'stories'));
for (const file of readdirSync(join(example, 'context'))) {
  // learned.md sits at the folder's root; the other context files go in context/.
  cpSync(join(example, 'context', file), join(dir, file === 'learned.md' ? file : join('context', file)));
}
cpSync(join(example, 'templates'), join(dir, 'templates'), { recursive: true });
console.log(`built ${dir}`);
