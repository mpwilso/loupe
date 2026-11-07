import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fillLook } from '../src/check-look.ts';
import { fillCases, filled, fixture, today, withRun } from './cases.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-check-look-'));
after(() => rmSync(temp, { recursive: true }));

const saved = (name: string, text: string) => {
  const path = join(temp, name);
  writeFileSync(path, text);
  return path;
};
const checkLook = (...args: string[]) =>
  spawnSync(process.execPath, ['src/run.js', 'check-look', ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-09-30' } });

// check-look fills in one look and checks the command it makes. Loupe runs what it prints after "ok: ", and nothing else.
test('check-look prints the filled command after "ok: " and exits 0', () => {
  const looks = saved('looks.md', fixture('good-looks.md'));
  const run = checkLook(looks, '1', 'subscriber=1042');
  assert.deepEqual([run.status, run.stdout, run.stderr], [0, 'ok: curl -s http://localhost:8765/subscribers/1042/next-box\n', '']);
  // A look with no placeholders runs as written.
  const second = checkLook(looks, '2');
  assert.deepEqual([second.status, second.stdout], [0, 'ok: psql postgresql://localhost/pellwick_test -c "SELECT status, count(*) FROM orders GROUP BY status"\n']);
});

test('check-look fills a date and a quoted SQL value, and checks each against its shape', () => {
  const dates = saved('dates.md', withRun("curl -s 'http://localhost:8765/boxes?ships={day:date}'"));
  assert.equal(checkLook(dates, '1', 'day=2026-10-09').stdout, "ok: curl -s 'http://localhost:8765/boxes?ships=2026-10-09'\n");
  const sql = saved('sql.md', withRun(`psql -c "SELECT ships FROM boxes WHERE box = '{box}'"`));
  assert.equal(checkLook(sql, '1', 'box=B-7731').stdout, `ok: psql -c "SELECT ships FROM boxes WHERE box = 'B-7731'"\n`);
  // A value that could break out of its quotes, or carry a second command, is not an id.
  for (const value of ["B-7731'; DROP TABLE boxes; --", 'B 7731', '$(id)', '', 'a'.repeat(65), 'jane.doe@example.test']) {
    const run = checkLook(sql, '1', `box=${value}`);
    assert.deepEqual([run.status, run.stdout.startsWith('refused: ')], [1, true], value);
  }
});

test('check-look refuses with one plain line and exit 1', () => {
  const looks = saved('looks.md', fixture('good-looks.md'));
  const run = checkLook(looks, '1', 'subscriber=10 42');
  assert.deepEqual([run.status, run.stdout], [1, 'refused: "10 42" is not an id: 1 to 64 letters, digits, _ or -.\n']);
  assert.deepEqual([checkLook(looks, 'one').status, checkLook(looks, 'one').stdout], [1, 'refused: looks.md has no look number one. Count the looks from 1, in the order looks.md lists them.\n']);
  assert.equal(checkLook(join(temp, 'missing.md'), '1').stdout, `refused: Can't read "${join(temp, 'missing.md')}".\n`);
  // A looks.md whose look names production fails check-context, so no look in it runs.
  const prod = saved('prod.md', fixture('good-looks.md').replace('environment: staging', 'environment: prod_us'));
  assert.match(checkLook(prod, '2').stdout, /^refused: looks\.md doesn't pass check-context, so no look runs\. Fix this first: line 10: "prod_us" looks like production\./);
  const usage = checkLook();
  assert.equal(usage.status, 2);
  assert.match(usage.stderr, /^Usage: node src\/run\.js check-look path\/to\/looks\.md <look number> name=value \.\.\./);
});

test('each check-look refusal is one plain message', () => {
  for (const c of fillCases) assert.deepEqual(filled(c).map((p) => p.text), [c.message], c.name);
});

// The filled command is checked again in full, so no value can turn a listed look into one that writes.
test('check-look checks the filled command again, with every rule', () => {
  const text = fixture('good-looks.md');
  assert.deepEqual(fillLook(text, '1', ['subscriber=1042'], today), { command: 'curl -s http://localhost:8765/subscribers/1042/next-box', problems: [] });
  assert.deepEqual(fillLook(text, '1', ['subscriber=drop'], today).problems.length, 1);
  assert.deepEqual(fillLook(text, '1', ['subscriber=prodUS'], today).problems, [], 'a value in a path is not a host');
});
