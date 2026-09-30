// Checks a context file against the rules in spec/context-file.json.
// Usage: node src/check-context.ts path/to/file.md ...
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { fill, loadSpec, runCli, type Problem } from './spec.ts';

type ContextSpec = {
  fields: Record<string, string>;
  dateField: string;
  datePattern: string;
  listField: string;
  staleAfterDays: number;
  maxBodyWords: number;
  secrets: { what: string; pattern: string; flags?: string }[];
  messages: Record<string, string>;
};

const spec = loadSpec<ContextSpec>('context-file.json');
const M = spec.messages;
const DAY = 24 * 60 * 60 * 1000;

export function checkContext(text: string, today = new Date()): { errors: Problem[]; warnings: Problem[] } {
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

  const end = lines[0]?.trim() === '---' ? lines.indexOf('---', 1) : -1;
  if (end < 0) {
    errors.unshift({ line: 1, text: M.noFrontMatter });
    return { errors, warnings };
  }

  // Front matter: "key: value" lines, and "  - item" lines under a key with no value.
  type Field = { line: number; value: string; items: string[] };
  const fields = new Map<string, Field>();
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

  const words = lines.slice(end + 1).join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  if (words > spec.maxBodyWords) errors.push({ text: fill(M.tooLong, { count: words, limit: spec.maxBodyWords }) });

  return { errors, warnings };
}

if (import.meta.main) {
  const today = process.env.LOUPE_TODAY ? new Date(`${process.env.LOUPE_TODAY}T00:00:00Z`) : new Date();
  runCli((text) => checkContext(text, today), 'Usage: node src/check-context.ts path/to/file.md ...');
}
