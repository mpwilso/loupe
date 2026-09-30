// Checks a context file against the rules in spec/context-file.json.
// Usage: node src/check-context.ts path/to/file.md ...
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { fill, frontMatter, loadSpec, runCli, type Problem } from './spec.ts';

export type ContextSpec = {
  fields: Record<string, string>;
  dateField: string;
  datePattern: string;
  listField: string;
  staleAfterDays: number;
  maxBodyWords: number;
  lineSource: { exempt: string; pattern: string; message?: string };
  secrets: { what: string; pattern: string; flags?: string }[];
  messages: Record<string, string>;
};

export const contextSpec = loadSpec<ContextSpec>('context-file.json');
let spec: ContextSpec;
let M: Record<string, string>;

// Swaps in other rules. Tests use it to switch rules off; nothing else should.
export function setContextSpec(next: ContextSpec): void {
  spec = next;
  M = spec.messages;
}
setContextSpec(contextSpec);
const DAY = 24 * 60 * 60 * 1000;

export function checkContext(text: string, today = new Date()): { errors: Problem[]; warnings: Problem[] } {
  const { errors, warnings } = findProblems(text, today);
  return { errors: errors.filter((p) => p.text), warnings: warnings.filter((p) => p.text) };
}

function findProblems(text: string, today: Date): { errors: Problem[]; warnings: Problem[] } {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((line, i) => {
    for (const secret of spec.secrets) {
      if (new RegExp(secret.pattern, secret.flags).test(line)) {
        errors.push({ line: i + 1, text: fill(M.secret, { what: secret.what }) });
      }
    }
  });

  const { end, fields } = frontMatter(lines);
  if (end < 0) {
    errors.unshift({ line: 1, text: fill(M.noFrontMatter) });
    return { errors, warnings };
  }

  for (const [field, help] of Object.entries(spec.fields)) {
    const entry = fields.get(field);
    if (!entry || (!entry.value && !entry.items.length)) {
      errors.push({ line: entry?.line ?? 1, text: fill(M.missingField, { field, help }) });
    }
  }

  const sources = fields.get(spec.listField);
  if (sources?.value) errors.push({ line: sources.line, text: fill(M.noSources, { field: spec.listField }) });

  const date = fields.get(spec.dateField);
  if (date?.value) {
    const time = Date.parse(`${date.value}T00:00:00Z`);
    const real = !Number.isNaN(time) && new Date(time).toISOString().startsWith(date.value);
    if (!new RegExp(spec.datePattern).test(date.value) || !real) {
      errors.push({ line: date.line, text: fill(M.badDate, { field: spec.dateField }) });
    } else {
      const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - time) / DAY);
      if (days > spec.staleAfterDays) warnings.push({ line: date.line, text: fill(M.stale, { date: date.value, days }) });
    }
  }

  // Every fact line names its own source, so a story can cite the document that holds it. Headings are exempt.
  lines.slice(end + 1).forEach((line, i) => {
    const { exempt, pattern, message } = spec.lineSource;
    const text = line.trim();
    if (text && !new RegExp(exempt).test(text) && !new RegExp(pattern).test(text)) errors.push({ line: end + i + 2, text: fill(message) });
  });

  const words = lines.slice(end + 1).join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  if (words > spec.maxBodyWords) errors.push({ text: fill(M.tooLong, { count: words, limit: spec.maxBodyWords }) });

  return { errors, warnings };
}

export function main(args: string[]): void {
  const today = process.env.LOUPE_TODAY ? new Date(`${process.env.LOUPE_TODAY}T00:00:00Z`) : new Date();
  runCli((text) => checkContext(text, today), 'Usage: node src/check-context.ts path/to/file.md ...', args);
}

if (import.meta.main) main(process.argv.slice(2));
