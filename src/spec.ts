import { readFileSync } from 'node:fs';

export type Problem = { line?: number; text: string };

export function loadSpec<T>(name: string): T {
  return JSON.parse(readFileSync(new URL(`../spec/${name}`, import.meta.url), 'utf8')) as T;
}

// A rule whose message is missing is switched off: fill gives an empty string, and checkers drop empty problems.
export function fill(template: string | undefined, vars: Record<string, string | number> = {}): string {
  return (template ?? '').replace(/\{(\w+)\}/g, (whole, key: string) => (key in vars ? String(vars[key]) : whole));
}

export function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// A repeated group that holds another repeat or a choice, like (a+)+, (a*)*, (a+)* or (a|a)+, can take the checker
// exponentially long on a line that almost matches. Team templates bring their own patterns, so they get this guard.
// Nesting is tracked across groups: ((a+)b)+ counts. Escaped brackets and character classes are skipped.
export function nestedRepeat(pattern: string): boolean {
  const groups: boolean[] = []; // for each open group, whether it holds a repeat or a choice
  let found = false;
  const repeatAt = (i: number) => /^(?:[+*]|\{\d+,\d*\})/.test(pattern.slice(i));
  const markOuter = () => void (groups.length && (groups[groups.length - 1] = true));
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '\\') i++;
    else if (c === '[') {
      for (i++; i < pattern.length && pattern[i] !== ']'; i++) if (pattern[i] === '\\') i++;
    } else if (c === '(') groups.push(false);
    else if (c === ')') {
      const inner = groups.pop() ?? false;
      const repeated = repeatAt(i + 1);
      if (inner && repeated) found = true;
      if (inner || repeated) markOuter();
    } else if (c === '|' || repeatAt(i)) markOuter();
  }
  return found;
}

// A real calendar day written YYYY-MM-DD: "2026-02-30" parses, but is not one.
export function isRealDate(value: string): boolean {
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
}

// The day a check runs on: LOUPE_TODAY=YYYY-MM-DD fixes it, for staleness checks that must not drift.
export function todayFromEnv(): Date {
  return process.env.LOUPE_TODAY ? new Date(`${process.env.LOUPE_TODAY}T00:00:00Z`) : new Date();
}

export function format(problem: Problem): string {
  return problem.line ? `line ${problem.line}: ${problem.text}` : problem.text;
}

export type Field = { line: number; value: string; items: string[] };

// Front matter: "key: value" lines, and "  - item" lines under a key with no value, between two "---" lines.
// Returns the index of the closing "---", or -1 when there is no front matter.
export function frontMatter(lines: string[]): { end: number; fields: Map<string, Field> } {
  const fields = new Map<string, Field>();
  const end = lines[0]?.trim() === '---' ? lines.findIndex((line, i) => i > 0 && line.trim() === '---') : -1;
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

// Runs a checker over each path and sets the exit code. A pass ends with the Node version it ran on.
export function runCli(
  check: (text: string, path: string) => { errors: Problem[]; warnings: Problem[] },
  usage: string,
  paths = process.argv.slice(2),
  onFail?: string,
): void {
  if (paths.length === 0) {
    console.error(usage);
    process.exit(2);
  }
  let failed = false;
  for (const path of paths) {
    let text: string;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      console.error(`Can't read "${path}".`);
      process.exit(2);
    }
    const { errors, warnings } = check(text, path);
    const lines = [...errors.map(format), ...warnings.map((w) => `warning: ${format(w)}`)];
    if (errors.length) failed = true;
    if (lines.length === 0) continue;
    if (paths.length > 1) console.log(`${path}:`);
    for (const line of lines) console.log(paths.length > 1 ? `  ${line}` : line);
  }
  if (!failed) console.log(`Checked with Node ${process.version}.`);
  else if (onFail) console.log(onFail);
  process.exit(failed ? 1 : 0);
}
