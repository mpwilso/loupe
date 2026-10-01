// Checks a whole team folder: context files and learned.md with check-context, and team templates and stories with check.
// Usage: node src/check-folder.ts path/to/loupe
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { builtInFolder, check, loadTemplates } from './check.ts';
import { checkContext, contextSpec } from './check-context.ts';
import { runCli } from './spec.ts';

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
  const today = process.env.LOUPE_TODAY ? new Date(`${process.env.LOUPE_TODAY}T00:00:00Z`) : new Date();
  // learned.md belongs at the folder's root, but it is checked as learned.md wherever it is.
  const isLearned = (path: string) => basename(path) === contextSpec.learned.fileName;
  const contextPaths = [...markdown(join(dir, 'context')), ...markdown(dir).filter(isLearned)];
  const others = contextPaths.filter((p) => !isLearned(p)).map((p) => readFileSync(p, 'utf8'));
  const teamTemplates = join(dir, 'templates');
  const templates = [...loadTemplates(builtInFolder), ...(existsSync(teamTemplates) ? loadTemplates(teamTemplates) : [])];
  const paths = [...contextPaths, ...markdown(teamTemplates), ...markdown(join(dir, 'stories'))];
  runCli(
    (text, path) => {
      if (isLearned(path)) return checkContext(text, today, { learned: true, others });
      if (contextPaths.includes(path)) return checkContext(text, today);
      return check(text, templates);
    },
    usage,
    paths,
  );
}

if (import.meta.main) main(process.argv.slice(2));
