// A mock issue tracker for trials: an MCP server over stdio, read-only by construction, with invented Pellwick data.
// It has three tools that read, and no code that changes an issue. Plain Node, no packages.
// Usage: node mock/tracker/server.ts [issues.json]   (default: examples/pellwick/tracker/issues.json)
// LOUPE_NOW=YYYY-MM-DDTHH:MM fixes the read time; LOUPE_TRACKER_LOG=<file> appends one line per tool call.
import { appendFileSync, readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';

type Issue = { key: string; title: string; status: string; type: string; created: string; updated: string; reporter: string; description: string; labels: string[] };
const file = process.argv[2] ?? fileURLToPath(new URL('../../examples/pellwick/tracker/issues.json', import.meta.url));
const data: { project: string; issues: Issue[] } = JSON.parse(readFileSync(file, 'utf8'));

// The legacy handshake versions, newest first. A client asking for another gets the newest.
const versions = ['2025-11-25', '2025-06-18', '2025-03-26', '2024-11-05'];
const readOnly = { readOnlyHint: true, openWorldHint: false };
const tools = [
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
  // recent_issues
  if (String(args.project ?? '').toUpperCase() !== data.project) return toolError(`No project ${String(args.project ?? '')} in the tracker.`);
  const limit = Math.min(Math.max(Number(args.limit) || 10, 1), 20);
  return ok({ issues: [...data.issues].sort(newest).slice(0, limit).map(summary) });
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
