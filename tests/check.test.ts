import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { builtInFolder, check, findTeamTemplates, loadTemplates } from '../src/check.ts';
import { format } from '../src/spec.ts';
import { emDash, fixture } from './cases.ts';

const root = new URL('..', import.meta.url);
const cli = (...args: string[]) => spawnSync(process.execPath, ['src/check.ts', ...args], { cwd: root, encoding: 'utf8' });
const problems = (text: string) => check(text).errors.map(format);
const noTeamTemplate =
  "line 3: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.\n";
const order =
  '"## The story", "## Acceptance criteria", "## Known", "## Unknown", "## Assumed", "## Confidence", "## Estimate", "## Questions before building"';

// Each fixture breaks exactly one rule, so it must produce exactly this one message.
const bad: Record<string, string> = {
  'no-title': 'line 1: The first line must be the title, starting with "# ".',
  'extra-title': 'line 9: Only the first line can be a title. Start section headings with "## ".',
  'stray-text': 'line 3: This text sits above the first section. Only the title goes there.',
  'missing-section': 'The "## Assumed" section is missing.',
  'out-of-order': `line 12: "## Known" is out of order. The sections must be: ${order}.`,
  'unknown-section': `line 18: "## Notes" is not an allowed section. The sections are: ${order}.`,
  'duplicate-section': 'line 18: "## Known" appears more than once.',
  'empty-section': 'line 9: Known is empty.',
  'empty-unknown': 'line 12: Unknown is empty. List the items, or write "None."',
  'none-not-allowed': 'line 10: Known can\'t be "None." It needs at least one item.',
  'none-mixed': 'line 13: Unknown says "None." but also lists items. Use one or the other.',
  'not-a-list': 'line 10: Known must be a list, one item per line, each starting with "- ".',
  'too-many-items': 'line 10: Known has 6 items; the limit is 5.',
  'bad-criterion': 'line 7: Each acceptance criterion must read "Given ..., when ..., then ...".',
  'no-template':
    "line 3: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.",
  'known-no-source':
    "line 10: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
  'bad-confidence-level': 'line 19: The first line of Confidence must be exactly High, Medium or Low.',
  'missing-why': 'line 20: Confidence needs a "Why:" line saying what the rating is based on.',
  'missing-how': 'line 18: Confidence needs a "How to raise it:" line saying what would make it higher.',
  'extra-line': 'line 22: Confidence has an extra line. It should have exactly 3 lines.',
  'bad-estimate': 'line 24: The first line of Estimate must read "N to M hours", for example "4 to 8 hours".',
  'estimate-reversed': "line 24: The estimate says 8 to 4 hours. The first number can't be bigger than the second.",
  'missing-basis': 'line 23: Estimate needs a "Basis:" line saying what the hours are based on.',
  'banned-phrase': 'line 16: Replace "leverage" with a plainer word.',
  acronym: 'line 10: Spell out "OMS" the first time it appears, like this: "the full name (OMS)".',
  'long-sentence': 'line 16: This sentence has 34 words; the limit is 30. Split it up.',
  'not-ready-bad-title': 'line 1: The first line must be exactly "# Not ready yet".',
  'template-no-patterns':
    'line 1: The template\'s front matter is missing "patterns": a list of patterns; each must match a line of "The story".',
  'template-bad-pattern': 'line 3: "^Time box: (" is not a valid pattern.',
  'not-ready-no-about':
    'line 3: Right under the title, add one line that starts with "About: " and names the input this responds to.',
  'not-ready-no-missing-line':
    'line 1: Under the title, add one line that starts with "Missing: " and names what is missing, ending with a period.',
  'not-ready-unknown-item':
    'line 4: "the budget" is not one of the five things a story needs: who\'s affected, the problem, the desired outcome, which system or application, known constraints.',
  'not-ready-too-many-questions': 'line 7: Questions has 6 items; the limit is 5.',
  'overflow-not-last':
    'line 28: The line "More open questions than fit here. Consider a spike first." must come last, after five questions.',
  'overflow-too-few':
    'line 30: The line "More open questions than fit here. Consider a spike first." must come last, after five questions.',
  'overflow-high-confidence':
    "line 19: Confidence can't be High while there are more open questions than fit. Lower it, or answer some questions first.",
  'two-questions':
    'line 28: Each item in Questions before building must ask one question, with exactly one question mark. This one has 2.',
  'not-ready-two-questions': 'line 8: Each item in Questions must ask one question, with exactly one question mark. This one has 2.',
  'not-checked': 'line 1: This draft was never checked. Run the checker on it, fix what it reports, then remove the "Not checked:" line.',
  'not-ready-extra-section': 'line 10: "## Known" is not an allowed section. The sections are: "## Questions".',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/${name}.md fails with one plain message`, () => {
    assert.deepEqual(problems(fixture(`bad/${name}.md`)), [message]);
  });
}

test('a story with an em dash fails', () => {
  assert.deepEqual(problems(emDash()), [
    'line 21: Remove the em dash. Use a comma, a period or a new sentence instead.',
  ]);
});

test('the good fixtures pass', () => {
  assert.deepEqual(problems(fixture('good-story.md')), []);
  assert.deepEqual(problems(fixture('good-not-ready.md')), []);
});

test('five questions and the overflow line pass when Confidence is not High', () => {
  const text = fixture('bad/overflow-high-confidence.md').replace('\nHigh\n', '\nMedium\n');
  assert.deepEqual(problems(text), []);
});

test('an acronym spelled out on first use passes, and later uses need nothing', () => {
  const text = fixture('good-story.md').replace(
    '- The delivery date is stored with each order. (Sam, meeting 2026-09-01)',
    '- The order management system (OMS) stores the date. (Sam)\n- The OMS also stores the time. (Sam)',
  );
  assert.deepEqual(problems(text), []);
});

test('a Known item needs its source at the end, not in the middle', () => {
  const text = fixture('good-story.md').replace(
    '- The delivery date is stored with each order. (Sam, meeting 2026-09-01)',
    '- Sam (engineering lead) says the date is stored with each order.',
  );
  assert.deepEqual(problems(text), [
    "line 10: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
  ]);
});

test('the command line exits 0 on a pass and 1 with plain lines on a fail', () => {
  const pass = cli('tests/fixtures/good-story.md');
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout, '');
  const fail = cli('tests/fixtures/bad/too-many-items.md');
  assert.equal(fail.status, 1);
  assert.equal(fail.stdout, 'line 10: Known has 6 items; the limit is 5.\n');
});

test('the built-in templates come from the files in templates/', () => {
  assert.deepEqual(
    loadTemplates(builtInFolder).map((t) => t.name),
    ['bug', 'job story', 'spike', 'user story'],
  );
});

test('a story finds its team templates next to the context folder, with no flag', () => {
  const story = 'examples/pellwick/expected/holiday-cutoff.md';
  assert.equal(findTeamTemplates(story), join('examples', 'pellwick', 'templates'));
  const pass = cli(story);
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout, '');
});

test('--templates overrides the team folder it would have found', () => {
  const story = 'examples/pellwick/expected/holiday-cutoff.md';
  assert.equal(cli('--templates', 'examples/pellwick/templates', story).status, 0);
  const empty = mkdtempSync(join(tmpdir(), 'loupe-'));
  try {
    const fail = cli('--templates', empty, story);
    assert.equal(fail.status, 1);
    assert.equal(fail.stdout, noTeamTemplate);
  } finally {
    rmSync(empty, { recursive: true });
  }
});

test('a team story whose templates folder is missing fails with a plain message', () => {
  const team = mkdtempSync(join(tmpdir(), 'loupe-'));
  mkdirSync(join(team, 'context'));
  mkdirSync(join(team, 'expected'));
  const story = join(team, 'expected', 'holiday-cutoff.md');
  copyFileSync(new URL('../examples/pellwick/expected/holiday-cutoff.md', import.meta.url), story);
  try {
    assert.equal(findTeamTemplates(story), undefined);
    const fail = cli(story);
    assert.equal(fail.status, 1);
    assert.equal(fail.stdout, noTeamTemplate);
  } finally {
    rmSync(team, { recursive: true });
  }
});

test('with a team folder, the message names the team templates it tried too', () => {
  const team = loadTemplates('examples/pellwick/templates');
  const text = fixture('bad/no-template.md');
  assert.deepEqual(check(text, [...loadTemplates(builtInFolder), ...team]).errors.map(format), [
    "line 3: The story section doesn't follow any template. Tried: bug, job story, spike, user story and change request. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.",
  ]);
});

test('a template file is checked against its own patterns, with line numbers from the top of the file', () => {
  const template = readFileSync(new URL('../templates/spike.md', import.meta.url), 'utf8');
  assert.deepEqual(problems(template), []);
  assert.deepEqual(problems(template.replace('Time box:', 'Timebox:')), [
    "line 10: The story section doesn't follow any template. Tried: spike. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.",
  ]);
});

test('a missing templates folder is a plain error, not a crash', () => {
  const run = cli('--templates', 'no/such/folder', 'tests/fixtures/good-story.md');
  assert.equal(run.status, 2);
  assert.equal(run.stderr, 'Can\'t read the templates folder "no/such/folder".\n');
});
