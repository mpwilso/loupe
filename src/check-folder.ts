// Checks a whole team folder: context files, learned.md, looks.md and history.md with check-context, team templates
// and stories with check, and tickets.md, the tickets Loupe created, against the stories they came from.
// With a history.md, every story's Calibration line is checked against it, and with a looks.md, every look source.
// Usage: node src/check-folder.ts path/to/loupe
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { builtInFolder, check, loadTemplates } from './check.ts';
import { checkContext, contextOptions, contextSpec } from './check-context.ts';
import { checkTickets, ticketsSpec } from './check-tickets.ts';
import { runCli, todayFromEnv } from './spec.ts';

const usage = 'Usage: node src/check-folder.ts path/to/loupe\nA team folder holds context/, learned.md, templates/ and stories/.';
const markdown = (dir: string) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.md')).sort().map((f) => join(dir, f)) : []);

export function main(args: string[]): void {
  const [dir] = args;
  if (args.length !== 1 || !dir || !existsSync(dir) || !statSync(dir).isDirectory()) {
    console.error(usage);
    process.exit(2);
  }
  if (!existsSync(join(dir, 'context'))) {
    console.error(`No context folder in ${dir}. A team folder holds context/, learned.md, templates/ and stories/.`);
    process.exit(2);
  }
  const today = todayFromEnv();
  // learned.md belongs at the folder's root, but it is checked as learned.md wherever it is.
  const isLearned = (path: string) => basename(path) === contextSpec.learned.fileName;
  const contextPaths = [...markdown(join(dir, 'context')), ...markdown(dir).filter(isLearned)];
  const others = contextPaths.filter((p) => !isLearned(p)).map((p) => readFileSync(p, 'utf8'));
  const teamTemplates = join(dir, 'templates');
  const templates = [...loadTemplates(builtInFolder), ...(existsSync(teamTemplates) ? loadTemplates(teamTemplates) : [])];
  const storyPaths = markdown(join(dir, 'stories'));
  const tickets = join(dir, ticketsSpec.fileName);
  const historyPath = join(dir, 'context', contextSpec.history.fileName);
  const history = existsSync(historyPath) ? readFileSync(historyPath, 'utf8') : undefined;
  const looksPath = join(dir, 'context', contextSpec.looks.fileName);
  const looks = existsSync(looksPath) ? readFileSync(looksPath, 'utf8') : undefined;
  const paths = [...contextPaths, ...markdown(teamTemplates), ...storyPaths, ...(existsSync(tickets) ? [tickets] : [])];
  runCli(
    (text, path) => {
      if (path === tickets) return checkTickets(text, new Map(storyPaths.map((p) => [basename(p), readFileSync(p, 'utf8')])));
      if (isLearned(path)) return checkContext(text, today, { learned: true, others });
      if (contextPaths.includes(path)) return checkContext(text, today, contextOptions(path));
      return check(text, templates, { history, looks });
    },
    usage,
    paths,
  );
}

if (import.meta.main) main(process.argv.slice(2));
