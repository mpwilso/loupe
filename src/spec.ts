import { readFileSync } from 'node:fs';

export type Problem = { line?: number; text: string };

export function loadSpec<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../spec/${name}`, import.meta.url), 'utf8')) as T;
}

export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function format(problem: Problem): string {
  return problem.line ? `line ${problem.line}: ${problem.text}` : problem.text;
}

export type Field = { line: number; value: string; items: string[] };

// Front matter: "key: value" lines, and "  - item" lines under a key with no value, between two "---" lines.
// Returns the index of the closing "---", or -1 when there is no front matter.
export function frontMatter(lines: string[]): { end: number; fields: Map<string, Field> } {
  const fields = new Map<string, Field>();
  const end = lines[0]?.trim() === '---' ? lines.indexOf('---', 1) : -1;
  let last: Field | undefined;
  for (let i = 1; i < end; i++) {
    const item = /^\s+-\s+(.*\S)/.exec(lines[i]);
    const pair = /^(\w+):\s*(.*?)\s*$/.exec(lines[i]);
    if (item && last) last.items.push(item[1]);
    else if (pair) {
      last = { line: i + 1, value: pair[2], items: [] };
      fields.set(pair[1], last);
    }
  }
  return { end, fields };
}

// Runs a checker over each path and sets the exit code.
export function runCli(
  check: (text: string, path: string) => { errors: Problem[]; warnings: Problem[] },
  usage: string,
  paths = process.argv.slice(2),
): void {
  if (paths.length === 0) {
    console.error(usage);
    process.exit(2);
  }
  let failed = false;
  for (const path of paths) {
    const { errors, warnings } = check(readFileSync(path, 'utf8'), path);
    const lines = [...errors.map(format), ...warnings.map((w) => `warning: ${format(w)}`)];
    if (errors.length) failed = true;
    if (lines.length === 0) continue;
    if (paths.length > 1) console.log(`${path}:`);
    for (const line of lines) console.log(paths.length > 1 ? `  ${line}` : line);
  }
  process.exit(failed ? 1 : 0);
}
