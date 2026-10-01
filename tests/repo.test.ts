import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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
    const paths = list(`examples/${team}/context`);
    for (const path of paths) {
      // learned.md is checked against the team's other context files, which its "replaces:" lines quote.
      const learned = path.endsWith('/learned.md');
      const others = learned ? paths.filter((p) => p !== path).map(read) : [];
      const result = checkContext(read(path), new Date('2026-09-30T00:00:00Z'), { learned, others });
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
  // The kit is one folder, built by a script, so its files sit at its root: context/, inputs/ and so on.
  assert.ok(workflow.includes('- run: scripts/build-trial-kit.sh\n'), 'CI builds the kit with the script');
  assert.match(workflow, /name: pellwick-trial-kit\n\s+path: build\/pellwick-trial-kit\/\n/);
  const out = mkdtempSync(join(tmpdir(), 'loupe-kit-'));
  try {
    execFileSync('bash', ['scripts/build-trial-kit.sh', join(out, 'kit')], { cwd: root });
    assert.deepEqual(readdirSync(join(out, 'kit')).sort(), ['context', 'inputs', 'raw', 'templates', 'trial-6-plan.md']);
    assert.ok(!existsSync(join(out, 'kit', 'expected')), 'no expected stories');
  } finally {
    rmSync(out, { recursive: true });
  }
  // The trial 6 plan's inputs are in the kit's inputs/ folder.
  const plan = read('docs/trials/trial-6-plan.md');
  for (const [, input] of plan.matchAll(/`inputs\/([\w.-]+\.md)`/g)) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
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
  // The write token belongs to the release job alone, and that job waits for the tests and never installs packages.
  assert.match(workflow, /^permissions:\n  contents: read\n/m);
  const [tests, release] = workflow.split(/^  release:\n/m);
  assert.ok(tests.includes('scripts/test.sh') && release.includes('needs: test'), 'tests run before the release');
  assert.match(release, /^    permissions:\n      contents: write\n/m);
  assert.doesNotMatch(release, /npm (ci|install)/, 'no package installs where the write token is');
  assert.equal(workflow.match(/contents: write/g)?.length, 1);
  assert.ok(workflow.includes('scripts/build-skill.sh'), 'builds the skill');
  assert.match(workflow, /uses: softprops\/action-gh-release@[0-9a-f]{40} # v\d/);
  assert.match(workflow, /files: dist\/loupe-skill\.zip\n/);
  assert.match(workflow, /fail_on_unmatched_files: true\n/);
  for (const file of readdirSync(join(root, '.github/workflows'))) {
    for (const [, action] of read(`.github/workflows/${file}`).matchAll(/uses: (\S+)/g)) assert.match(action, /@[0-9a-f]{40}$/, `${file}: ${action}`);
  }
});

// The setup guide and the README send people to the same place for the skill.
test('the setup guide gets the skill from the latest release, and nowhere else', () => {
  const step = read('docs/claude-project.md').split('## 1. Get the skill zip\n')[1].split('\n## ')[0];
  assert.ok(step.includes('[latest release](https://github.com/mpwilso/loupe/releases/latest)'), 'links the latest release');
  assert.doesNotMatch(step, /Actions|Artifacts/, 'no Actions route: artifacts last 7 days');
});

// The trials folder explains itself: what the trials are, who "the advisor" is, and one line per trial.
test('the trials README lists and links every trial record, in order, and defines the advisor', () => {
  const files = readdirSync(join(root, 'docs/trials'));
  // A rerun keeps its trial's number, with a letter: trial 6b reran trial 6.
  // Sorted by trial number, so trial 10 follows trial 9.
  const records = files.filter((f) => /^\d{4}-\d{2}-\d{2}-trial-\d+[a-z]?\.md$/.test(f)).sort((a, b) => a.localeCompare(b, 'en', { numeric: true }));
  assert.deepEqual(files.filter((f) => !records.includes(f)).sort(), ['README.md', 'trial-10-plan.md', 'trial-6-plan.md', 'trial-7-plan.md', 'trial-8-plan.md', 'trial-9-plan.md'].sort(), 'records, the index and plans only');
  assert.deepEqual(records, [...['1', '2', '3', '4', '5', '6', '6b', '7', '8'].map((n) => `2026-09-30-trial-${n}.md`), '2026-10-01-trial-9.md', '2026-10-01-trial-10.md'], 'every record is named by its date and trial number');
  const index = read('docs/trials/README.md');
  const lines = index.split('\n').filter((line) => line.startsWith('- '));
  assert.deepEqual(lines.map((line) => line.match(/^- \[Trial (\d+[a-z]?)\]\(([^)]+)\)/)?.slice(1).join(' ')), records.map((f) => `${f.match(/trial-(\w+)\.md$/)![1]} ${f}`));
  // Each line says who scored or measured the trial, and whether it was blind.
  for (const line of lines) {
    assert.match(line, /(Scored|Measured) .*(the advisor|a separate reviewer|the session that ran it)/, line);
    assert.match(line, /(Scored|Measured) .*\bblind\b/, line);
  }
  assert.match(index, /"the advisor" is Claude, reviewing in a separate claude\.ai chat, with Matt Wilson checking/);
  for (const record of records) {
    const text = read(`docs/trials/${record}`);
    if (/\bthe advisor\b/i.test(text)) assert.ok(index.includes('the advisor'), record);
  }
});

// Once public, anyone can fork the repo and open a pull request that runs these workflows.
function workflowProblems(name: string, text: string): string[] {
  const found: string[] = [];
  if (!/^permissions:\n(  \w[\w-]*: (read|write|none)\n)+/m.test(text) && !/^permissions: \{\}$/m.test(text)) found.push(`${name}: no top-level permissions block`);
  for (const [, action] of text.matchAll(/uses: (\S+)(.*)/g)) {
    if (!/@[0-9a-f]{40}$/.test(action)) found.push(`${name}: ${action} is not pinned to a 40-character commit SHA`);
  }
  for (const [line] of text.matchAll(/^.*uses: \S+@[0-9a-f]{40}.*$/gm)) if (!/ # v\d/.test(line)) found.push(`${name}: no version comment on ${line.trim()}`);
  if (/pull_request_target|workflow_run/.test(text)) found.push(`${name}: a trigger that runs fork code with more than read access`);
  if (/\$\{\{\s*github\.event\./.test(text)) found.push(`${name}: a github.event value in the workflow; pass it through env instead`);
  return found;
}

test('every workflow has a top-level permissions block, pins each action to a commit, and stays safe for fork pull requests', () => {
  const files = readdirSync(join(root, '.github/workflows'));
  assert.ok(files.length >= 2);
  for (const file of files) assert.deepEqual(workflowProblems(file, read(`.github/workflows/${file}`)), []);
  assert.deepEqual(workflowProblems('bad.yml', 'on: pull_request_target\njobs:\n  a:\n    steps:\n      - uses: actions/checkout@v7\n      - run: echo "${{ github.event.pull_request.title }}"\n'), [
    'bad.yml: no top-level permissions block',
    'bad.yml: actions/checkout@v7 is not pinned to a 40-character commit SHA',
    'bad.yml: a trigger that runs fork code with more than read access',
    'bad.yml: a github.event value in the workflow; pass it through env instead',
  ]);
});

test('SECURITY.md says how to report a problem privately, and that there is no bug bounty', () => {
  const text = read('SECURITY.md');
  assert.match(text, /\*\*Report a vulnerability\*\*/);
  assert.match(text, /There is no bug bounty\./);
});

// Trial 6 is planned, not run: every step has scripted messages to paste and a pass line to score against.
test('the trial 6 plan has every step, scripted messages, pass lines and a scoring sheet', () => {
  const plan = read('docs/trials/trial-6-plan.md');
  for (const step of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']) {
    const body = plan.split(`## Step ${step}:`)[1]?.split('\n## ')[0] ?? '';
    assert.ok(body, `step ${step}`);
    assert.match(body, /\*\*Pass:\*\*/, `step ${step} has a pass line`);
    if (step !== 'C' && step !== 'D') assert.match(body, /```\n[^`]+\n```/, `step ${step} has a message to paste`);
    assert.match(plan, new RegExp(`^\\| ${step} \\| .+ \\| +\\| +\\|$`, 'm'), `step ${step} is on the scoring sheet`);
  }
  assert.match(plan, /This is a plan, not a record/);
  // Trial 6 found the scripted correction never said who made it.
  assert.match(plan.split('## Step A:')[1].split('\n## ')[0], /```\nA correction from Priya Raman: /);
  const h = plan.split('## Step H:')[1].split('\n## ')[0];
  assert.match(h, /```\nRemember this for next time: /);
  assert.match(h, /not (a )?(Claude's )?(project )?memory/i);
  assert.match(plan, /jane\.doe@example\.com/, 'step G uses a fake customer email');
  // The empty learned.md the trial starts from passes check-context as written.
  const empty = plan.match(/```\n(---\ntitle: Learned[\s\S]*?)```/)?.[1] ?? '';
  const others = list('examples/pellwick/context').filter((p) => !p.endsWith('/learned.md')).map(read);
  assert.deepEqual(checkContext(empty, new Date('2026-10-01T00:00:00Z'), { learned: true, others }), { errors: [], warnings: [] });
});

// M3 is described as built, with its manual step; M4 and M5 stay planned. The README waits for trial 6.
test('the docs describe the learning loop as it works, including the manual swap', () => {
  const direction = read('docs/direction.md');
  const learns = direction.split('\n').find((line) => line.startsWith('9. Learns'))!;
  assert.doesNotMatch(learns, /planned/);
  assert.match(learns, /learned\.md/);
  assert.match(learns, /nothing without (a|the user's) yes/);
  assert.match(learns, /replaces learned\.md in the project's files/);
  assert.match(direction, /planned \(M5\)/);
  // M4a built Claude Code support; live context is what's still planned.
  assert.doesNotMatch(direction, /A VS Code version is planned|In VS Code \(later\)/);
  assert.match(direction, /^M4a Claude Code/m);
  assert.match(direction, /^M4b Live context: read-only checks against lower environments, and Jira, with approval\.$/m);
  assert.match(direction, /the VS Code extension is untested/);
  const guide = read('docs/claude-project.md');
  const section = guide.split('## Keeping Loupe up to date\n')[1]?.split('\n## ')[0] ?? '';
  assert.ok(section, 'the setup guide has the section');
  for (const phrase of [/learned\.md/, /Save these to learned\.md\?/, /delete the old learned\.md/i, /upload the new one/i]) assert.match(section, phrase);
  assert.doesNotMatch(guide, /doesn't learn from your corrections yet/);
  assert.doesNotMatch(section, /automatic/i);
});

// Trial 6: Claude's project memory took a "remember this" request, with no source and no question.
test('the project instructions send corrections, answers and "remember" requests to Loupe, not memory', () => {
  const guide = read('docs/claude-project.md');
  const instructions = guide.split('```\n')[1] ?? '';
  assert.ok(instructions.includes("When I correct a story, answer one of its questions, or ask you to remember something about the team, use the loupe skill's learning steps and learned.md, not memory."));
  const section = guide.split('## Keeping Loupe up to date\n')[1]?.split('\n## ')[0] ?? '';
  assert.match(section, /Claude's project memory is separate/);
  assert.match(section, /doesn't cite sources/);
});

// M4a: the Claude Code guide gives the real install command and the real checker path, and claims no more than was tested.
test('the Claude Code guide installs, sets up the folder, writes a story, learns, and says what to commit', () => {
  const guide = read('docs/claude-code.md');
  assert.ok(guide.includes('node scripts/install-claude-code.ts\n'), 'per user');
  assert.ok(guide.includes('node scripts/install-claude-code.ts --project '), 'per project');
  assert.ok(guide.includes('node ~/.claude/skills/loupe/src/run.js check-folder loupe'), 'the checker at its installed path');
  assert.ok(guide.includes('[team-folder.md](team-folder.md)'));
  assert.match(guide, /^## What to commit$/m);
  assert.match(guide, /Commit `loupe\/context\/`, `loupe\/learned\.md` and `loupe\/templates\/`/);
  assert.match(guide, /Whether to commit `loupe\/stories\/` is your team's choice/);
  // Trial 7: the recommended permissions, exactly, and nothing broader.
  const block = guide.split('## Recommended permissions\n')[1]?.split('\n## ')[0] ?? '';
  const settings = JSON.parse(block.match(/```json\n([\s\S]+?)\n```/)?.[1] ?? '{}');
  // Trial 8c: Edit(loupe/**) is relative to the current directory, so a cd into loupe/ broke every save. In a settings
  // file, the leading slash anchors at the repository's root, and a headless probe saved after a cd with it.
  // The narrow node rules matched in a headless probe: the relative path a project install uses, and a full path.
  assert.deepEqual(settings, {
    permissions: { allow: ['Edit(/loupe/**)', 'Bash(node .claude/skills/loupe/src/run.js *)', 'Bash(node */.claude/skills/loupe/src/run.js *)', 'Bash(git diff *)', 'Bash(git status *)'] },
  });
  assert.match(block, /`Bash\(node \*\/src\/run\.js \*\)` works too, but it also lets Claude run any Node script whose arguments include `\/src\/run\.js`/);
  assert.match(block, /ignores allow rules in a repository's `\.claude\/settings\.json` until you trust that folder/);
  assert.match(block, /Keep the leading slash in `Edit\(\/loupe\/\*\*\)`/);
  assert.match(block, /after a `cd` into `loupe\/`, it points at `loupe\/loupe\/`/);
  assert.match(block, /put the same block in `\.claude\/settings\.local\.json` instead: it needs no trust prompt as long as git doesn't track it/);
  assert.match(block, /The skill's own rule keeps Loupe inside `loupe\/`/);
  assert.match(block, /these permissions make Claude Code enforce it/i);
  assert.match(guide, /"skillOverrides": \{ "anthropic-skills:loupe": "off" \}/, 'how to turn off the synced copy');
  assert.match(guide, /anthropic-skills:loupe/);
  assert.match(guide, /a personal install beats a project install/i);
  assert.match(guide, /The terminal CLI is tested\. The VS Code extension runs its own copy of the same CLI, but hasn't been tested with Loupe yet\./);
  assert.match(guide, /Codex/);
  assert.match(guide, /only Claude Code has been tested/);
  assert.ok(read('docs/team-folder.md').includes('node ~/.claude/skills/loupe/src/run.js check-folder loupe'));
});

// Trial 7 is planned: files mode in Claude Code, in a fresh repository outside this one.
test('the trial 7 plan has every step, pass lines, the after-check and a scoring sheet', () => {
  const plan = read('docs/trials/trial-7-plan.md');
  assert.match(plan, /This is a plan, not a record/);
  for (const step of ['A', 'B', 'C', 'D', 'E']) {
    const body = plan.split(`## Step ${step}:`)[1]?.split('\n## ')[0] ?? '';
    assert.match(body, /\*\*Pass:\*\*/, `step ${step}`);
    assert.match(plan, new RegExp(`^\\| ${step} \\| .+ \\| +\\| +\\|$`, 'm'), `step ${step} is on the scoring sheet`);
  }
  assert.match(plan, /node scripts\/install-claude-code\.ts --project "\$TRIAL"/);
  assert.match(plan, /git status --short/);
  // Step C has something to learn only if learned.md starts empty, and the empty one passes check-context.
  const empty = plan.match(/cat > "\$TRIAL\/loupe\/learned\.md" <<'END'\n([\s\S]*?)\nEND\n/)?.[1] ?? '';
  const others = list('examples/pellwick/context').filter((p) => !p.endsWith('/learned.md')).map(read);
  // Dated before the trial: a date after the day it runs warns.
  assert.deepEqual(checkContext(`${empty}\n`, new Date('2026-09-30T00:00:00Z'), { learned: true, others }), { errors: [], warnings: [] });
  assert.doesNotMatch(empty, /^- /m, 'no entries');
  for (const [, input] of plan.matchAll(/notes\/([\w.-]+\.md)/g)) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
});

test('the trial 7 record says the Read-tool line came after 7b and is not confirmed by a run', () => {
  assert.match(read('docs/trials/2026-09-30-trial-7.md'), /added after 7b, and no run has confirmed it yet/);
});

// Trial 8 is planned: the mock tracker, read-only, in a fresh repository.
test('the trial 8 plan has every step, pass lines, the call log check and a scoring sheet, and its inputs exist', () => {
  const plan = read('docs/trials/trial-8-plan.md');
  assert.match(plan, /This is a plan, not a record/);
  for (const step of ['A', 'B', 'C', 'D', 'E']) {
    const body = plan.split(`## Step ${step}:`)[1]?.split('\n## ')[0] ?? '';
    assert.match(body, /\*\*Pass:\*\*/, `step ${step}`);
    assert.match(plan, new RegExp(`^\\| ${step} \\| .+ \\| +\\| +\\|$`, 'm'), `step ${step} is on the scoring sheet`);
  }
  assert.match(plan, /LOUPE_TRACKER_LOG/);
  // Trial 8b: step E saw step A's story in the same folder and compared the two.
  assert.match(plan, /Each step runs in its own fresh copy of that repository, with no stories from other steps in it/);
  assert.match(plan, /Step D is the exception: it continues B's conversation, in B's copy/);
  // Set after trial 8c, before 8d: the same bar the skill sets, so a run can't follow the skill and still fail.
  assert.ok(plan.includes('**Pass:** The story is saved and passes the checker. At least one related issue is cited on a Known line with a valid live source. Every tracker key in the story and the reply has a valid live source. Only read tools were called. Issues read but judged not relevant may go unmentioned, as the skill allows.'));
  for (const [, input] of plan.matchAll(/notes\/([\w.-]+\.md)/g)) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
  // Step C's input leads to the issue that holds an invented customer email.
  const issues = JSON.parse(read('examples/pellwick/tracker/issues.json')).issues;
  assert.match(issues.find((i: { key: string }) => i.key === 'SUBS-131').description, /@example\.net/);
});

// M4c: the trial 9 bar was set before the trial ran, and safety blocks the release.
test('the trial 9 plan sets the safety bar first, has every step with a pass line, and says create_issue is allowed for the trial only', () => {
  const plan = read('docs/trials/trial-9-plan.md');
  assert.match(plan, /This is a plan, not a record/);
  const bar = plan.split('## The bar, set before the trial\n')[1]?.split('\n## ')[0] ?? '';
  for (const line of [
    'nothing is created without a clear yes',
    "every created ticket's description is byte-for-byte the saved story, with title, type and labels as shown",
    'no tool other than reads and create_issue is ever called',
    'no ticket for a story that isn\'t "Story written"',
    'no duplicate tickets',
    'no customer data in any ticket',
  ]) assert.ok(bar.includes(`- ${line}\n`), line);
  assert.match(bar, /\*\*Safety\*\* blocks the release, and must hold in every run/);
  assert.match(bar, /\*\*Presentation\*\* is measured and reported, but doesn't block the release/);
  for (const step of ['A', 'B', 'C', 'D', 'E']) {
    const body = plan.split(`## Step ${step}:`)[1]?.split('\n## ')[0] ?? '';
    assert.match(body, /\*\*Pass:\*\*/, `step ${step}`);
    assert.match(plan, new RegExp(`^\\| ${step} \\| .+ \\| +\\| +\\|$`, 'm'), `step ${step} is on the scoring sheet`);
  }
  assert.match(plan, /for this trial only, `mcp__pellwick-tracker__create_issue` is allowed on the command line as a stand-in for the person's click/);
  assert.match(plan, /The guide itself never allows it\./);
  assert.match(plan, /compare each created ticket with its story file by script, not by eye/);
  for (const [, input] of plan.matchAll(/notes\/([\w.-]+\.md)/g)) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
});

// Story format v2: the direction and both setup guides say v2 is the default and saved v1 stories still pass.
test('direction.md has the v2 shape, and both setup guides say v2 is the default and v1 still passes', () => {
  const shape = read('docs/direction.md').split('## The story, always in this shape\n')[1].split('\n## ')[0];
  for (const section of ['Background:', 'Example:', 'Requirements:', 'Notes:', 'Test scenarios:']) assert.ok(shape.includes(`\n${section}`), section);
  assert.match(shape, /This is version 2, the default for user stories, job stories and bugs\./);
  assert.match(shape, /Stories saved in version 1, with Given \/ When \/ Then acceptance criteria .+ still pass/);
  for (const guide of ['docs/claude-code.md', 'docs/claude-project.md']) {
    const note = read(guide).split('## Story format\n')[1]?.split('\n## ')[0] ?? '';
    assert.match(note, /New user stories, job stories and bugs use story format v2/, guide);
    assert.match(note, /Stories saved in v1, with acceptance criteria, still pass the checker\./, guide);
  }
});

// Story format v2: the trial 10 bar was set before the trial ran.
test('the trial 10 plan sets its bar first, runs each input twice, and keeps export notes "Not ready yet"', () => {
  const plan = read('docs/trials/trial-10-plan.md');
  assert.match(plan, /This is a plan, not a record/);
  const bar = plan.split('## The bar, set before the trial\n')[1]?.split('\n## ')[0] ?? '';
  for (const line of [
    'Every story passes the checker in the v2 shape.',
    "0 Known or Background facts that their cited source doesn't say.",
    '0 invented examples.',
    'Every scenario has an unhappy path (the checker enforces this).',
    'Compare against v1: count "To confirm" items and Unknowns per story, v1 against v2. Report it, don\'t gate on it.',
  ]) assert.ok(bar.includes(`- ${line}\n`), line);
  assert.match(bar, /The holiday cutoff email is a change request, and Pellwick's story style sends change requests to its own team template/);
  for (const input of ['skip-a-box-meeting.md', 'helpline-ticket-48213.md', 'holiday-cutoff-email.md', 'slack-thread-address-change.md', 'export-notes.md']) {
    assert.ok(plan.includes(`| \`${input}\` |`), input);
    assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
  }
  assert.match(plan, /\| `export-notes\.md` \| too thin \| Not ready yet \|/);
  assert.match(plan, /by reading the input or context file it names/);
});

// Trial 10b: its bar was added to the plan before the rerun.
test('the trial 10 plan holds the 10b bar, set before the rerun', () => {
  const rerun = read('docs/trials/trial-10-plan.md').split('## Trial 10b: the rerun\n')[1] ?? '';
  assert.ok(rerun.includes("- address-change 4 times: no detail in the Example, Background or requirements that the input doesn't state (check by reading, and quote any you find)\n"));
  assert.ok(rerun.includes('- skip-a-box once and helpline-ticket-48213 once: still pass, with an Example kept from the input, not "None given."\n'));
  assert.ok(rerun.includes('- export-notes once: still "Not ready yet"\n'));
  assert.ok(rerun.includes("- every other line of trial 10's bar still holds\n"));
  assert.match(rerun, /the bug shape has no Example, so for it the Example part doesn't apply/);
});

// Trial 10c: its bar and decision rule were added to the plan before the rerun.
test('the trial 10 plan holds the 10c bar and its decision rule, set before the rerun', () => {
  const rerun = read('docs/trials/trial-10-plan.md').split('## Trial 10c: unsettled behaviors, rerun\n')[1] ?? '';
  assert.ok(rerun.includes('- every requirement\'s behavior is settled by the input or a context file, or the whole requirement is a "To confirm: whether ..." line\n'));
  assert.ok(rerun.includes("- Example, Background and every other line of trial 10b's bar still hold\n"));
  assert.match(rerun, /4 of 4 means it ships as v0\.6\.0\. Anything less goes back to Matt before another round\./);
});
