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

// Runs a checker over each path given on the command line and sets the exit code.
export function runCli(check: (text: string) => { errors: Problem[]; warnings: Problem[] }, usage: string): void {
  const paths = process.argv.slice(2);
  if (paths.length === 0) {
    console.error(usage);
    process.exit(2);
  }
  let failed = false;
  for (const path of paths) {
    const { errors, warnings } = check(readFileSync(path, 'utf8'));
    const lines = [...errors.map(format), ...warnings.map((w) => `warning: ${format(w)}`)];
    if (errors.length) failed = true;
    if (lines.length === 0) continue;
    if (paths.length > 1) console.log(`${path}:`);
    for (const line of lines) console.log(paths.length > 1 ? `  ${line}` : line);
  }
  process.exit(failed ? 1 : 0);
}
