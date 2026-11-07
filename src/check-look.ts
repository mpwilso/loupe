// Fills in one look from looks.md and checks the command that makes, so Loupe runs that command and nothing else.
// Usage: node src/check-look.ts path/to/looks.md <look number> name=value ...
// The looks are counted from 1, in the order looks.md lists them. Each value must fit its placeholder's shape, and the
// filled command is checked again, in full, before it is printed. Prints "ok: <the command>" and exits 0, or
// "refused: <the reason>" and exits 1. Set LOUPE_TODAY=YYYY-MM-DD to check looks.md against a fixed date.
import { readFileSync } from 'node:fs';
import { checkContext, contextRules } from './check-context.ts';
import { commandProblems, placeholdersIn } from './look-command.ts';
import { fill, format, frontMatter, isRealDate, parseEntries, todayFromEnv } from './spec.ts';

const usage = 'Usage: node src/run.js check-look path/to/looks.md <look number> name=value ...\nRun the command it prints after "ok: ", word for word, and nothing else.';

export function fillLook(text: string, number: string, args: string[], today = new Date()): { command?: string; problems: string[] } {
  const L = contextRules().looks;
  const F = L.fill;
  const problems: string[] = [];
  const add = (message: string | undefined, vars: Record<string, string> = {}) => {
    const line = fill(message, vars);
    if (line) problems.push(line);
  };
  // A looks.md that fails its own rules runs nothing, so a look at production, or one that writes, never runs.
  const errors = checkContext(text, today, { looks: true }).errors;
  if (errors.length) add(F.fileMessage, { problem: format(errors[0]) });
  if (problems.length) return { problems };

  const lines = text.split(/\r?\n/);
  const { end } = frontMatter(lines);
  const entries = end < 0 ? [] : parseEntries(lines, end, L).entries;
  const template = /^\d+$/.test(number) ? entries[Number(number) - 1]?.fields.get('run')?.value : undefined;
  if (template === undefined) {
    add(F.entryMessage, { number });
    return { problems };
  }

  const wanted = new Map(placeholdersIn(template, L).map((p) => [p.name, p.shape]));
  const values = new Map<string, string>();
  for (const arg of args) {
    const match = /^([A-Za-z][A-Za-z0-9_]*)=(.*)$/s.exec(arg);
    if (!match) {
      add(F.argumentMessage, { argument: arg });
      continue;
    }
    const [, name, value] = match;
    if (!wanted.has(name)) add(F.unknownNameMessage, { name, names: [...wanted.keys()].join(', ') || 'none' });
    else if (values.has(name)) add(F.repeatedNameMessage, { name });
    else {
      values.set(name, value);
      const shape = L.shapes[wanted.get(name)!];
      if (shape && !(new RegExp(shape.pattern).test(value) && (!shape.realDate || isRealDate(value)))) add(shape.message, { value });
    }
  }
  for (const [name, shape] of wanted) if (!values.has(name)) add(F.missingNameMessage, { name, example: L.shapes[shape]?.example ?? '' });
  if (problems.length) return { problems };

  const command = template.replace(new RegExp(L.placeholder, 'g'), (whole, name: string) => values.get(name) ?? whole);
  problems.push(...commandProblems(command, L, false));
  return problems.length ? { problems } : { command, problems };
}

export function main(args: string[]): void {
  const [path, number, ...values] = args;
  if (!path || !number) {
    console.error(usage);
    process.exit(2);
  }
  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    console.log(`refused: Can't read "${path}".`);
    process.exit(1);
  }
  const { command, problems } = fillLook(text, number, values, todayFromEnv());
  if (command !== undefined) {
    console.log(`ok: ${command}`);
    process.exit(0);
  }
  console.log(`refused: ${problems[0] ?? 'the look could not be checked.'}`);
  process.exit(1);
}

if (import.meta.main) main(process.argv.slice(2));
