import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { format } from '../src/spec.ts';
import { fixture, looks, lookStory, today, withRun, writeSigns } from './cases.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-looks-'));
after(() => rmSync(temp, { recursive: true }));

// looks.md: each look reads a lower environment, with the exact command, and never writes.
const bad: Record<string, string> = {
  'no-header': 'line 7: Start looks.md with a short line saying each look reads a lower environment and never changes it.',
  'unknown-field': 'line 13: "note:" is not a look field. The fields are environment, run and source.',
  'stray-line': 'line 13: Each line after the header is a look starting "- ", or one of its fields, indented, like "  environment: staging".',
  'two-sentences': 'line 9: Write each look as one plain sentence saying what it shows, ending with a period.',
  'no-environment': 'line 9: This look needs "environment:" naming the lower environment it reads, like "environment: staging".',
  production: 'line 10: "production" looks like production. Loupe never looks at production, so leave this look out.',
  'no-run': 'line 9: This look needs "run:" with the exact command Loupe runs, word for word, like "run: curl -s http://localhost:8765/subscribers/{subscriber}/next-box".',
  'writes-post': 'line 11: This command has a request method that writes, "-X POST". A look reads and never changes anything, so leave this one out.',
  'no-source': 'line 9: This look needs a source: who gave it, how, and the date, like "source: Sam Okafor, setup interview, 2026-09-30".',
  'bad-source-date': 'line 12: The date in this source must be a real date like 2026-09-30.',
};

for (const [name, message] of Object.entries(bad)) {
  test(`bad/looks/${name}.md fails with one plain message`, () => {
    assert.deepEqual(looks(fixture(`bad/looks/${name}.md`)).map(format), [message]);
  });
}

test('a looks file with a header, an environment, a command and a source on every look passes', () => {
  assert.deepEqual(looks(fixture('good-looks.md')), []);
});

// The guard against a look that writes: any sign of a write in the command refuses it. It is a guard, not proof.
test('every sign of a write refuses the look, naming what it saw', () => {
  for (const [what, run] of writeSigns) {
    const problems = looks(withRun(run)).map(format);
    assert.equal(problems.length, 1, `${run}: ${problems.join(' | ')}`);
    assert.match(problems[0], new RegExp(`^line 11: This command has ${what.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}, "`), problems[0]);
  }
  // A read with a method named in the clear, a database file flag and a pipe into a reader all pass.
  for (const run of ['curl -s -X GET http://localhost:8765/subscribers/{subscriber}/boxes', 'curl -s http://localhost:8765/subscribers/{subscriber}/boxes | head -20', 'sqlite3 pellwick_test.db "SELECT count(*) FROM orders"']) {
    assert.deepEqual(looks(withRun(run)), [], run);
  }
});

test('a look at anything named like production is refused, whatever the case', () => {
  for (const environment of ['prod', 'Production', 'the live site']) {
    const text = fixture('good-looks.md').replace('environment: staging', `environment: ${environment}`);
    assert.deepEqual(looks(text).map(format), [`line 10: "${environment}" looks like production. Loupe never looks at production, so leave this look out.`]);
  }
});

test('the context checker picks the looks rules by file name', () => {
  copyFileSync(join(root, 'tests/fixtures/good-looks.md'), join(temp, 'looks.md'));
  const run = spawnSync(process.execPath, ['src/run.js', 'check-context', join(temp, 'looks.md')], { cwd: root, encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-09-30' } });
  assert.deepEqual([run.status, run.stdout], [0, `Checked with Node ${process.version}.\n`]);
  // The same text under another name is a plain context file, whose lines need their own sources.
  copyFileSync(join(root, 'tests/fixtures/good-looks.md'), join(temp, 'environments.md'));
  assert.equal(spawnSync(process.execPath, ['src/run.js', 'check-context', join(temp, 'environments.md')], { cwd: root, encoding: 'utf8' }).status, 1);
});

// A story cites what a look showed with the environment and the time, like a tracker fact with its read time.
test('a story cites a look with the environment and when Loupe looked, and nothing less', () => {
  assert.deepEqual(check(lookStory()).errors, []);
  assert.deepEqual(check(fixture('bad/look-bad-form.md')).errors.map(format), [
    'line 39: This source cites a look at an environment. Write it as the environment and when Loupe looked, like "(staging, looked 2026-10-02 14:05)".',
  ]);
  assert.deepEqual(check(fixture('bad/look-bad-time.md')).errors.map(format), ['line 39: The time in this look source must be a real date and time, like "looked 2026-10-02 14:05".']);
  // Two sources on one line, one of them a look, are each checked.
  const two = lookStory().replace('(staging, looked 2026-10-02 14:05)', '(Sam, meeting 2026-09-01; staging, looked 2026-10-02 14:05)');
  assert.deepEqual(check(two).errors, []);
  assert.equal(check(two.replace('looked 2026-10-02 14:05', 'looked yesterday')).errors.length, 1);
});

test('the example looks file passes, and its looks read the mock environment', () => {
  const text = readFileSync(join(root, 'examples/pellwick/context/looks.md'), 'utf8');
  assert.deepEqual(checkContext(text, today, { looks: true }), { errors: [], warnings: [] });
  assert.match(text, /run: curl -s http:\/\/localhost:8765\/subscribers\/\{subscriber\}\/next-box/);
});

// The mock environment: a small HTTP server with invented staging data, read-only by construction.
const dataFile = join(root, 'examples/pellwick/environment/staging.json');
const hash = () => createHash('sha256').update(readFileSync(dataFile)).digest('hex');
const port = 18765;

async function startServer(): Promise<{ stop: () => void }> {
  const server = spawn(process.execPath, ['mock/environment/server.ts', '--port', String(port)], { cwd: root, env: { ...process.env, LOUPE_NOW: '2026-10-02T14:05:00' } });
  await new Promise<void>((resolve) => createInterface({ input: server.stdout }).once('line', () => resolve()));
  return { stop: () => server.kill() };
}
const get = async (path: string, method = 'GET') => {
  const response = await fetch(`http://localhost:${port}${path}`, { method });
  return { status: response.status, allow: response.headers.get('allow'), body: await response.json() };
};

test('the mock environment answers GET with the data and the looked time, and refuses everything else', async () => {
  const before = hash();
  const server = await startServer();
  try {
    const next = await get('/subscribers/1042/next-box');
    assert.equal(next.status, 200);
    assert.deepEqual(next.body, { environment: 'staging', looked: '2026-10-02 14:05', subscriber: '1042', nextBox: { box: 'B-7731', ships: '2026-10-09', status: 'scheduled', skipped: false } });
    const boxes = await get('/subscribers/1042/boxes');
    assert.deepEqual(boxes.body.boxes.map((b: { box: string }) => b.box), ['B-7702', 'B-7640'], 'newest first');
    assert.equal((await get('/subscribers/9999/next-box')).status, 404);
    assert.equal((await get('/orders')).status, 404);
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const refused = await get('/subscribers/1042/next-box', method);
      assert.deepEqual([refused.status, refused.allow], [405, 'GET'], method);
    }
    assert.equal((await get('/subscribers/1042/next-box')).body.nextBox.skipped, false, 'nothing changed');
  } finally {
    server.stop();
  }
  assert.equal(hash(), before, 'the data file is unchanged');
});

test('the mock environment has no code that writes its data', () => {
  const source = readFileSync(join(root, 'mock/environment/server.ts'), 'utf8');
  assert.doesNotMatch(source, /writeFileSync|writeFile\(|createWriteStream/);
  assert.match(source, /request\.method === 'GET'/);
});
