import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

// The Pellwick example, as a team folder: what a team keeps in its repo, and what trial 7 starts from.
test('the Pellwick team folder builds with the right layout and passes check-folder, with and without stories', () => {
  const out = join(temp, 'pellwick');
  const build = spawnSync(process.execPath, [join(root, 'scripts/build-team-folder.ts'), out], { encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  const dir = join(out, 'loupe');
  assert.deepEqual(readdirSync(dir).sort(), ['context', 'learned.md', 'stories', 'templates']);
  assert.ok(!readdirSync(join(dir, 'context')).includes('learned.md'), 'learned.md sits at the root, not in context/');
  assert.deepEqual(readdirSync(join(dir, 'stories')), [], 'a fresh folder has no stories');
  assert.equal(checkFolder(dir).status, 0, checkFolder(dir).stdout);
  for (const story of readdirSync(join(root, 'examples/pellwick/expected'))) copyFileSync(join(root, 'examples/pellwick/expected', story), join(dir, 'stories', story));
  const withStories = spawnSync(process.execPath, [join(root, 'src/run.js'), 'check-folder', dir], { encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-09-30' } });
  assert.deepEqual([withStories.status, withStories.stdout], [0, `Checked with Node ${process.version}.\n`]);
  // It never overwrites a team folder that is already there.
  const again = spawnSync(process.execPath, [join(root, 'scripts/build-team-folder.ts'), out], { encoding: 'utf8' });
  assert.equal(again.status, 1);
  assert.match(again.stderr, /already exists/);
});

// M4c: tickets.md, at the folder's root, is checked against the stories it names.
test('check-folder checks tickets.md: a ticket for a finished story passes, one for a missing story fails', () => {
  const dir = teamFolder('tickets', 'good-story.md');
  writeFileSync(join(dir, 'tickets.md'), 'SUBS-156, 2026-10-02-next-delivery-date.md, created 2026-10-02 14:05\n');
  assert.deepEqual([checkFolder(dir).status, checkFolder(dir).stdout], [0, `Checked with Node ${process.version}.\n`]);
  writeFileSync(join(dir, 'tickets.md'), 'SUBS-156, 2026-10-02-next-delivery-date.md, created 2026-10-02 14:05\nSUBS-157, 2026-10-02-gone.md, created 2026-10-02 15:00\n');
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.ok(run.stdout.includes(`${join(dir, 'tickets.md')}:\n  line 2: There is no story 2026-10-02-gone.md in stories/.\n`), run.stdout);
});

// M5: a story's Calibration line is checked against the team's history.md, and a story saved without one still passes.
test('check-folder checks every Calibration line against history.md in the context folder', () => {
  const dir = teamFolder('history', 'good-look-story.md');
  copyFileSync(join(fixtures, 'good-history.md'), join(dir, 'context/history.md'));
  copyFileSync(join(fixtures, 'good-v2-story.md'), join(dir, 'stories/2026-10-03-no-calibration.md'));
  assert.deepEqual([checkFolder(dir).status, checkFolder(dir).stdout], [0, `Checked with Node ${process.version}.\n`]);
  writeFileSync(join(dir, 'stories/2026-10-04-wrong-numbers.md'), readFileSync(join(fixtures, 'good-look-story.md'), 'utf8').replace('took 7 hours', 'took 9 hours'));
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.ok(
    run.stdout.includes(`${join(dir, 'stories/2026-10-04-wrong-numbers.md')}:\n  line 55: history.md says "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated. Use the numbers from history.md.\n`),
    run.stdout,
  );
  // Without a history file, the line is taken at its word.
  rmSync(join(dir, 'context/history.md'));
  assert.equal(checkFolder(dir).status, 0, checkFolder(dir).stdout);
});

// M4b: looks.md in the context folder is checked by its own rules, by name.
test('check-folder checks looks.md by its own rules and refuses a look that could write', () => {
  const dir = teamFolder('looks', 'good-story.md');
  copyFileSync(join(fixtures, 'good-looks.md'), join(dir, 'context/looks.md'));
  assert.equal(checkFolder(dir).status, 0, checkFolder(dir).stdout);
  copyFileSync(join(fixtures, 'bad/looks/writes-post.md'), join(dir, 'context/looks.md'));
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.ok(run.stdout.includes(`${join(dir, 'context/looks.md')}:\n  line 11: In a look, "-X" takes GET, not "POST".`), run.stdout);
});

// Review fixes: a story's look source names an environment the folder's looks.md lists.
test('check-folder checks each look source in a story against the environments in looks.md', () => {
  const dir = teamFolder('look-sources', 'good-look-story.md');
  copyFileSync(join(fixtures, 'good-looks.md'), join(dir, 'context/looks.md'));
  assert.equal(checkFolder(dir).status, 0, checkFolder(dir).stdout);
  writeFileSync(join(dir, 'stories/2026-10-04-uat.md'), readFileSync(join(fixtures, 'good-look-story.md'), 'utf8').replace('(staging, looked', '(uat, looked'));
  const run = checkFolder(dir);
  assert.equal(run.status, 1);
  assert.ok(run.stdout.includes(`${join(dir, 'stories/2026-10-04-uat.md')}:\n  line 39: This look source names "uat", which no look in looks.md reads.`), run.stdout);
});

// Story format v2: a team folder can hold stories saved in v1 next to new ones in v2.
test('check-folder passes a folder with a saved v1 story and a new v2 story', () => {
  const dir = teamFolder('v1-and-v2', 'good-story.md');
  copyFileSync(join(fixtures, 'good-v2-story.md'), join(dir, 'stories/2026-10-03-next-delivery-date-v2.md'));
  const run = checkFolder(dir);
  assert.deepEqual([run.status, run.stdout], [0, `Checked with Node ${process.version}.\n`]);
});
