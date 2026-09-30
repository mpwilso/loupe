import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { format, loadSpec } from '../src/spec.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const list = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.md')).map((f) => `${dir}/${f}`);
const teams = readdirSync(join(root, 'examples'));

test('every story template passes the checker', () => {
  const templates = list('templates').filter((path) => !path.endsWith('definition-of-ready.md'));
  assert.equal(templates.length, 4);
  for (const path of templates) assert.deepEqual(check(read(path)).errors.map(format), [], path);
});

test('the definition of ready names all five things in the readiness bar', () => {
  const text = read('templates/definition-of-ready.md').toLowerCase();
  const { items } = loadSpec<{ items: { label: string }[] }>('readiness.json');
  for (const { label } of items) assert.ok(text.includes(label.replace(/^the /, '')), label);
});

test('every expected example passes the checker', () => {
  for (const team of teams) {
    const paths = list(`examples/${team}/expected`);
    assert.ok(paths.length > 0);
    for (const path of paths) assert.deepEqual(check(read(path)).errors.map(format), [], path);
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
