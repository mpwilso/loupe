import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from '../src/check.ts';
import { historyEntries } from '../src/check-context.ts';
import { format } from '../src/spec.ts';
import { calibrated, calibrationCases, fixture, history, lookStory } from './cases.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-history-'));
after(() => rmSync(temp, { recursive: true }));

// history.md: each entry is a finished story, what it was estimated at, what it took, and where the hours came from.
const bad: Record<string, string> = {
  'no-header': 'line 7: Start history.md with a short line saying each entry is a finished story, what was estimated and what it took.',
  'unknown-field': 'line 12: "developer:" is not a history field. The fields are estimated, actual and source.',
  'stray-line': 'line 12: Each line after the header is a finished story\'s title starting "- ", or one of its fields, indented, like "  actual: 11 hours".',
  'no-estimated': 'line 9: This entry needs "estimated:" with the range the story gave, like "estimated: 4 to 8 hours".',
  'estimated-reversed': "line 10: The estimate says 8 to 4 hours. The first number can't be bigger than the second.",
  'no-actual': 'line 9: This entry needs "actual:" with the hours the story took, like "actual: 11 hours".',
  'no-source': 'line 9: This entry needs a source: who gave the hours, from where, and the date, like "source: Priya Raman, timesheets, 2026-09-29".',
  'bad-source-date': 'line 12: The date in this source must be a real date like 2026-09-29.',
  'duplicate-title': 'line 13: Two entries are titled "Show the next delivery date on the orders page". Keep one, so a Calibration line names one story.',
  'repeated-field': 'line 12: "actual:" appears twice in this entry. Keep one.',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/history/${name}.md fails with one plain message`, () => {
    assert.deepEqual(history(fixture(`bad/history/${name}.md`)).map(format), [message]);
  });
}

test('a history file with a header and a full entry for each story passes, and its entries can be read', () => {
  assert.deepEqual(history(fixture('good-history.md')), []);
  assert.deepEqual(historyEntries(fixture('good-history.md')), [
    { title: 'Show the next delivery date on the orders page', low: 4, high: 8, actual: 11 },
    { title: 'Send a reminder email two days before the cutoff', low: 6, high: 10, actual: 7 },
  ]);
  assert.deepEqual(historyEntries(fixture('bad/history/no-actual.md')), [{ title: 'Send a reminder email two days before the cutoff', low: 6, high: 10, actual: 7 }], 'an entry missing a number is left out');
});

// The Calibration line: the past stories the estimate drew on, each with its hours against its estimate.
const calibration = 'Calibration: "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated.';

test('a story with a Calibration line passes against the history it names, and each mismatch is one plain message', () => {
  assert.deepEqual(calibrated(lookStory()), []);
  const messages = calibrationCases.map(([, text]) => calibrated(text).map(format));
  assert.deepEqual(messages, [
    ['line 55: The team has a history file, so the Calibration line names the past stories the estimate drew on, or says nothing in the history compares.'],
    ['line 55: The Calibration line names "Send a reminder email", which is not in history.md. Name the team\'s past stories word for word.'],
    ['line 55: history.md says "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated. Use the numbers from history.md.'],
  ]);
});

test('two past stories go on one Calibration line as two sentences, and a line that is not one is refused', () => {
  const two = lookStory().replace(calibration, `${calibration} "Show the next delivery date on the orders page" took 11 hours against 4 to 8 estimated.`);
  assert.deepEqual(calibrated(two), []);
  assert.deepEqual(check(fixture('bad/calibration-bad-item.md')).errors.map(format), [
    'line 55: Each sentence on the Calibration line reads "<title>" took N hours against A to B estimated. Or the line reads exactly "Calibration: none, the team has no history file." or "Calibration: none, nothing in the team\'s history compares."',
  ]);
  assert.deepEqual(check(fixture('bad/estimate-third-line.md')).errors.map(format), ['line 55: The third line of Estimate, if there is one, is "Calibration:" and the past stories the estimate drew on.']);
});

test('a plain "none" is honest when there is no history, or nothing in it compares', () => {
  const noFile = lookStory().replace(calibration, 'Calibration: none, the team has no history file.');
  assert.deepEqual(check(noFile).errors, [], 'with no history at hand, the line is taken at its word');
  const nothing = lookStory().replace(calibration, "Calibration: none, nothing in the team's history compares.");
  assert.deepEqual(check(nothing).errors, []);
  assert.deepEqual(calibrated(nothing), [], 'allowed with a history file too');
  // Without a history file, a story with no Calibration line still passes: older stories have none.
  assert.deepEqual(check(fixture('good-v2-story.md')).errors, []);
  assert.deepEqual(calibrated(fixture('good-v2-story.md')), [], 'with a history file too');
});

test('the templates carry a Calibration placeholder, and a template is never checked against a history', () => {
  for (const name of ['user-story', 'job-story', 'bug', 'spike']) {
    const text = fixture(`../../templates/${name}.md`);
    assert.match(text, /\nCalibration: \[/, name);
    assert.deepEqual(check(text, undefined, { history: fixture('good-history.md') }).errors, [], name);
  }
});

// The check command finds the team's history.md from the story's path, as it finds the team's templates.
test('check finds history.md in the team folder next to a story and checks the Calibration line against it', () => {
  const team = join(temp, 'team');
  for (const sub of ['context', 'stories']) mkdirSync(join(team, sub), { recursive: true });
  copyFileSync(join(root, 'tests/fixtures/good-history.md'), join(team, 'context/history.md'));
  const story = join(team, 'stories/2026-10-02-next-delivery-date.md');
  const cli = () => spawnSync(process.execPath, ['src/run.js', 'check', story], { cwd: root, encoding: 'utf8' });
  writeFileSync(story, lookStory());
  assert.deepEqual([cli().status, cli().stdout], [0, `Checked with Node ${process.version}.\n`]);
  writeFileSync(story, lookStory().replace('took 7 hours', 'took 9 hours'));
  const run = cli();
  assert.equal(run.status, 1);
  assert.match(run.stdout, /^line 55: history\.md says "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated\./m);
  // A story with no Calibration line still passes: stories saved before the team had a history have none.
  writeFileSync(story, fixture('good-v2-story.md'));
  assert.equal(cli().status, 0, cli().stdout);
});

// Review fixes: a title is matched as written, without the spaces after it, and a title can hold ". " or a double quote.
test('a history title with spaces after it still matches the Calibration line that names it', () => {
  const spaced = fixture('good-history.md').replace('two days before the cutoff\n', 'two days before the cutoff   \n');
  assert.notEqual(spaced, fixture('good-history.md'));
  assert.deepEqual(history(spaced), []);
  assert.deepEqual(check(lookStory(), undefined, { history: spaced }).errors, []);
});

test('a past story whose title holds ". " or a double quote can be named word for word', () => {
  const titles = ['Fix the U.S. address form', 'Rename the "Save" button on the orders page'];
  const text = fixture('good-history.md').replace('Show the next delivery date on the orders page', titles[0]).replace('Send a reminder email two days before the cutoff', titles[1]);
  assert.deepEqual(history(text), []);
  assert.deepEqual(historyEntries(text)?.map((e) => e.title), titles);
  const story = lookStory().replace(calibration, `Calibration: "${titles[0]}" took 11 hours against 4 to 8 estimated. "${titles[1]}" took 7 hours against 6 to 10 estimated.`);
  assert.deepEqual(check(story, undefined, { history: text }).errors, []);
  assert.deepEqual(check(story.replace('took 11 hours', 'took 12 hours'), undefined, { history: text }).errors.map(format), [
    `line 55: history.md says "${titles[0]}" took 11 hours against 4 to 8 estimated. Use the numbers from history.md.`,
  ]);
  // A sentence that doesn't fit is still refused, even when the next one does.
  assert.equal(check(story.replace('took 11 hours', 'took many hours'), undefined, { history: text }).errors.length, 1);
});

test('an empty history.md, or one with no front matter, is no history, and check-context reports the file', () => {
  const noFile = lookStory().replace(calibration, 'Calibration: none, the team has no history file.');
  for (const text of ['', '\n', 'Each entry is a finished story.\n\n- Show the next delivery date on the orders page\n  actual: 11 hours\n']) {
    assert.deepEqual(check(noFile, undefined, { history: text }).errors, [], JSON.stringify(text));
  }
  assert.deepEqual(history('').map(format), ['line 1: The file is empty. Write its front matter and entries, or delete it.']);
  assert.deepEqual(history('- Show the next delivery date\n').map(format), ['line 1: The file must start with front matter between two "---" lines.']);
  // With front matter, it is a history file, even with no entries yet.
  assert.equal(check(noFile, undefined, { history: fixture('good-history.md').split('\n- ')[0] }).errors.length, 1);
});

test('check-folder takes an empty history.md as no history, and reports the empty file', () => {
  const team = join(temp, 'empty-history');
  for (const sub of ['context', 'stories']) mkdirSync(join(team, sub), { recursive: true });
  copyFileSync(join(root, 'tests/fixtures/good-context.md'), join(team, 'context/applications.md'));
  writeFileSync(join(team, 'context/history.md'), '');
  writeFileSync(join(team, 'stories/2026-10-02-next-delivery-date.md'), lookStory().replace(calibration, 'Calibration: none, the team has no history file.'));
  const run = spawnSync(process.execPath, ['src/run.js', 'check-folder', team], { cwd: root, encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-10-02' } });
  assert.equal(run.status, 1);
  assert.equal(run.stdout, `${join(team, 'context/history.md')}:\n  line 1: The file is empty. Write its front matter and entries, or delete it.\n`);
});
