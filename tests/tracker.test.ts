import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';

// The mock tracker is an MCP server over stdio: one JSON-RPC message per line. Tests talk to it as Claude Code would.
const root = fileURLToPath(new URL('..', import.meta.url));
const server = spawn(process.execPath, ['mock/tracker/server.ts', 'examples/pellwick/tracker/issues.json'], {
  cwd: root,
  env: { ...process.env, LOUPE_NOW: '2026-10-02T14:05:00' },
});
const waiting = new Map<number, (message: Record<string, any>) => void>();
const unexpected: unknown[] = [];
createInterface({ input: server.stdout }).on('line', (line) => {
  const message = JSON.parse(line);
  const resolve = waiting.get(message.id);
  if (resolve) resolve(message);
  else unexpected.push(message);
});
let next = 1;
const request = (method: string, params: unknown = {}) =>
  new Promise<Record<string, any>>((resolve) => {
    const id = next++;
    waiting.set(id, resolve);
    server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  });
const call = async (name: string, args: unknown) => (await request('tools/call', { name, arguments: args })).result;
const body = (result: { content: { type: string; text: string }[] }) => JSON.parse(result.content[0].text);

before(async () => {
  await request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  server.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })}\n`);
});
after(() => server.kill());

test('initialize answers with a version it supports, the tools capability and its name', async () => {
  const { result } = await request('initialize', { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(result.protocolVersion, '2025-11-25');
  assert.deepEqual(result.capabilities, { tools: {} });
  assert.equal(result.serverInfo.name, 'pellwick-tracker');
  const older = await request('initialize', { protocolVersion: '1999-01-01', capabilities: {} });
  assert.equal(older.result.protocolVersion, '2025-11-25', 'an unknown version gets the latest one it supports');
  assert.deepEqual(unexpected, [], 'a notification gets no reply');
});

// Read-only by construction: the tracker has no tool that could change anything, and the list says so.
// Tool names are written create_issue or createJiraIssue, so they are split into words first.
const words = (text: string) => text.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_.-]/g, ' ');
const writeWords = /\b(create|creates|update|updates|edit|edits|delete|deletes|transition|transitions|comment|comments|assign|assigns|post|posts|set|sets|write|writes|close|closes|move|moves)\b/i;
const soundsLikeWrite = (text: string) => writeWords.test(words(text));

test('the tracker exposes three read tools, marked read-only, and nothing that sounds like a write', async () => {
  const { result } = await request('tools/list');
  assert.deepEqual(result.tools.map((t: { name: string }) => t.name), ['search_issues', 'get_issue', 'recent_issues']);
  for (const tool of result.tools) {
    assert.ok(!soundsLikeWrite(`${tool.name} ${tool.description}`), tool.name);
    assert.equal(tool.inputSchema.type, 'object', tool.name);
    assert.equal(tool.annotations.readOnlyHint, true, tool.name);
  }
  for (const write of ['create_issue', 'createJiraIssue', 'transitionJiraIssue', 'Add a comment to an issue']) assert.ok(soundsLikeWrite(write), write);
  assert.ok(!soundsLikeWrite('searchJiraIssuesUsingJql'), 'a search reads');
});

test('search_issues finds issues by words in their title, description or labels, newest first, with the read time', async () => {
  const found = body(await call('search_issues', { query: 'skip Stockroom' }));
  assert.equal(found.read, '2026-10-02 14:05');
  assert.ok(found.issues.some((i: { key: string }) => i.key === 'SUBS-101'), 'the closed skip issue');
  for (const issue of found.issues) assert.deepEqual(Object.keys(issue), ['key', 'title', 'status', 'type', 'updated']);
  const open = body(await call('search_issues', { query: 'delivery address', status: 'Open' }));
  assert.equal(open.issues[0].key, 'SUBS-142');
  assert.ok(open.issues.every((i: { status: string }) => i.status === 'Open'));
  assert.deepEqual(body(await call('search_issues', { query: 'zebra' })).issues, []);
});

test('get_issue returns one whole issue, and an unknown key is a tool error the model can see', async () => {
  const issue = body(await call('get_issue', { key: 'SUBS-150' }));
  assert.equal(issue.read, '2026-10-02 14:05');
  assert.deepEqual(Object.keys(issue.issue), ['key', 'title', 'status', 'type', 'created', 'updated', 'reporter', 'description', 'labels']);
  const missing = await call('get_issue', { key: 'SUBS-999' });
  assert.equal(missing.isError, true);
  assert.match(missing.content[0].text, /No issue SUBS-999/);
});

test("recent_issues lists a project's most recently changed issues, up to the limit", async () => {
  const recent = body(await call('recent_issues', { project: 'SUBS', limit: 3 }));
  assert.deepEqual(recent.issues.map((i: { key: string }) => i.key), ['SUBS-150', 'SUBS-155', 'SUBS-152']);
  const other = await call('recent_issues', { project: 'OPS' });
  assert.equal(other.isError, true);
});

test('an unknown tool or method is a JSON-RPC error, and a missing argument is a tool error', async () => {
  const unknownTool = await request('tools/call', { name: 'create_issue', arguments: { title: 'x' } });
  assert.equal(unknownTool.error.code, -32602);
  assert.match(unknownTool.error.message, /Unknown tool: create_issue/);
  const unknownMethod = await request('resources/list');
  assert.equal(unknownMethod.error.code, -32601);
  const missing = await call('get_issue', {});
  assert.equal(missing.isError, true);
});

test('the example project config registers the mock as pellwick-tracker, with paths that exist', async () => {
  const { existsSync, readFileSync } = await import('node:fs');
  const config = JSON.parse(readFileSync(`${root}examples/pellwick/tracker/mcp.json`, 'utf8'));
  assert.deepEqual(Object.keys(config.mcpServers), ['pellwick-tracker']);
  const { command, args } = config.mcpServers['pellwick-tracker'];
  assert.equal(command, 'node');
  for (const path of args) assert.ok(existsSync(`${root}${path}`), path);
});

// The live-context guide allows exactly the mock's read tools, and for a real Jira server denies its write tools.
test('the live-context guide allows exactly the three read tools, and denies a real Jira server\'s write tools', async () => {
  const { readFileSync } = await import('node:fs');
  const guide = readFileSync(`${root}docs/live-context.md`, 'utf8');
  const blocks = [...guide.matchAll(/```json\n([\s\S]+?)\n```/g)].map((m) => JSON.parse(m[1]));
  const mock = blocks.find((b) => b.permissions?.allow?.some((r: string) => r.startsWith('mcp__pellwick-tracker__')));
  const { result } = await request('tools/list');
  assert.deepEqual(mock.permissions.allow.filter((r: string) => r.startsWith('mcp__')), result.tools.map((t: { name: string }) => `mcp__pellwick-tracker__${t.name}`));
  const jira = blocks.find((b) => b.permissions?.deny?.length);
  assert.ok(jira, 'a block for a real Jira server');
  for (const tool of ['createJiraIssue', 'editJiraIssue', 'transitionJiraIssue', 'addOrEditJiraIssueComment', 'deleteJiraIssue']) {
    assert.ok(jira.permissions.deny.includes(`mcp__atlassian__${tool}`), tool);
  }
  for (const rule of jira.permissions.deny) assert.ok(soundsLikeWrite(rule.replace('mcp__atlassian__', '')) || /manage|watch|upload|convert/i.test(rule), `${rule} is a write tool`);
  for (const rule of jira.permissions.allow) assert.ok(!soundsLikeWrite(rule.replace('mcp__atlassian__', '')), `${rule} reads`);
  assert.match(guide, /support\.atlassian\.com\/atlassian-rovo-mcp-server\/docs\/supported-tools/);
  assert.match(guide, /not tested/i);
});

// M4c: create mode. The default stays read-only; --allow-create adds create_issue and nothing else, and created
// issues go to a state file, never to the repo's issues file.
async function startServer(args: string[], env: Record<string, string> = {}) {
  const child = spawn(process.execPath, ['mock/tracker/server.ts', 'examples/pellwick/tracker/issues.json', ...args], {
    cwd: root,
    env: { ...process.env, LOUPE_NOW: '2026-10-02T14:05:00', ...env },
  });
  const pending = new Map<number, (message: Record<string, any>) => void>();
  createInterface({ input: child.stdout }).on('line', (line) => pending.get(JSON.parse(line).id)?.(JSON.parse(line)));
  let id = 1;
  const ask = (method: string, params: unknown = {}) =>
    new Promise<Record<string, any>>((done) => {
      const n = id++;
      pending.set(n, done);
      child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id: n, method, params })}\n`);
    });
  await ask('initialize', { protocolVersion: '2025-11-25', capabilities: {} });
  const use = async (name: string, args: unknown) => (await ask('tools/call', { name, arguments: args })).result;
  return { ask, use, stop: () => child.kill() };
}

test('create mode lists the three reads plus create_issue, and nothing else that writes', async () => {
  const { mkdtempSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const state = `${mkdtempSync(`${tmpdir()}/loupe-tracker-`)}/state.json`;
  const server = await startServer(['--allow-create', '--state', state]);
  const { tools } = (await server.ask('tools/list')).result;
  server.stop();
  assert.deepEqual(tools.map((t: { name: string }) => t.name), ['search_issues', 'get_issue', 'recent_issues', 'create_issue']);
  assert.deepEqual(tools.filter((t: { name: string; description: string }) => soundsLikeWrite(`${t.name} ${t.description}`)).map((t: { name: string }) => t.name), ['create_issue']);
  const create = tools.find((t: { name: string }) => t.name === 'create_issue');
  assert.deepEqual(create.inputSchema.required, ['project', 'type', 'title', 'description', 'labels']);
  assert.equal(create.annotations.readOnlyHint, false);
  // The default is unchanged: no create_issue, and a call to it is an unknown tool.
  const { result } = await request('tools/list');
  assert.ok(!result.tools.some((t: { name: string }) => t.name === 'create_issue'));
  assert.equal((await request('tools/call', { name: 'create_issue', arguments: {} })).error.code, -32602);
});

test('created issues get the next key, are readable and searchable, live in the state file, and never touch issues.json', async () => {
  const { createHash } = await import('node:crypto');
  const { mkdtempSync, readFileSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const seed = `${root}examples/pellwick/tracker/issues.json`;
  const hash = () => createHash('sha256').update(readFileSync(seed)).digest('hex');
  const before = hash();
  const state = `${mkdtempSync(`${tmpdir()}/loupe-tracker-`)}/state.json`;
  const story = 'Call: Story written\nConfidence: High, it is clear.\nFirst question: None.\n\n# Let subscribers skip their next box\n';
  const server = await startServer(['--allow-create'], { LOUPE_TRACKER_STATE: state });
  const made = body(await server.use('create_issue', { project: 'SUBS', type: 'Story', title: 'Let subscribers skip their next box', description: story, labels: ['loupe'] }));
  assert.deepEqual(made, { key: 'SUBS-156', created: '2026-10-02 14:05' }, 'the highest key is SUBS-155');
  const read = body(await server.use('get_issue', { key: 'SUBS-156' })).issue;
  assert.equal(read.description, story, 'the description is kept byte for byte');
  assert.deepEqual([read.type, read.status, read.labels], ['Story', 'Open', ['loupe']]);
  assert.equal(body(await server.use('search_issues', { query: 'skip their next box' })).issues[0].key, 'SUBS-156');
  assert.equal((await server.use('create_issue', { project: 'SUBS', type: 'Epic', title: 'x', description: 'x', labels: [] })).isError, true);
  server.stop();
  assert.deepEqual(JSON.parse(readFileSync(state, 'utf8')).issues.map((i: { key: string }) => i.key), ['SUBS-156']);
  // A new server reads the state file, and its next key follows on.
  const again = await startServer(['--allow-create', '--state', state]);
  assert.equal(body(await again.use('get_issue', { key: 'SUBS-156' })).issue.title, 'Let subscribers skip their next box');
  assert.equal(body(await again.use('create_issue', { project: 'SUBS', type: 'Bug', title: 'b', description: 'b', labels: ['loupe'] })).key, 'SUBS-157');
  again.stop();
  assert.equal(hash(), before, 'issues.json is unchanged');
});

test('create mode refuses to start without a state file, or with the issues file as its state', () => {
  const run = (args: string[]) => spawnSync(process.execPath, ['mock/tracker/server.ts', 'examples/pellwick/tracker/issues.json', ...args], { cwd: root, encoding: 'utf8', input: '', env: { ...process.env, LOUPE_TRACKER_STATE: '' } });
  assert.equal(run(['--allow-create']).status, 2);
  assert.match(run(['--allow-create']).stderr, /needs a state file/);
  assert.equal(run(['--allow-create', '--state', 'examples/pellwick/tracker/issues.json']).status, 2);
});

// M4c: the second lock. No doc ever allows a create tool, so Claude Code asks before it runs.
test('no guide allows a create tool; the create blocks put it under ask, and real Jira keeps every other write denied', async () => {
  const { readdirSync, readFileSync } = await import('node:fs');
  const docs = [...readdirSync(`${root}docs`).filter((f) => f.endsWith('.md')).map((f) => `docs/${f}`), 'README.md'];
  for (const doc of docs) {
    for (const [, block] of readFileSync(`${root}${doc}`, 'utf8').matchAll(/```json\n([\s\S]+?)\n```/g)) {
      for (const rule of JSON.parse(block).permissions?.allow ?? []) {
        assert.ok(!/create/i.test(rule), `${doc} allows ${rule}`);
        assert.ok(!(rule.startsWith('mcp__') && rule.includes('*')), `${doc} allows a whole server: ${rule}`);
      }
    }
  }
  const guide = readFileSync(`${root}docs/live-context.md`, 'utf8');
  const creating = guide.split('## Creating tickets\n')[1] ?? '';
  const blocks = [...creating.matchAll(/```json\n([\s\S]+?)\n```/g)].map((m) => JSON.parse(m[1]).permissions);
  assert.deepEqual(blocks.map((b) => b.ask), [['mcp__pellwick-tracker__create_issue'], ['mcp__atlassian__createJiraIssue']]);
  const readOnly = [...guide.split('## Creating tickets\n')[0].matchAll(/```json\n([\s\S]+?)\n```/g)].map((m) => JSON.parse(m[1]).permissions).find((b) => b.deny);
  assert.deepEqual(blocks[1].deny, readOnly.deny.filter((r: string) => r !== 'mcp__atlassian__createJiraIssue'), 'the same writes stay denied');
  assert.match(creating, /"--allow-create", "--state", "\/tmp\/pellwick-tracker-state\.json"/);
  assert.match(creating, /Never add the create tool to an allow list\./);
  assert.match(creating, /This is not tested with Loupe\./);
  assert.match(creating, /checks deny rules first, then ask, then allow/);
});
