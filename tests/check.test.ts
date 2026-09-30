import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { builtInFolder, check, loadTemplates } from '../src/check.ts';
import { format } from '../src/spec.ts';

const root = new URL('..', import.meta.url);
const cli = (...args: string[]) => spawnSync(process.execPath, ['src/check.ts', ...args], { cwd: root, encoding: 'utf8' });
const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');
const problems = (text: string) => check(text).errors.map(format);
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
    "line 3: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, pass its folder with --templates <folder>.",
  'known-no-source':
    "line 10: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
  'bad-confidence-level': 'line 19: The first line of Confidence must be exactly High, Medium or Low.',
  'missing-why': 'line 20: Confidence needs a "Why:" line saying what the rating is based on.',
  'extra-line': 'line 22: Confidence has an extra line. It should have exactly 3 lines.',
  'bad-estimate': 'line 24: The first line of Estimate must read "N to M hours", for example "4 to 8 hours".',
  'estimate-reversed': "line 24: The estimate says 8 to 4 hours. The first number can't be bigger than the second.",
  'missing-basis': 'line 23: Estimate needs a "Basis:" line saying what the hours are based on.',
  'banned-phrase': 'line 16: Replace "leverage" with a plainer word.',
  acronym: 'line 10: Spell out "OMS" the first time it appears, like this: "the full name (OMS)".',
  'long-sentence': 'line 16: This sentence has 34 words; the limit is 30. Split it up.',
  'not-ready-no-about':
    'line 3: Right under the title, add one line that starts with "About: " and names the input this responds to.',
  'not-ready-no-missing-line':
    'line 1: Under the title, add one line that starts with "Missing: " and names what is missing, ending with a period.',
  'not-ready-unknown-item':
    'line 4: "the budget" is not one of the five things a story needs: who\'s affected, the problem, the desired outcome, which system or application, known constraints.',
  'not-ready-too-many-questions': 'line 7: Questions has 6 items; the limit is 5.',
  'not-ready-extra-section': 'line 10: "## Known" is not an allowed section. The sections are: "## Questions".',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/${name}.md fails with one plain message`, () => {
    assert.deepEqual(problems(fixture(`bad/${name}.md`)), [message]);
  });
}

// An em dash can't live in a tracked file, so this fixture is built here.
test('a story with an em dash fails', () => {
  const text = fixture('good-story.md').replace('Nothing needed.', 'Nothing\u2014needed.');
  assert.deepEqual(problems(text), [
    'line 21: Remove the em dash. Use a comma, a period or a new sentence instead.',
  ]);
});

test('the good fixtures pass', () => {
  assert.deepEqual(problems(fixture('good-story.md')), []);
  assert.deepEqual(problems(fixture('good-not-ready.md')), []);
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

test('a story in a team template passes with --templates and fails without it', () => {
  const story = 'examples/pellwick/expected/holiday-cutoff.md';
  const pass = cli('--templates', 'examples/pellwick/templates', story);
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout, '');
  const fail = cli(story);
  assert.equal(fail.status, 1);
  assert.equal(
    fail.stdout,
    "line 3: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, pass its folder with --templates <folder>.\n",
  );
});

test('with a team folder, the message names the team templates it tried too', () => {
  const team = loadTemplates('examples/pellwick/templates');
  const text = fixture('bad/no-template.md');
  assert.deepEqual(check(text, [...loadTemplates(builtInFolder), ...team]).errors.map(format), [
    "line 3: The story section doesn't follow any template. Tried: bug, job story, spike, user story and change request. For a team template, pass its folder with --templates <folder>.",
  ]);
});

test('a template file is checked against its own patterns, with line numbers from the top of the file', () => {
  const template = readFileSync(new URL('../templates/spike.md', import.meta.url), 'utf8');
  assert.deepEqual(problems(template), []);
  assert.deepEqual(problems(template.replace('Time box:', 'Timebox:')), [
    "line 10: The story section doesn't follow any template. Tried: spike. For a team template, pass its folder with --templates <folder>.",
  ]);
});

test('a template with no patterns, or a broken pattern, fails with a plain message', () => {
  const template = readFileSync(new URL('../templates/spike.md', import.meta.url), 'utf8');
  assert.deepEqual(problems(template.replace(/patterns:\n(  - .*\n)+/, '')), [
    'line 1: The template\'s front matter is missing "patterns": a list of patterns; each must match a line of "The story".',
  ]);
  assert.deepEqual(problems(template.replace('^Time box: \\S', '^Time box: (')), [
    'line 3: "^Time box: (" is not a valid pattern.',
  ]);
});

test('a missing templates folder is a plain error, not a crash', () => {
  const run = cli('--templates', 'no/such/folder', 'tests/fixtures/good-story.md');
  assert.equal(run.status, 2);
  assert.equal(run.stderr, 'Can\'t read the templates folder "no/such/folder".\n');
});
