import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { checkContext } from '../src/check-context.ts';
import { format } from '../src/spec.ts';

const fixture = (name: string) => readFileSync(new URL(`fixtures/${name}`, import.meta.url), 'utf8');
const today = new Date('2026-09-30T00:00:00Z');
const secret = (what: string) =>
  `line 8: This looks like ${what}. Remove it. Context files must never hold secrets or credentials.`;

const bad: Record<string, string> = {
  'no-front-matter': 'line 1: The file must start with front matter between two "---" lines.',
  'no-date': 'line 1: The front matter is missing "updated": the date the facts were last checked, like 2026-09-30.',
  'bad-date': 'line 3: "updated" must be a real date like 2026-09-30.',
  'no-sources': 'line 1: The front matter is missing "sources": a list of where the facts came from.',
  'sources-not-a-list': 'line 4: "sources" must list at least one place the facts came from.',
  password: secret('a password'),
  'private-key': secret('a private key'),
  'too-long': 'The body has 309 words; the limit is 300. Keep only what a new team member needs.',
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
