import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { builtInFolder, check, findTeamTemplates, loadTemplates } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { format, loadSpec } from '../src/spec.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const list = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);
const teams = readdirSync(join(root, 'examples'));

test('every story template, built-in or team, passes the checker', () => {
  const templates = list('templates').filter((path) => !path.endsWith('definition-of-ready.md'));
  assert.equal(templates.length, 4);
  for (const team of teams) if (existsSync(join(root, `examples/${team}/templates`))) templates.push(...list(`examples/${team}/templates`));
  for (const path of templates) assert.deepEqual(check(read(path)).errors.map(format), [], path);
});

test('the definition of ready names all five things in the readiness bar', () => {
  const text = read('templates/definition-of-ready.md').toLowerCase();
  const { items } = loadSpec<{ items: { label: string }[] }>('readiness.json');
  for (const { label } of items) assert.ok(text.includes(label.replace(/^the /, '')), label);
});

test('every expected example passes the checker, with the team templates it finds', () => {
  for (const team of teams) {
    const paths = list(`examples/${team}/expected`);
    assert.ok(paths.length > 0);
    for (const path of paths) {
      const folder = findTeamTemplates(join(root, path));
      const templates = [...loadTemplates(builtInFolder), ...(folder ? loadTemplates(folder) : [])];
      assert.deepEqual(check(read(path), templates).errors.map(format), [], path);
    }
  }
});

test('every example context file passes, with no warnings on the day it was written for', () => {
  for (const team of teams) {
    for (const path of list(`examples/${team}/context`)) {
      const result = checkContext(read(path), new Date('2026-09-30T00:00:00Z'));
      assert.deepEqual([...result.errors, ...result.warnings].map(format), [], path);
    }
  }
});

// Text only: a binary file, like the demo GIF, can hold the em dash's three bytes by chance.
// Like git, a file with a NUL byte counts as binary.
const hasEmDash = (bytes: Buffer) => !bytes.includes(0) && bytes.toString('utf8').includes('\u2014');

test('no tracked text file contains an em dash', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  assert.ok(files.length > 0);
  const offenders = files.filter((path) => hasEmDash(readFileSync(join(root, path))));
  assert.deepEqual(offenders, []);
  assert.ok(hasEmDash(Buffer.from('A pause\u2014then more.')), 'text with an em dash is caught');
  assert.ok(!hasEmDash(Buffer.concat([Buffer.from('GIF89a\0'), Buffer.from('\u2014')])), 'binary bytes are not text');
});

// Without pipefail, "scripts/test.sh | tee" takes tee's exit code, so failing tests would pass CI.
test('the CI test step keeps pipefail when it pipes its output', () => {
  const lines = read('.github/workflows/tests.yml').split('\n');
  const start = lines.findIndex((line) => /^\s*- run: .*scripts\/test\.sh/.test(line));
  assert.ok(start >= 0, 'no step runs scripts/test.sh');
  const indent = lines[start].indexOf('-');
  const step = [lines[start]];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() && line.search(/\S/) <= indent) break;
    step.push(line);
  }
  const text = step.join('\n');
  if (!text.includes('|')) return;
  assert.ok(/^\s*shell: bash\s*$/m.test(text) || text.includes('set -o pipefail'), `The test step pipes its output but has no "shell: bash" or "set -o pipefail":\n${text}`);
});

// The README's proof strip is built from these tables, so their columns and rows must not drift.
const tables = () => {
  const found: string[][] = [];
  let current: string[] | undefined;
  for (const line of read('docs/trial-run.md').split('\n')) {
    if (!line.startsWith('|')) current = undefined;
    else if (current) current.push(line);
    else found.push((current = [line]));
  }
  return found;
};
const firstCells = (rows: string[]) => rows.slice(2).map((row) => row.split('|')[1].trim());
const inputs = ['skip-a-box-meeting.md', 'helpline-ticket-48213.md', 'holiday-cutoff-email.md', 'export-notes.md', 'slack-thread-address-change.md'];
const resultHeader = '| Input | Expected | Skill used | Node | Checker ran | Passed checker | Write time | Steps shown | Time | Review time | Edits | Unsupported facts | Dev questions | Right call |';

test('the trial run tables keep their fixed columns and rows', () => {
  const [baseline, setup, loupe, comparison, ...rest] = tables();
  assert.deepEqual(rest, []);
  for (const results of [baseline, loupe]) {
    assert.deepEqual(results.slice(0, 2), [resultHeader, '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|']);
    assert.deepEqual(firstCells(results), inputs);
    assert.deepEqual(results.slice(2).map((row) => row.split('|')[2].trim()), ['story', 'story', 'story', 'not ready', 'story']);
  }
  for (const input of inputs) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
  assert.deepEqual(firstCells(setup), [
    'Time',
    'Context files written',
    'Every file passed check-context',
    'Facts dropped',
    'Facts added',
    'Change request template written',
    'Template passed the checker',
  ]);
  assert.deepEqual(comparison.slice(0, 2), ['| Measure | Loupe | Baseline |', '|---|---|---|']);
  assert.deepEqual(firstCells(comparison), [
    'Write time',
    'Time to accepted story',
    'Review time',
    'Edits',
    'Unsupported facts',
    'Correct refusals',
    'Questions a developer would still ask',
  ]);
  assert.match(read('docs/trial-run.md'), /target for Loupe is about one to three minutes, fully checked/);
  assert.doesNotMatch(read('docs/trial-run.md'), /60 seconds|1:00/);
  for (const results of [baseline, loupe]) for (const row of results.slice(2)) assert.equal(row.split('|').length, resultHeader.split('|').length, row);
  assert.ok(read('docs/trial-run.md').includes('```\nWrite a user story with acceptance criteria for this. Use the attached team files.\n```'));
});

test('every CI action is pinned to a commit, and the trial kit stays blind', () => {
  const workflow = read('.github/workflows/tests.yml');
  const uses = [...workflow.matchAll(/uses: (\S+)/g)].map((m) => m[1]);
  assert.ok(uses.length > 0);
  for (const action of uses) assert.match(action, /@[0-9a-f]{40}$/, action);
  for (const name of ['loupe-skill', 'pellwick-trial-kit']) assert.ok(workflow.includes(`name: ${name}\n`), name);
  assert.equal(workflow.match(/retention-days: 7\n/g)?.length, 2);
  assert.doesNotMatch(workflow, /examples\/pellwick\/expected/);
  for (const folder of ['context', 'templates', 'inputs', 'raw']) assert.ok(workflow.includes(`examples/pellwick/${folder}/\n`), folder);
});

// Trial 3: the skill did not start in 1 of 6 runs. The project instructions name it first, and the trial counts a run without it.
const projectLine = 'For any story, bug report, ticket or change request, use the loupe skill.';

test('the project instructions start by naming the loupe skill', () => {
  const block = read('docs/claude-project.md').split('```\n')[1] ?? '';
  assert.equal(block.split('\n')[0], projectLine);
});

test('every Loupe pass pastes the project instructions, and a run without the skill fails', () => {
  const [baseline, , loupe] = tables();
  assert.deepEqual(baseline.slice(2).map((row) => row.split('|')[3].trim()), ['n/a', 'n/a', 'n/a', 'n/a', 'n/a']);
  assert.deepEqual(loupe.slice(2).map((row) => row.split('|')[3].trim()), ['yes', 'yes', 'yes', 'yes', 'yes']);
  const trial = read('docs/trial-run.md');
  for (const pass of ['## Pass B', '## Pass C']) assert.match(trial.split(pass)[1].split('\n## ')[0], /Paste the project instructions from claude-project\.md, step 3/, pass);
  assert.match(trial, /A run where the skill didn't start counts as a failure/);
});

// The law matches the skill.
test('direction.md keeps "Before release" to story-specific actions and sets the speed goal', () => {
  const direction = read('docs/direction.md');
  assert.match(direction, /^Before release: only the actions specific to this story, such as telling support about a named change, or "None\."$/m);
  assert.doesNotMatch(direction, /definition-of-done items it triggers/);
  assert.match(direction, /^- Time to write a story: about one to three minutes, fully checked\.$/m);
});

test('the trial run names its projects by trial number, not a fixed trial', () => {
  const trial = read('docs/trial-run.md');
  assert.doesNotMatch(trial, /trial 2/i);
  for (const pass of ['baseline', 'setup', 'Loupe']) assert.ok(trial.includes(`"Pellwick trial N ${pass}"`), pass);
});

// The team's form has "Done when", so the reference template keeps it, and one example shows the rule in use.
test('the change request template keeps "Done when", and the holiday story fills it only with settled facts', () => {
  const template = read('examples/pellwick/templates/change-request.md');
  assert.match(template, /^  - \^Done when:\$$/m);
  assert.match(template, /^Done when:\n- \[.+\]$/m);
  const story = read('examples/pellwick/expected/holiday-cutoff.md');
  const done = story.split('Done when:\n')[1]?.split('\n\n')[0] ?? '';
  assert.ok(done.length > 0, 'the holiday story has a "Done when" section');
  assert.doesNotMatch(done, /created before|To confirm/, 'nothing undecided in "Done when"');
  assert.match(story.split('## Acceptance criteria\n')[1].split('\n## ')[0], /created before 1 December.+To confirm: /);
});

// When the repo goes public, a "v" tag builds the skill and attaches it to a GitHub Release.
test('a tag starting with "v" tests, builds and releases the skill zip, with every action pinned', () => {
  const path = '.github/workflows/release.yml';
  assert.ok(existsSync(join(root, path)), path);
  const workflow = read(path);
  assert.match(workflow, /^on:\n  push:\n    tags: \['v\*'\]\n/m);
  assert.match(workflow, /^permissions:\n  contents: write\n/m);
  assert.ok(workflow.includes('scripts/test.sh'), 'tests run before the release');
  assert.ok(workflow.includes('scripts/build-skill.sh'), 'builds the skill');
  assert.match(workflow, /uses: softprops\/action-gh-release@[0-9a-f]{40} # v\d/);
  assert.match(workflow, /files: dist\/loupe-skill\.zip\n/);
  assert.match(workflow, /fail_on_unmatched_files: true\n/);
  for (const file of readdirSync(join(root, '.github/workflows'))) {
    for (const [, action] of read(`.github/workflows/${file}`).matchAll(/uses: (\S+)/g)) assert.match(action, /@[0-9a-f]{40}$/, `${file}: ${action}`);
  }
});

// The setup guide and the README send people to the same place for the skill.
test('the setup guide gets the skill from the latest release, with Actions as the second option', () => {
  const step = read('docs/claude-project.md').split('## 1. Get the skill zip\n')[1].split('\n## ')[0];
  const release = step.indexOf('[latest release](https://github.com/mpwilso/loupe/releases/latest)');
  assert.ok(release >= 0, 'links the latest release');
  assert.ok(release < step.indexOf('**Actions**'), 'the release first');
  assert.match(step, /latest run of \*\*tests\*\* on \*\*master\*\*/);
  assert.doesNotMatch(step, /main branch/);
});

// The trials folder explains itself: what the trials are, who "the advisor" is, and one line per trial.
test('the trials README lists and links every trial record, in order, and defines the advisor', () => {
  const records = readdirSync(join(root, 'docs/trials')).filter((f) => f !== 'README.md').sort();
  assert.deepEqual(records, [1, 2, 3, 4, 5].map((n) => `2026-09-30-trial-${n}.md`), 'every record is named by its trial number');
  const index = read('docs/trials/README.md');
  const lines = index.split('\n').filter((line) => line.startsWith('- '));
  assert.deepEqual(lines.map((line) => line.match(/^- \[Trial (\d)\]\(([^)]+)\)/)?.slice(1).join(' ')), records.map((f, i) => `${i + 1} ${f}`));
  // Each line says who scored the trial and whether it was blind.
  for (const line of lines) {
    assert.match(line, /Scored .*(the advisor|a separate reviewer)/, line);
    assert.match(line, /Scored .*\bblind\b/, line);
  }
  assert.match(index, /"the advisor" is Claude, reviewing in a separate claude\.ai chat, with Matt Wilson checking/);
  for (const record of records) {
    const text = read(`docs/trials/${record}`);
    if (/\bthe advisor\b/i.test(text)) assert.ok(index.includes('the advisor'), record);
  }
});
