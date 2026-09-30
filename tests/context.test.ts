import assert from 'node:assert/strict';
import { test } from 'node:test';
import { checkContext } from '../src/check-context.ts';
import { format } from '../src/spec.ts';
import { fixture, learned, learnedOptions, secretLine, secrets, shortLookalikes, today, withLine } from './cases.ts';

const secret = (what: string) =>
  `line 8: This looks like ${what}. Remove it. Context files must never hold secrets, credentials or customer data.`;

const bad: Record<string, string> = {
  'no-front-matter': 'line 1: The file must start with front matter between two "---" lines.',
  'no-date': 'line 1: The front matter is missing "updated": the date the facts were last checked, like 2026-09-30.',
  'bad-date': 'line 3: "updated" must be a real date like 2026-09-30.',
  'no-sources': 'line 1: The front matter is missing "sources": a list of where the facts came from.',
  'sources-not-a-list': 'line 4: "sources" must list at least one place the facts came from.',
  password: secret('a password'),
  'private-key': secret('a private key'),
  token: secret('a secret or token'),
  email: secret('an email address'),
  'too-long': 'The body has 315 words; the limit is 300. Keep only what a new team member needs.',
  'paragraph-no-source': 'line 8: This fact doesn\'t say where it came from. End the line with its own source in parentheses, like "(planning email, Priya Raman, 2026-09-18)".',
  'numbered-no-source': 'line 10: This fact doesn\'t say where it came from. End the line with its own source in parentheses, like "(planning email, Priya Raman, 2026-09-18)".',
  'no-line-source': 'line 7: This fact doesn\'t say where it came from. End the line with its own source in parentheses, like "(planning email, Priya Raman, 2026-09-18)".',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/context/${name}.md fails with one plain message`, () => {
    const { errors, warnings } = checkContext(fixture(`bad/context/${name}.md`), today);
    assert.deepEqual(errors.map(format), [message]);
    assert.deepEqual(warnings, []);
  });
}

test('a fresh, dated, sourced context file passes', () => {
  assert.deepEqual(checkContext(fixture('good-context.md'), today), { errors: [], warnings: [] });
});

test('a file older than the staleness limit warns but does not fail', () => {
  const { errors, warnings } = checkContext(fixture('warn/stale.md'), new Date('2027-01-01T00:00:00Z'));
  assert.deepEqual(errors, []);
  assert.deepEqual(warnings.map(format), [
    'line 3: Last updated 2026-09-01, 122 days ago. Check the facts are still true, then update the date.',
  ]);
});

test('the staleness limit comes from the spec: 90 days passes, 91 warns', () => {
  const text = fixture('good-context.md');
  assert.equal(checkContext(text, new Date('2026-11-30T00:00:00Z')).warnings.length, 0);
  assert.equal(checkContext(text, new Date('2026-12-01T00:00:00Z')).warnings.length, 1);
});

for (const [what, value] of secrets) {
  test(`${what} that looks real (${value.slice(0, 4)}...) fails`, () => {
    const { errors } = checkContext(withLine(secretLine(value)), today);
    assert.deepEqual(errors.map(format), [secret(what)]);
  });
}

test('text that only looks a little like a key passes', () => {
  for (const line of shortLookalikes) {
    assert.deepEqual(checkContext(withLine(line), today).errors, [], line);
  }
});

test('every bullet in a context file ends with its own source', () => {
  const text = `${fixture('good-context.md')}- Stockroom is the staff tool. (Interview with the engineering lead, 2026-09-01)\n1. Skips come first. (planning email, 2026-09-18)\n`;
  assert.deepEqual(checkContext(text, today).errors, []);
  assert.equal(checkContext(`${text}2. Payments come second.\n`, today).errors.length, 1);
});

// Trial 5 follow-up: plain paragraph lines state facts too. Headings and the front matter are exempt.
test('every fact line needs a source, whether bullet, numbered or paragraph, but headings don\'t', () => {
  const text = `${fixture('good-context.md')}## Staff tools\nStockroom is the staff tool. (engineering lead, 2026-09-01)\n`;
  assert.deepEqual(checkContext(text, today).errors, []);
  assert.equal(checkContext(`${text}Agents use it every day.\n`, today).errors.length, 1);
});

const learnedBad: Record<string, string> = {
  'no-approval-header': 'line 7: Start learned.md with a short line saying Loupe proposes these entries and a person approves each one.',
  'stray-line': 'line 12: Each line after the header is an entry starting "- ", or one of its fields, indented, like "  kind: fact".',
  'two-sentences': 'line 9: Write each entry as one plain sentence, ending with a period.',
  'no-kind': 'line 9: This entry needs "kind: fact" (about the team, product or systems) or "kind: rule" (how the team wants stories written).',
  'partial-source': 'line 11: This entry needs a full source: who said it, how, on which story, and the date, like "source: Priya Raman, correction on skip-a-box, 2026-10-02".',
  'bad-source-date': 'line 11: The date in this source must be a real date like 2026-10-02.',
  'bad-applies': 'line 12: "applies:" must say when the entry holds, from a start to an end, like "applies: 1 December to 5 January".',
  'unquoted-replaces': 'line 12: "replaces:" must quote the earlier fact exactly, in double quotes.',
  'replaces-not-found':
    'line 12: "replaces:" quotes "The web app is where staff manage refunds.", but no other context file or earlier entry says that. Quote the earlier fact exactly, and check learned.md together with the other context files.',
  'duplicate-replaces': 'line 16: Two entries replace "The web app is where customers manage their orders.". Keep one, or have the newer entry replace the older one.',
  'unknown-field': 'line 12: "said:" is not an entry field. The fields are kind, source, applies and replaces.',
};

for (const [name, message] of Object.entries(learnedBad)) {
  test(`bad/learned/${name}.md fails with one plain message`, () => {
    assert.deepEqual(learned(fixture(`bad/learned/${name}.md`)).map(format), [message]);
  });
}

test('a learned.md with a fact, a rule, a time window and a chain of replacements passes', () => {
  assert.deepEqual(checkContext(fixture('good-learned.md'), today, learnedOptions()), { errors: [], warnings: [] });
});

test('a learned.md with no entries yet passes, so a team can start with an empty one', () => {
  const empty = fixture('good-learned.md').split('\n- ')[0];
  assert.deepEqual(checkContext(empty, today, learnedOptions()), { errors: [], warnings: [] });
});

test('a "replaces:" line can only be checked against the other context files, so alone it fails', () => {
  const alone = checkContext(fixture('good-learned.md'), today, { learned: true, others: [] }).errors.map(format);
  assert.equal(alone.length, 1);
  assert.match(alone[0], /^line 12: "replaces:" quotes "The web app is where customers manage their orders\."/);
});

test('an ordinary context file still needs a source on every line; learned.md uses its entry fields instead', () => {
  assert.equal(checkContext(fixture('good-learned.md'), today).errors.length > 0, true);
});
