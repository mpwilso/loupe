// Builds the skill folder from the repo's own files: what goes in the zip for claude.ai, and what
// install-claude-code.ts copies for Claude Code. One list, so the two never drift. Plain Node, no packages.
// Usage: node scripts/skill-folder.ts <dir>   (replaces <dir>)
import { copyFileSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));

// Each file in the skill folder, and the repo file it comes from.
export function skillFiles(): Record<string, string> {
  const folder = (dir: string, ext: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith(ext)).sort();
  return {
    'SKILL.md': 'skill/SKILL.md',
    'writing-rules.md': 'skill/writing-rules.md',
    'learning.md': 'skill/learning.md',
    'files-mode.md': 'skill/files-mode.md',
    'tracker.md': 'skill/tracker.md',
    ...Object.fromEntries(['run.js', 'node-version.js', 'check.ts', 'check-context.ts', 'check-folder.ts', 'check-tickets.ts', 'spec.ts'].map((f) => [`src/${f}`, `src/${f}`])),
    ...Object.fromEntries(folder('spec', '.json').map((f) => [`spec/${f}`, `spec/${f}`])),
    ...Object.fromEntries(folder('templates', '.md').map((f) => [`templates/${f}`, `templates/${f}`])),
    'examples/story.md': 'examples/pellwick/expected/skip-a-box.md',
    'examples/not-ready.md': 'examples/pellwick/expected/export-notes.md',
    'examples/context-file.md': 'examples/pellwick/context/applications.md',
  };
}

export function buildSkillFolder(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
  for (const [to, from] of Object.entries(skillFiles())) {
    mkdirSync(join(dir, to, '..'), { recursive: true });
    copyFileSync(join(root, from), join(dir, to));
  }
  // Tells Node the checkers are modules. They need nothing else.
  writeFileSync(join(dir, 'package.json'), '{ "type": "module", "private": true }\n');
}

if (import.meta.main) {
  const [dir] = process.argv.slice(2);
  if (!dir) {
    console.error('Usage: node scripts/skill-folder.ts <dir>');
    process.exit(2);
  }
  buildSkillFolder(dir);
}
