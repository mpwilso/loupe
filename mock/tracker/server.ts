// A mock issue tracker for trials: an MCP server over stdio, with invented Pellwick data. Plain Node, no packages.
// By default it is read-only by construction: three tools that read, and no code that changes an issue.
// With --allow-create it adds one tool, create_issue, and keeps the issues it creates in a separate state file,
// never in the issues file. It can never update, comment on, move or delete an issue.
// Usage: node mock/tracker/server.ts [issues.json] [--allow-create --state <file>]
//   (default issues: examples/pellwick/tracker/issues.json; the state file can also come from LOUPE_TRACKER_STATE)
// LOUPE_NOW=YYYY-MM-DDTHH:MM fixes the read time; LOUPE_TRACKER_LOG=<file> appends one line per tool call.
import { appendFileSync, existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

type Issue = { key: string; title: string; status: string; type: string; created: string; updated: string; reporter: string; description: string; labels: string[] };
const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { 'allow-create': { type: 'boolean' }, state: { type: 'string' } } });
const file = positionals[0] ?? fileURLToPath(new URL('../../examples/pellwick/tracker/issues.json', import.meta.url));
const data: { project: string; issues: Issue[] } = JSON.parse(readFileSync(file, 'utf8'));
const seedKeys = new Set(data.issues.map((i) => i.key));
const allowCreate = flags['allow-create'] === true;
const stateFile = flags.state ?? process.env.LOUPE_TRACKER_STATE;
if (allowCreate) {
  if (!stateFile) {
    console.error('--allow-create needs a state file: --state <file> or LOUPE_TRACKER_STATE. Created issues never go in the issues file.');
    process.exit(2);
  }
  if (resolve(stateFile) === realpathSync(file)) {
    console.error('The state file must not be the issues file.');
    process.exit(2);
  }
  if (existsSync(stateFile)) data.issues.push(...(JSON.parse(readFileSync(stateFile, 'utf8')).issues as Issue[]));
}

// The legacy handshake versions, newest first. A client asking for another gets the newest.
const versions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
type Tool = { name: string; description: string; inputSchema: Record<string, unknown>; annotations: Record<string, boolean> };
const readOnly = { readOnlyHint: true, openWorldHint: false };
const tools: Tool[] = [
  {
    name: 'search_issues',
    description: 'Search the tracker for issues whose title, description or labels contain the words in the query. Returns key, title, status, type and last change date, newest first, with the time the tracker was read.',
    inputSchema: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Words to look for' }, status: { type: 'string', description: 'Only issues in this status, such as Open' } },
      required: ['query'],
    },
    annotations: readOnly,
  },
  {
    name: 'get_issue',
    description: 'Read one issue in full by its key, such as SUBS-142, with the time the tracker was read.',
    inputSchema: { type: 'object', properties: { key: { type: 'string', description: 'The issue key' } }, required: ['key'] },
    annotations: readOnly,
  },
  {
    name: 'recent_issues',
    description: "List a project's most recently changed issues, newest first, with the time the tracker was read.",
    inputSchema: {
      type: 'object',
      properties: { project: { type: 'string', description: 'The project key, such as SUBS' }, limit: { type: 'number', description: 'How many, at most 20' } },
      required: ['project'],
    },
    annotations: readOnly,
  },
];
const types = ['Story', 'Bug', 'Task'];
if (allowCreate) {
  tools.push({
    name: 'create_issue',
    description: 'Create one new issue in a project, from a finished story the user approved. Returns the new key and when it was created.',
    inputSchema: {
      type: 'object',
      properties: {
        project: { type: 'string', description: 'The project key, such as SUBS' },
        type: { type: 'string', description: 'Story, Bug or Task' },
        title: { type: 'string', description: 'The title' },
        description: { type: 'string', description: 'The description, exactly as it should be saved' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels, such as loupe' },
      },
      required: ['project', 'type', 'title', 'description', 'labels'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  });
}

const pad = (n: number) => String(n).padStart(2, '0');
const readTime = () => {
  const now = process.env.LOUPE_NOW ? new Date(process.env.LOUPE_NOW) : new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};
const summary = ({ key, title, status, type, updated }: Issue) => ({ key, title, status, type, updated });
const newest = (a: Issue, b: Issue) => b.updated.localeCompare(a.updated) || b.key.localeCompare(a.key);
const ok = (value: object) => ({ content: [{ type: 'text', text: JSON.stringify({ read: readTime(), ...value }, null, 2) }] });
const toolError = (text: string) => ({ content: [{ type: 'text', text }], isError: true });

function run(name: string, args: Record<string, unknown>) {
  if (name === 'search_issues') {
    if (typeof args.query !== 'string' || !args.query.trim()) return toolError('search_issues needs a query.');
    const words = args.query.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
    const score = (i: Issue) => words.filter((w) => `${i.title} ${i.description} ${i.labels.join(' ')}`.toLowerCase().includes(w)).length;
    const matches = data.issues
      .filter((i) => !args.status || i.status.toLowerCase() === String(args.status).toLowerCase())
      .filter((i) => score(i) > 0)
      .sort((a, b) => score(b) - score(a) || newest(a, b))
      .slice(0, 10);
    return ok({ issues: matches.map(summary) });
  }
  if (name === 'get_issue') {
    const issue = data.issues.find((i) => i.key === String(args.key ?? '').toUpperCase());
    return issue ? ok({ issue }) : toolError(`No issue ${String(args.key ?? '')} in the tracker.`);
  }
  if (name === 'create_issue') return create(args);
  // recent_issues
  if (String(args.project ?? '').toUpperCase() !== data.project) return toolError(`No project ${String(args.project ?? '')} in the tracker.`);
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
  return ok({ issues: [...data.issues].sort(newest).slice(0, limit).map(summary) });
}

// Keys continue from the highest number in the project. Only the created issues are written, to the state file.
function create(args: Record<string, unknown>) {
  const { project, type, title, description, labels } = args;
  if (String(project ?? '').toUpperCase() !== data.project) return toolError(`No project ${String(project ?? '')} in the tracker.`);
  if (!types.includes(String(type))) return toolError(`The type must be one of ${types.join(', ')}.`);
  if (typeof title !== 'string' || !title.trim()) return toolError('create_issue needs a title.');
  if (typeof description !== 'string' || !description.trim()) return toolError('create_issue needs a description.');
  if (!Array.isArray(labels) || !labels.every((l) => typeof l === 'string')) return toolError('labels must be a list of words.');
  const next = Math.max(...data.issues.map((i) => Number(i.key.split('-')[1]))) + 1;
  const time = readTime();
  const issue: Issue = { key: `${data.project}-${next}`, title, status: 'Open', type: String(type), created: time.slice(0, 10), updated: time.slice(0, 10), reporter: 'Loupe', description, labels };
  data.issues.push(issue);
  writeFileSync(stateFile!, `${JSON.stringify({ issues: data.issues.filter((i) => !seedKeys.has(i.key)) }, null, 2)}\n`);
  return { content: [{ type: 'text', text: JSON.stringify({ key: issue.key, created: time }, null, 2) }] };
}

const send = (message: object) => process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', ...message })}\n`);

createInterface({ input: process.stdin }).on('line', (line) => {
  if (!line.trim()) return;
  let message: { id?: number | string; method?: string; params?: Record<string, any> };
  try {
    message = JSON.parse(line);
  } catch {
    return send({ id: null, error: { code: -32700, message: 'Parse error' } });
  }
  const { id, method, params = {} } = message;
  if (id === undefined) return; // A notification, such as notifications/initialized, gets no reply.
  if (method === 'initialize') {
    const protocolVersion = versions.includes(params.protocolVersion) ? params.protocolVersion : versions[0];
    return send({ id, result: { protocolVersion, capabilities: { tools: {} }, serverInfo: { name: 'pellwick-tracker', version: '1.0.0' } } });
  }
  if (method === 'ping') return send({ id, result: {} });
  if (method === 'tools/list') return send({ id, result: { tools } });
  if (method === 'tools/call') {
    const tool = tools.find((t) => t.name === params.name);
    if (!tool) return send({ id, error: { code: -32602, message: `Unknown tool: ${params.name}` } });
    if (process.env.LOUPE_TRACKER_LOG) appendFileSync(process.env.LOUPE_TRACKER_LOG, `${JSON.stringify({ read: readTime(), tool: tool.name, arguments: params.arguments ?? {} })}\n`);
    return send({ id, result: run(tool.name, params.arguments ?? {}) });
  }
  send({ id, error: { code: -32601, message: `Method not found: ${method}` } });
});
