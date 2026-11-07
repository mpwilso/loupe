import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createInterface } from 'node:readline';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { format } from '../src/spec.ts';
import { fixture, looks, lookStory, refusedRuns, today, withRun } from './cases.ts';

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
  'writes-post': 'line 11: In a look, "-X" takes GET, not "POST".',
  'repeated-field': 'line 11: "environment:" appears twice in this look. Keep one.',
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

// A look is one read command from a short list, with no shell characters, and placeholders only where a value can't
// change what runs. Anything else is refused, with one plain message.
test('every refused look gets one plain message saying why', () => {
  for (const [run, start] of refusedRuns) {
    const problems = looks(withRun(run)).map(format);
    assert.equal(problems.length, 1, `${run}: ${problems.join(' | ')}`);
    assert.ok(problems[0].startsWith(`line 11: ${start}`), `${run}: ${problems[0]}`);
  }
});

test('a read with curl, wget, HTTPie, psql, mysql or kubectl, in the forms a look allows, passes', () => {
  for (const run of [
    'curl -s http://localhost:8765/subscribers/{subscriber}/next-box',
    'curl -sS -f -X GET http://localhost:8765/subscribers/{subscriber:id}/boxes',
    "curl -s --request=GET -H 'Accept: application/json' 'http://localhost:8765/boxes?ships={day:date}'",
    'wget -q -O - http://localhost:8765/subscribers/{subscriber}/next-box',
    'http --ignore-stdin GET http://localhost:8765/subscribers/{subscriber}/next-box',
    'https -I https://staging.pellwick.test/subscribers/{subscriber}',
    'psql postgresql://localhost/pellwick_test -c "SELECT status, count(*) FROM orders GROUP BY status"',
    `psql -h staging-db -U reader -d pellwick_test -A -t -c "SELECT ships FROM boxes WHERE box = '{box}';"`,
    `mysql -h staging-db -u reader -D pellwick_test -B -e "SELECT ships, updated_at FROM boxes WHERE box = '{box}'"`,
    'kubectl get pods --context staging -n pellwick -o wide',
    'kubectl logs deploy/orders --context staging --tail 50',
  ]) {
    assert.deepEqual(looks(withRun(run)).map(format), [], run);
  }
});

test('the full messages say what was refused and what a look can be', () => {
  const message = (run: string) => looks(withRun(run)).map(format);
  assert.deepEqual(message('curl -s http://localhost:8765/a | head -20'), [
    'line 11: The command has "|", which a shell reads as more than text. A look has no & | < > ` $ \\ or new line anywhere, and no ; but one at the end of a query.',
  ]);
  assert.deepEqual(message('sqlite3 pellwick_test.db "SELECT 1"'), [
    'line 11: "sqlite3" is not a look. A look runs curl, wget, HTTPie (http or https), psql, mysql, or kubectl get, describe or logs.',
  ]);
  assert.deepEqual(message('curl -s http://localhost:8765/prod-orders'), [], 'a path is not a host');
  assert.deepEqual(message('curl -s http://prod-orders.pellwick.test/a'), [
    'line 11: "prod-orders.pellwick.test" looks like production. Loupe never looks at production. This checks the name, not where it really points.',
  ]);
  // A request that writes in more than one way is told each way.
  assert.deepEqual(message('curl -s --request=DELETE http://localhost:8765/a'), [
    'line 11: In a look, "--request" takes GET, not "DELETE".',
    'line 11: The command has "DELETE", a word that writes, like INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, COPY, CREATE, CALL, DO, MERGE or INTO. A look never writes.',
  ]);
  // A placeholder can never be a whole word, or a flag.
  assert.equal(message('curl -s {url}').length, 2);
  assert.ok(message('curl -s -{flag} http://localhost:8765/a').length >= 1);
});

// Review fixes: a production name is caught as a part of a word too, and a word that merely contains one is not.
test('a look at an environment named like production is refused, whatever the case or the word around it', () => {
  for (const environment of ['prod', 'Production', 'the live site', 'prod1', 'prod_us', 'PROD2', 'production2', 'prd', 'eu-prd-2', 'LiveSite']) {
    const text = fixture('good-looks.md').replace('environment: staging', `environment: ${environment}`);
    assert.deepEqual(looks(text).map(format), [`line 10: "${environment}" looks like production. Loupe never looks at production, so leave this look out.`], environment);
  }
  for (const environment of ['staging', 'products-qa', 'delivery test', 'uat2', 'reproduce']) {
    assert.deepEqual(looks(fixture('good-looks.md').replace('environment: staging', `environment: ${environment}`)), [], environment);
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
  // "Looked" with a capital is still a look source, held to the same form.
  assert.deepEqual(check(lookStory().replace(', looked 2026', ', Looked 2026')).errors.map(format), [
    'line 39: This source cites a look at an environment. Write it as the environment and when Loupe looked, like "(staging, looked 2026-10-02 14:05)".',
  ]);
});

// Review fixes: the environment a story cites is one its looks.md lists, and never one named like production.
test('a story cites a look at an environment the team lists in looks.md, never one named like production', () => {
  const team = fixture('good-looks.md');
  assert.deepEqual(check(lookStory(), undefined, { looks: team }).errors, []);
  assert.deepEqual(check(lookStory().replace('(staging, looked', '(Staging, looked'), undefined, { looks: team }).errors, [], 'the case of the name does not matter');
  const uat = lookStory().replace('(staging, looked', '(uat, looked');
  assert.deepEqual(check(uat, undefined, { looks: team }).errors.map(format), [
    'line 39: This look source names "uat", which no look in looks.md reads. Name the environment as looks.md does.',
  ]);
  assert.deepEqual(check(uat).errors, [], 'without a looks.md at hand, the name is taken at its word');
  for (const environment of ['prod', 'prod1', 'Prd', 'live']) {
    const prod = lookStory().replace('(staging, looked', `(${environment}, looked`);
    assert.deepEqual(check(prod).errors.map(format), [`line 39: This look source names "${environment}", which looks like production. Loupe never looks at production.`], environment);
    assert.equal(check(prod, undefined, { looks: team }).errors.length, 1, 'one message, not two');
  }
});

test('check finds looks.md in the team folder next to a story and checks the look source against it', () => {
  const team = join(temp, 'team');
  for (const sub of ['context', 'stories']) mkdirSync(join(team, sub), { recursive: true });
  copyFileSync(join(root, 'tests/fixtures/good-looks.md'), join(team, 'context/looks.md'));
  const story = join(team, 'stories/2026-10-02-next-delivery-date.md');
  const cli = () => spawnSync(process.execPath, ['src/run.js', 'check', story], { cwd: root, encoding: 'utf8' });
  writeFileSync(story, lookStory());
  assert.deepEqual([cli().status, cli().stdout], [0, `Checked with Node ${process.version}.\n`]);
  writeFileSync(story, lookStory().replace('(staging, looked', '(uat, looked'));
  assert.equal(cli().status, 1);
  assert.match(cli().stdout, /^line 39: This look source names "uat", which no look in looks\.md reads\./m);
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

// Review fixes: a look always asks first, so no guide allows one, and the guide's check-look example is real.
test('no guide lets a look run without asking, and the guide shows what check-look prints for the mock look', () => {
  const guide = readFileSync(join(root, 'docs/live-context.md'), 'utf8');
  for (const doc of ['docs/claude-code.md', 'docs/live-context.md', 'README.md']) {
    assert.doesNotMatch(readFileSync(join(root, doc), 'utf8'), /["`]Bash\((curl|wget|https?|psql|mysql|kubectl)\b/, doc);
  }
  assert.match(readFileSync(join(root, 'docs/claude-code.md'), 'utf8'), /Claude Code asks you before every look/);
  assert.match(guide, /Claude Code asks you before every look/);
  assert.match(guide, /They check names, not where a host really points/);
  const run = spawnSync(process.execPath, ['src/run.js', 'check-look', 'examples/pellwick/context/looks.md', '1', 'subscriber=1042'], { cwd: root, encoding: 'utf8', env: { ...process.env, LOUPE_TODAY: '2026-10-02' } });
  assert.equal(run.status, 0, run.stdout);
  assert.ok(guide.includes(`That prints \`${run.stdout.trim()}\`.`), run.stdout);
});
