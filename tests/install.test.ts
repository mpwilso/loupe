import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readZip } from '../scripts/zip.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-install-'));
after(() => rmSync(temp, { recursive: true }));

// Runs the installer with a stand-in home folder, so the test never touches the real ~/.claude.
const install = (home: string, ...args: string[]) =>
  spawnSync(process.execPath, [join(root, 'scripts/install-claude-code.ts'), ...args], {
    encoding: 'utf8',
    env: { ...process.env, HOME: home, USERPROFILE: home },
  });
const files = (dir: string): Record<string, string> =>
  Object.fromEntries(
    readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => statSync(join(dir, f)).isFile())
      .map((f) => [relative(dir, join(dir, f)).split('\\').join('/'), readFileSync(join(dir, f), 'utf8')]),
  );

test('installs per user to ~/.claude/skills/loupe, the same files as the skill zip', () => {
  const home = join(temp, 'home');
  const run = install(home);
  assert.equal(run.status, 0, run.stderr);
  const dest = join(home, '.claude/skills/loupe');
  assert.match(run.stdout, /Installed Loupe/);
  const zipPath = join(temp, 'loupe-skill.zip');
  const build = spawnSync('bash', ['scripts/build-skill.sh', zipPath], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  const zipped = Object.fromEntries(readZip(readFileSync(zipPath)).filter((e) => e.data).map((e) => [e.name.replace(/^loupe\//, ''), e.data!.toString('utf8')]));
  assert.deepEqual(files(dest), zipped);
});

test('installs per project with --project, to <path>/.claude/skills/loupe', () => {
  const project = join(temp, 'project');
  mkdirSync(project);
  const run = install(join(temp, 'unused-home'), '--project', project);
  assert.equal(run.status, 0, run.stderr);
  assert.ok(existsSync(join(project, '.claude/skills/loupe/SKILL.md')));
  assert.ok(!existsSync(join(temp, 'unused-home/.claude')), 'nothing per user');
});

test('replaces an older Loupe in place, leaving none of its old files', () => {
  const home = join(temp, 'update');
  assert.equal(install(home).status, 0);
  const dest = join(home, '.claude/skills/loupe');
  writeFileSync(join(dest, 'old-file.md'), 'left from an older version');
  const run = install(home);
  assert.equal(run.status, 0, run.stderr);
  assert.match(run.stdout, /Updated Loupe/);
  assert.ok(!existsSync(join(dest, 'old-file.md')));
});

test('refuses to overwrite a different skill named loupe, and says how to replace it', () => {
  const home = join(temp, 'other');
  const dest = join(home, '.claude/skills/loupe');
  mkdirSync(dest, { recursive: true });
  writeFileSync(join(dest, 'SKILL.md'), '---\nname: loupe\ndescription: Someone else\'s magnifier.\n---\n');
  const run = install(home);
  assert.equal(run.status, 1);
  assert.match(run.stderr, /holds a different skill named loupe/);
  assert.match(run.stderr, /rename or delete that folder yourself, then run this again/i);
  assert.deepEqual(readdirSync(dest), ['SKILL.md'], 'left as it was');
});

test('a bad option is a usage error', () => {
  assert.equal(install(join(temp, 'bad'), '--projet', 'x').status, 2);
  assert.equal(install(join(temp, 'bad'), '--project').status, 2);
});
