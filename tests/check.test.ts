import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { check } from '../src/check.ts';
import { format } from '../src/spec.ts';

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
  'no-template': "line 3: The story section doesn't follow any template. Use one of: user story, job story, bug or spike.",
  'bad-confidence-level': 'line 19: The first line of Confidence must be exactly High, Medium or Low.',
  'missing-why': 'line 20: Confidence needs a "Why:" line saying what the rating is based on.',
  'extra-line': 'line 22: Confidence has an extra line. It should have exactly 3 lines.',
  'bad-estimate': 'line 24: The first line of Estimate must read "N to M hours", for example "4 to 8 hours".',
  'estimate-reversed': "line 24: The estimate says 8 to 4 hours. The first number can't be bigger than the second.",
  'missing-basis': 'line 23: Estimate needs a "Basis:" line saying what the hours are based on.',
  'banned-phrase': 'line 16: Replace "leverage" with a plainer word.',
  acronym: 'line 10: Spell out "OMS" the first time it appears, like this: "the full name (OMS)".',
  'long-sentence': 'line 16: This sentence has 34 words; the limit is 30. Split it up.',
  'not-ready-no-missing-line':
    'line 1: Under the title, add one line that starts with "Missing: " and names what is missing, ending with a period.',
  'not-ready-unknown-item':
    'line 3: "the budget" is not one of the five things a story needs: who\'s affected, the problem, the desired outcome, which system or application, known constraints.',
  'not-ready-too-many-questions': 'line 6: Questions has 6 items; the limit is 5.',
  'not-ready-extra-section': 'line 9: "## Known" is not an allowed section. The sections are: "## Questions".',
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
    '- The delivery date is stored with each order.',
    '- The order management system (OMS) stores the date.\n- The OMS also stores the time.',
  );
  assert.deepEqual(problems(text), []);
});

test('the command line exits 0 on a pass and 1 with plain lines on a fail', () => {
  const run = (name: string) =>
    spawnSync(process.execPath, ['src/check.ts', `tests/fixtures/${name}`], {
      cwd: new URL('..', import.meta.url),
      encoding: 'utf8',
    });
  const pass = run('good-story.md');
  assert.equal(pass.status, 0);
  assert.equal(pass.stdout, '');
  const fail = run('bad/too-many-items.md');
  assert.equal(fail.status, 1);
  assert.equal(fail.stdout, 'line 10: Known has 6 items; the limit is 5.\n');
});
