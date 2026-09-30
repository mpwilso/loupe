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

test('no tracked file contains an em dash', () => {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(Boolean);
  assert.ok(files.length > 0);
  const offenders = files.filter((path) => read(path).includes('\u2014'));
  assert.deepEqual(offenders, []);
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
const inputs = ['skip-a-box-meeting.md', 'helpline-ticket-48213.md', 'holiday-cutoff-email.md', 'export-notes.md'];
const resultHeader = '| Input | Expected | Node | Checker ran | Passed checker | Time | Edits | Unsupported facts | Dev questions | Right call |';

test('the trial run results table keeps its fixed columns and rows', () => {
  const [results] = tables();
  assert.deepEqual(results.slice(0, 2), [resultHeader, '|---|---|---|---|---|---|---|---|---|---|']);
  assert.deepEqual(firstCells(results), inputs);
  for (const input of inputs) assert.ok(existsSync(join(root, 'examples/pellwick/inputs', input)), input);
  const expected = results.slice(2).map((row) => row.split('|')[2].trim());
  assert.deepEqual(expected, ['story', 'story', 'story', 'not ready']);
});
