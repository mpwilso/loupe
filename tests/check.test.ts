import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { builtInFolder, check, findTeamTemplates, loadTemplates } from '../src/check.ts';
import { format } from '../src/spec.ts';
import { minimum, tooOld } from '../src/node-version.js';
import { emDash, fixture } from './cases.ts';

const root = new URL('..', import.meta.url);
const checked = `Checked with Node ${process.version}.\n`;
const rerun = 'Fix every line above and run the checker again. After five failed runs, show the draft under "Failed the checker after five runs:" and these messages.\n';
const cli = (...args: string[]) => spawnSync(process.execPath, ['src/check.ts', ...args], { cwd: root, encoding: 'utf8' });
const problems = (text: string) => check(text).errors.map(format);
const noTeamTemplate =
  "line 7: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.\n";
const order =
  '"## The story", "## Acceptance criteria", "## Not included", "## Known", "## Unknown", "## Assumed", "## Confidence", "## Estimate", "## Questions before building"';

// Each fixture breaks exactly one rule, so it must produce exactly this one message.
const bad: Record<string, string> = {
  'no-title': 'line 5: The first line must be the title, starting with "# ".',
  'extra-title': 'line 13: Only the first line can be a title. Start section headings with "## ".',
  'stray-text': 'line 7: This text sits above the first section. Only the title goes there.',
  'missing-section': 'The "## Assumed" section is missing.',
  'out-of-order': `line 19: "## Known" is out of order. The sections must be: ${order}.`,
  'unknown-section': `line 25: "## Notes" is not an allowed section. The sections are: ${order}.`,
  'duplicate-section': 'line 25: "## Known" appears more than once.',
  'empty-section': 'line 16: Known is empty.',
  'empty-unknown': 'line 19: Unknown is empty. List the items, or write "None."',
  'none-not-allowed': 'line 17: Known can\'t be "None." It needs at least one item.',
  'none-mixed': 'line 20: Unknown says "None." but also lists items. Use one or the other.',
  'not-a-list': 'line 17: Known must be a list, one item per line, each starting with "- ".',
  'too-many-items': 'line 17: Known has 6 items; the limit is 5.',
  'bad-criterion': 'line 11: Each acceptance criterion must read "Given ..., when ..., then ...".',
  'no-template':
    "line 7: The story section doesn't follow any template. Tried: bug, job story, spike and user story. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.",
  'known-no-source':
    "line 17: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
  'bad-confidence-level': 'line 26: The first line of Confidence must be exactly High, Medium or Low.',
  'missing-why': 'line 27: Confidence needs a "Why:" line saying what the rating is based on.',
  'missing-how': 'line 25: Confidence needs a "How to raise it:" line saying what would make it higher.',
  'extra-line': 'line 29: Confidence has an extra line. It should have exactly 3 lines.',
  'bad-estimate': 'line 31: The first line of Estimate must read "N to M hours", for example "4 to 8 hours".',
  'estimate-reversed': "line 31: The estimate says 8 to 4 hours. The first number can't be bigger than the second.",
  'missing-basis': 'line 30: Estimate needs a "Basis:" line saying what the hours are based on.',
  'banned-phrase': 'line 23: Replace "leverage" with a plainer word.',
  acronym: 'line 17: Spell out "OMS" the first time it appears, like this: "the full name (OMS)".',
  'long-sentence': 'line 23: This sentence has 34 words; the limit is 30. Split it up.',
  'not-ready-bad-title': 'line 5: The first line must be exactly "# Not ready yet".',
  'template-no-patterns':
    'line 1: The template\'s front matter is missing "patterns": a list of patterns; each must match a line of "The story".',
  'template-confidence-value': 'line 31: In a template, write "[High, Medium or Low]" here, not a value.',
  'template-estimate-value': 'line 36: In a template, write "[N to M hours]" here, not a value.',
  'template-bad-pattern': 'line 3: "^Time box: (" is not a valid pattern.',
  'not-ready-no-about':
    'line 7: Right under the title, add one line that starts with "About: " and names the input this responds to.',
  'not-ready-no-missing-line':
    'line 5: Under the title, add one line that starts with "Missing: " and names what is missing, ending with a period.',
  'not-ready-unknown-item':
    'line 8: "the budget" is not one of the five things a story needs: who\'s affected, the problem, the desired outcome, which system or application, known constraints.',
  'not-ready-too-many-questions': 'line 11: Questions has 6 items; the limit is 5.',
  'overflow-not-last':
    'line 35: The line "More open questions than fit here. Consider a spike first." must come last, after five questions.',
  'overflow-too-few':
    'line 37: The line "More open questions than fit here. Consider a spike first." must come last, after five questions.',
  'overflow-unknown-none':
    'line 20: Unknown says "None." but the questions end with the spike line. List each build-blocking question that didn\'t fit under Unknown, one line each.',
  'overflow-high-confidence':
    "line 26: Confidence can't be High while there are more open questions than fit. Lower it, or answer some questions first.",
  'two-questions':
    'line 35: Each item in Questions before building must ask one question, with exactly one question mark. This one has 2.',
  'not-ready-two-questions': 'line 12: Each item in Questions must ask one question, with exactly one question mark. This one has 2.',
  'missing-not-included': 'The "## Not included" section is missing.',
  'too-many-not-included': 'line 14: Not included has 6 items; the limit is 5.',
  'missing-before-release':
    'End the story with one line: "Before release:" and the actions specific to this story, separated by semicolons, or "None."',
  'too-many-before-release': 'line 37: "Before release:" lists 4 items; the limit is 3.',
  'live-no-read': 'line 18: This source names a tracker record but not when it was read. Write it as "(Jira SUBS-142, read 2026-10-02 14:05)".',
  'live-bad-read': 'line 18: The read time in this source must be a real date and time, like "read 2026-10-02 14:05".',
  'live-key-no-source': 'line 38: SUBS-152 is a tracker record, so this line must end with its live source, like "(Jira SUBS-152, read 2026-10-02 14:05)".',
  'live-key-bad-source': 'line 38: SUBS-152 is a tracker record, so this line must end with its live source, like "(Jira SUBS-152, read 2026-10-02 14:05)".',
  'customer-email': 'line 28: This looks like an email address. Remove it. A story must never hold secrets, credentials or customer data.',
  'not-checked': 'line 5: This draft was never checked. Run the checker on it, fix what it reports, then remove the "Not checked:" line.',
  'failed-checker':
    'line 5: This draft failed the checker. Fix what it reports and run the checker again, then remove the "Failed the checker after five runs:" line.',
  'no-summary':
    'line 1: Start with three summary lines. The first must read "Call: Story written", "Call: Not ready yet", "Call: Not checked" or "Call: Failed the checker".',
  'bad-call':
    'line 1: Start with three summary lines. The first must read "Call: Story written", "Call: Not ready yet", "Call: Not checked" or "Call: Failed the checker".',
  'bad-summary-confidence': 'line 2: The second summary line must start with "Confidence: ".',
  'bad-first-question': 'line 3: The third summary line must start with "First question: ".',
  'call-mismatch': 'line 1: The summary says "Call: Not ready yet", but this is a story. Write "Call: Story written".',
  'not-ready-with-confidence':
    'line 2: A "Not ready yet" response has no confidence. Write "Confidence: None, no story".',
  'summary-level-mismatch':
    'line 2: The summary\'s confidence must start with the level under Confidence, then a reason, like "High, because ...".',
  'summary-question-mismatch': 'line 3: "First question:" must repeat the first item under ## Questions before building, word for word.',
  'checked-line-in-file': 'line 38: "Checked with Node" belongs in the chat, after the story, not in the story file.',
  'not-ready-extra-section': 'line 14: "## Known" is not an allowed section. The sections are: "## Questions".',
  // v2: the shape for developers and QA, with Background, Example, Requirements, Notes and Test scenarios.
  'v2/missing-background': 'The "## Background" section is missing.',
  'v2/story-two-lines': 'line 9: In this shape, The story is one sentence: "As a ..., I want ..., so that ...", or for a job story "When ..., I want to ..., so I can ...".',
  'v2/background-no-source': 'line 11: Each line of Background is one plain sentence, not a list item, ending with its source in parentheses, like a Known line. Move anything without a source to Unknown or Assumed.',
  'v2/background-two-sentences': 'line 11: Put each sentence of Background on its own line, ending with its own source.',
  'v2/example-invented': 'line 15: Each line of Example is one sentence from the input, not a list item, ending with its source in parentheses. If the input gives no example, write "None given." Never invent one.',
  'v2/example-none-mixed': 'line 15: Example says "None given." but also gives an example. Use one or the other.',
  'v2/requirement-not-numbered': 'line 18: Each requirement must be numbered, like "1. Subscribers can skip their next box."',
  'v2/no-unhappy': 'line 28: Each test scenario needs at least one UNHAPPY PATH, so the failure case is covered on purpose.',
  'v2/two-happy': 'line 28: Each test scenario needs exactly one HAPPY PATH. This one has 2.',
  'v2/then-without-when': 'line 30: This THEN has no WHEN before it. Each path reads WHEN, then THEN.',
  'v2/when-without-then': 'line 29: This path needs a WHEN line and a THEN line.',
  'v2/path-order': 'line 30: Each path reads WHEN, then any AND lines, then THEN, then any AND lines.',
  'v2/no-path': 'line 29: Start each path with "HAPPY PATH:" or "UNHAPPY PATH:" and a short label.',
  'v2/no-scenario': 'line 28: Start each test scenario with a "TEST SCENARIO:" line saying what is being tested.',
  'v2/not-a-line': 'line 28: Test scenarios holds only TEST SCENARIO:, HAPPY PATH:, UNHAPPY PATH:, WHEN, AND and THEN lines.',
  'v2/repeated-line': 'line 35: This line repeats the one before it. Remove one.',
  'v2/too-many-scenarios': 'line 27: Test scenarios has 11 scenarios; the limit is 10. Split the story, or consider a spike first.',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/${name}.md fails with one plain message`, () => {
    assert.deepEqual(problems(fixture(`bad/${name}.md`)), [message]);
  });
}

test('a story with an em dash fails', () => {
  assert.deepEqual(problems(emDash()), [
    'line 28: Remove the em dash. Use a comma, a period or a new sentence instead.',
  ]);
});

test('the good fixtures pass', () => {
  assert.deepEqual(problems(fixture('good-story.md')), []);
  assert.deepEqual(problems(fixture('good-not-ready.md')), []);
});

// v2 is the default for new stories. Stories saved in v1 still pass: the checker tells the shapes apart by their headings.
test('a v2 story passes, a v1 story still passes, and each is checked against its own shape', () => {
  assert.deepEqual(problems(fixture('good-v2-story.md')), []);
  assert.deepEqual(problems(fixture('good-story.md')), [], 'v1');
  // A bug keeps its own fields, with test scenarios in place of acceptance criteria.
  assert.deepEqual(problems(fixture('good-v2-bug.md')), [], 'the v2 bug shape');
  assert.equal(problems(fixture('good-v2-bug.md').replace('UNHAPPY PATH: Payment fixed', 'HAPPY PATH: Payment fixed')).length, 2, 'two happy paths and no unhappy one');
  // An Example of "None given." is fine; one that states something needs a source.
  assert.deepEqual(problems(fixture('good-v2-story.md').replace(/## Example\n.*\n/, '## Example\nNone given.\n')), []);
  // A v1 heading in a v2 story is out of place, and the message lists the v2 sections.
  const mixed = problems(fixture('good-v2-story.md').replace('## Notes\n', '## Acceptance criteria\n- Given a, when b, then c.\n\n## Notes\n'));
  assert.equal(mixed.length, 1);
  assert.match(mixed[0], /"## Acceptance criteria" is not an allowed section\. The sections are: "## The story", "## Background", "## Example", "## Requirements"/);
});

test('six to ten test scenarios warn, and still pass; more than ten fail', () => {
  const six = check(fixture('warn/many-scenarios.md'));
  assert.deepEqual(six.errors, []);
  assert.deepEqual(six.warnings.map(format), ['line 27: Test scenarios has 6 scenarios; 5 is the usual. Check the story isn\'t doing too much.']);
  const run = cli('tests/fixtures/warn/many-scenarios.md');
  assert.equal(run.status, 0, 'a warning is not a failure');
  assert.match(run.stdout, /^warning: line 27: /m);
  assert.equal(check(fixture('good-v2-story.md')).warnings.length, 0);
});

test('five questions and the overflow line pass when Confidence is not High', () => {
  const text = fixture('bad/overflow-high-confidence.md').replace('\nHigh\n', '\nMedium\n').replace('Confidence: High,', 'Confidence: Medium,');
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
    "line 17: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
  ]);
});

test('the command line exits 0 on a pass and 1 with plain lines on a fail', () => {
  const pass = cli('tests/fixtures/good-story.md');
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout, checked);
  const fail = cli('tests/fixtures/bad/too-many-items.md');
  assert.equal(fail.status, 1);
  assert.equal(fail.stdout, `line 17: Known has 6 items; the limit is 5.\n${rerun}`);
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
  assert.equal(pass.stdout, checked);
});

test('--templates overrides the team folder it would have found', () => {
  const story = 'examples/pellwick/expected/holiday-cutoff.md';
  assert.equal(cli('--templates', 'examples/pellwick/templates', story).status, 0);
  const empty = mkdtempSync(join(tmpdir(), 'loupe-'));
  try {
    const fail = cli('--templates', empty, story);
    assert.equal(fail.status, 1);
    assert.equal(fail.stdout, noTeamTemplate + rerun);
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
    assert.equal(fail.stdout, noTeamTemplate + rerun);
  } finally {
    rmSync(team, { recursive: true });
  }
});

test('with a team folder, the message names the team templates it tried too', () => {
  const team = loadTemplates('examples/pellwick/templates');
  const text = fixture('bad/no-template.md');
  assert.deepEqual(check(text, [...loadTemplates(builtInFolder), ...team]).errors.map(format), [
    "line 7: The story section doesn't follow any template. Tried: bug, job story, spike, user story and change request. For a team template, put it in a templates folder next to the team's context folder, or pass --templates <folder>.",
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

test('a pass ends with the Node version, and too old a Node gets a plain "Not checked:" line', () => {
  const run = spawnSync(process.execPath, ['src/run.js', 'check', 'tests/fixtures/good-story.md'], { cwd: root, encoding: 'utf8' });
  assert.deepEqual([run.status, run.stdout], [0, checked]);
  const fail = spawnSync(process.execPath, ['src/run.js', 'check', 'tests/fixtures/bad/too-many-items.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(fail.status, 1);
  assert.doesNotMatch(fail.stdout, /Checked with Node/);
  assert.deepEqual(['v20.20.2', 'v22.17.9', 'v22.18.0', 'v22.22.2', 'v24.21.0'].map(tooOld), [true, true, false, false, false]);
  assert.equal(minimum, '22.18.0');
});

test('a story that keeps a template placeholder fails', () => {
  const text = fixture('good-story.md').replace('\nHigh\n', '\n[High, Medium or Low]\n');
  assert.deepEqual(problems(text), ['line 26: The first line of Confidence must be exactly High, Medium or Low.']);
});

// Trial 5: a draft that failed the checker was shown as "Not checked", which is only for a checker that can't run.
test('"Not checked" and "Failed the checker" can\'t be swapped', () => {
  const unchecked = fixture('bad/not-checked.md');
  const failed = fixture('bad/failed-checker.md');
  assert.deepEqual(problems(unchecked.replace('Call: Not checked', 'Call: Failed the checker')), [
    'line 1: The summary says "Call: Failed the checker", but this is an unchecked draft. Write "Call: Not checked".',
    'line 5: This draft was never checked. Run the checker on it, fix what it reports, then remove the "Not checked:" line.',
  ]);
  assert.deepEqual(problems(failed.replace('Call: Failed the checker', 'Call: Not checked')), [
    'line 1: The summary says "Call: Not checked", but this is a draft that failed the checker. Write "Call: Failed the checker".',
    'line 5: This draft failed the checker. Fix what it reports and run the checker again, then remove the "Failed the checker after five runs:" line.',
  ]);
  assert.deepEqual(problems(failed.replace('Call: Failed the checker', 'Call: Story written')).slice(0, 1), [
    'line 1: The summary says "Call: Story written", but this is a draft that failed the checker. Write "Call: Failed the checker".',
  ]);
});

test('the checker\'s help says to rerun up to five times, and when each label applies', () => {
  const help = cli().stderr;
  assert.match(help, /^Usage: node src\/check\.ts/);
  assert.match(help, /Fix every line it reports and run it again, up to five runs\./);
  assert.match(help, /"Failed the checker after five runs:"/);
  assert.match(help, /"Not checked:" is only for when the checker can't start or Node is too old\./);
  const fail = cli('tests/fixtures/bad/too-many-items.md');
  assert.equal(fail.status, 1);
  assert.match(fail.stdout, /\nFix every line above and run the checker again\. After five failed runs, show the draft under "Failed the checker after five runs:" and these messages\.\n$/);
});

// Trial 5: the checker sent stories back again and again. One run must report every problem, so one fix pass clears them all.
test('one run reports every problem, not just the first', () => {
  const text = fixture('three-problems.md');
  assert.deepEqual(problems(text), [
    'line 12: Each acceptance criterion must read "Given ..., when ..., then ...".',
    "line 19: This Known item doesn't say where it came from. Add the source in parentheses at the end, or move it to Assumed or Unknown.",
    'line 25: This sentence has 36 words; the limit is 30. Split it up.',
  ]);
  const twice = text.replace('- I see the date on the orders page.\n', '- I see the date on the orders page.\n- I see it on the home page too.\n');
  assert.equal(problems(twice).length, 4, 'the same rule broken twice gives two messages');
});

// M4b: a fact read from a tracker names the record and when it was read, since tracker data changes.
test('a live source names the record and a real read time; other sources are unchanged', () => {
  assert.deepEqual(problems(fixture('good-live-story.md')), []);
  const known = (source: string) => fixture('good-story.md').replace('(Sam, meeting 2026-09-01)', source);
  assert.deepEqual(problems(known('(Jira SUBS-134, read 2026-02-30 14:05)')), ['line 17: The read time in this source must be a real date and time, like "read 2026-10-02 14:05".']);
  assert.deepEqual(problems(known('(Jira SUBS-134, read 2026-10-02 25:00)')), ['line 17: The read time in this source must be a real date and time, like "read 2026-10-02 14:05".']);
  assert.deepEqual(problems(known('(Dana, meeting 2026-09-22; Jira SUBS-101)')), ['line 17: This source names a tracker record but not when it was read. Write it as "(Jira SUBS-142, read 2026-10-02 14:05)".']);
  assert.deepEqual(problems(known('(Maya, Helpline ticket 48213)')), [], 'a ticket number with no tracker key is not a live source');
  // A tracker key is a name, not an acronym to spell out; the same letters alone still are.
  const story = fixture('good-story.md');
  assert.deepEqual(problems(story.replace('Nothing needed.', 'Nothing needed, see SUBS-134. (Jira SUBS-134, read 2026-10-02 14:05)')), []);
  assert.deepEqual(problems(story.replace('Nothing needed.', 'Nothing needed, see SUBS.')), ['line 28: Spell out "SUBS" the first time it appears, like this: "the full name (SUBS)".']);
});

// Trial 8: step A named SUBS-152 and SUBS-137 in its questions with "(open, Jira, read ...)", and the checker only looked at
// Known. A tracker key anywhere in a story needs its own live source on the same line.
test('a tracker key anywhere in a story needs a live source for that key on its line', () => {
  assert.deepEqual(problems(fixture('good-live-question.md')), []);
  const story = fixture('good-story.md');
  const noSource = (key: string) => `${key} is a tracker record, so this line must end with its live source, like "(Jira ${key}, read 2026-10-02 14:05)".`;
  assert.deepEqual(problems(story.replace('Nothing needed.', 'Nothing needed, see SUBS-134.')), [`line 28: ${noSource('SUBS-134')}`]);
  assert.deepEqual(problems(story.replace('Nothing needed.', 'See SUBS-134 and SUBS-101. (Jira SUBS-134, read 2026-10-02 14:05)')), [`line 28: ${noSource('SUBS-101')}`], 'each key needs its own source');
  assert.deepEqual(problems(story.replace('based on the checks above.', 'as SUBS-142 shows.')), [`line 2: ${noSource('SUBS-142')}`], 'the summary too');
  assert.deepEqual(problems(story.replace('Nothing needed.', 'Nothing needed. (Jira SUBS-134)')), ['line 28: This source names a tracker record but not when it was read. Write it as "(Jira SUBS-142, read 2026-10-02 14:05)".'], 'one message for a key in a source with no read time');
});
