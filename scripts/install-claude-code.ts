// Installs Loupe as a Claude Code skill: per user in ~/.claude/skills/loupe, or per project with --project <path> in
// <path>/.claude/skills/loupe, the two locations Claude Code's skills docs give. Plain Node, no packages, any OS.
// It updates an older Loupe in place, and never overwrites a different skill that happens to be named loupe.
// Usage: node scripts/install-claude-code.ts [--project <path>]
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { buildSkillFolder } from './skill-folder.ts';

const usage = 'Usage: node scripts/install-claude-code.ts [--project <path>]\nWithout --project, Loupe is installed for you, in every project.';
let project: string | undefined;
try {
  ({ values: { project } } = parseArgs({ options: { project: { type: 'string' } } }));
} catch {
  console.error(usage);
  process.exit(2);
}

const dest = project ? join(resolve(project), '.claude', 'skills', 'loupe') : join(homedir(), '.claude', 'skills', 'loupe');

// A Loupe skill folder holds Loupe's story shape; a different skill named loupe wouldn't.
const isLoupe = (dir: string) =>
  existsSync(join(dir, 'spec', 'story-shape.json')) && /^name: loupe$/m.test(readFileSync(join(dir, 'SKILL.md'), 'utf8'));
const existed = existsSync(dest);
if (existed && !(existsSync(join(dest, 'SKILL.md')) && isLoupe(dest))) {
  console.error(`${dest} holds a different skill named loupe. Rename or delete that folder yourself, then run this again.`);
  process.exit(1);
}

const build = mkdtempSync(join(tmpdir(), 'loupe-skill-'));
try {
  buildSkillFolder(join(build, 'loupe'));
  rmSync(dest, { recursive: true, force: true });
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(join(build, 'loupe'), dest, { recursive: true });
} finally {
  rmSync(build, { recursive: true, force: true });
}
console.log(`${existed ? 'Updated' : 'Installed'} Loupe in ${dest}.`);
console.log('Start Claude Code in a repository with a loupe/ folder, and paste notes or name a file to get a story.');
