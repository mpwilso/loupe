// A mock lower environment for trying looks: a small HTTP server with invented Pellwick staging data. Plain Node, no packages.
// It is read-only by construction: it answers GET and nothing else, and it has no code that changes its data.
// Usage: node mock/environment/server.ts [staging.json] [--port 8765]
//   (default data: examples/pellwick/environment/staging.json; the port can also come from LOUPE_ENV_PORT)
// LOUPE_NOW=YYYY-MM-DDTHH:MM fixes the looked time; LOUPE_ENV_LOG=<file> appends one line per request.
import { appendFileSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

type Box = { box: string; shipped: string; status: string };
type Subscriber = { id: string; nextBox: { box: string; ships: string; status: string; skipped: boolean }; boxes: Box[] };
const { values: flags, positionals } = parseArgs({ allowPositionals: true, options: { port: { type: 'string' } } });
const file = positionals[0] ?? fileURLToPath(new URL('../../examples/pellwick/environment/staging.json', import.meta.url));
const data: { environment: string; subscribers: Subscriber[] } = JSON.parse(readFileSync(file, 'utf8'));
const port = Number(flags.port ?? process.env.LOUPE_ENV_PORT ?? 8765);

const pad = (n: number) => String(n).padStart(2, '0');
const lookedTime = () => {
  const now = process.env.LOUPE_NOW ? new Date(process.env.LOUPE_NOW) : new Date();
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

// The two paths a look can read. Anything else is 404; any method but GET is 405.
function look(path: string): { status: number; body: object } {
  const match = /^\/subscribers\/([^/]+)\/(next-box|boxes)$/.exec(path);
  if (!match) return { status: 404, body: { error: `Nothing at ${path}. The paths are /subscribers/{subscriber}/next-box and /subscribers/{subscriber}/boxes.` } };
  const subscriber = data.subscribers.find((s) => s.id === match[1]);
  if (!subscriber) return { status: 404, body: { error: `No subscriber ${match[1]} on ${data.environment}.` } };
  const value = match[2] === 'next-box' ? { nextBox: subscriber.nextBox } : { boxes: [...subscriber.boxes].sort((a, b) => b.shipped.localeCompare(a.shipped)) };
  return { status: 200, body: { environment: data.environment, looked: lookedTime(), subscriber: subscriber.id, ...value } };
}

const server = createServer((request, response) => {
  const path = new URL(request.url ?? '/', 'http://localhost').pathname;
  if (process.env.LOUPE_ENV_LOG) appendFileSync(process.env.LOUPE_ENV_LOG, `${JSON.stringify({ looked: lookedTime(), method: request.method, path })}\n`);
  const { status, body } = request.method === 'GET' ? look(path) : { status: 405, body: { error: `${request.method} is not allowed. This environment answers GET and nothing else.` } };
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (status === 405) headers.Allow = 'GET';
  response.writeHead(status, headers);
  response.end(`${JSON.stringify(body, null, 2)}\n`);
});
server.listen(port, '127.0.0.1', () => console.log(`${data.environment} listening on http://localhost:${port}`));
