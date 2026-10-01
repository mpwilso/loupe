import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const fixtures = join(root, 'tests/fixtures');
const temp = mkdtempSync(join(tmpdir(), 'loupe-folder-'));
after(() => rmSync(temp, { recursive: true }));

// A team folder: context/, learned.md, templates/ and stories/.
function teamFolder(name: string, story: string): string {
  const dir = join(temp, name, 'loupe');
  for (const sub of ['context', 'templates', 'stories']) mkdirSync(join(dir, sub), { recursive: true });
  copyFileSync(join(fixtures, 'good-context.md'), join(dir, 'context/applications.md'));
  copyFileSync(join(fixtures, 'good-learned.md'), join(dir, 'learned.md'));
  copyFileSync(join(root, 'examples/pellwick/templates/change-request.md'), join(dir, 'templates/change-request.md'));
  copyFileSync(join(fixtures, story), join(dir, 'stories/2026-10-02-next-delivery-date.md'));
  return dir;
}
const checkFolder = (dir: string) =>
  spawnSync(process.execPath, [join(root, 'src/run.js'), 'check-folder', dir], { encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-10-02' } });

test('check-folder passes a team folder whose context, learned.md, templates and stories all pass', () => {
  const run = checkFolder(teamFolder('good', 'good-story.md'));
  assert.deepEqual([run.status, run.stdout, run.stderr], [0, `Checked with Node ${process.version}.\n`, '']);
});

test('check-folder fails a folder with a failing story, naming the file and the problem', () => {
  const dir = teamFolder('bad', 'bad/too-many-items.md');
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.ok(run.stdout.includes(`${join(dir, 'stories/2026-10-02-next-delivery-date.md')}:\n  line 17: Known has 6 items; the limit is 5.\n`), run.stdout);
  assert.doesNotMatch(run.stdout, /Checked with Node/);
});

test('check-folder checks learned.md against the context files, wherever it sits in the folder', () => {
  const dir = teamFolder('learned', 'good-story.md');
  writeFileSync(join(dir, 'context/applications.md'), '---\ntitle: Applications\nupdated: 2026-09-01\nsources:\n  - Interview\n---\n- Stockroom is the staff tool. (Interview)\n');
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.match(run.stdout, /learned\.md:\n {2}line 12: "replaces:" quotes "The web app is where customers manage their orders\."/);
});

test('check-folder needs a team folder: no context folder is a usage error', () => {
  const empty = join(temp, 'empty');
  mkdirSync(empty);
  const run = checkFolder(empty);
  assert.equal(run.status, 2);
  assert.match(run.stderr, /No context folder in .+\. A team folder holds context\/, learned\.md, templates\/ and stories\/\./);
  assert.equal(checkFolder('').status, 2);
});
