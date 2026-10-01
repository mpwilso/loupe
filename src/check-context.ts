// Checks a context file against the rules in spec/context-file.json.
// learned.md, the file Loupe proposes and a person approves, has entries with their own fields instead of a source on
// every line. Check it together with the team's other context files, since its "replaces:" lines quote them.
// Usage: node src/check-context.ts path/to/file.md ...
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { fill, frontMatter, loadSpec, runCli, type Problem } from './spec.ts';

type Rule = { pattern: string; message?: string };
type LearnedSpec = {
  fileName: string;
  maxBodyWords: number;
  foldAfterWords: number;
  foldMessage?: string;
  header: Rule;
  entry: string;
  field: string;
  fields: string[];
  unknownFieldMessage?: string;
  strayMessage?: string;
  sentence: { end: string; second: string; message?: string };
  kind: Rule;
  source: Rule & { dateMessage?: string };
  applies: Rule;
  replaces: Rule & { notFoundMessage?: string; duplicateMessage?: string };
};

export type ContextSpec = {
  fields: Record<string, string>;
  dateField: string;
  datePattern: string;
  listField: string;
  staleAfterDays: number;
  maxBodyWords: number;
  lineSource: { exempt: string; pattern: string; message?: string };
  secrets: { what: string; pattern: string; flags?: string }[];
  learned: LearnedSpec;
  messages: Record<string, string>;
};

// learned: check the file as learned.md. others: the texts of the team's other context files.
export type ContextOptions = { learned?: boolean; others?: string[] };

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

export function checkContext(text: string, today = new Date(), options: ContextOptions = {}): { errors: Problem[]; warnings: Problem[] } {
  const { errors, warnings } = findProblems(text, today, options);
  return { errors: errors.filter((p) => p.text), warnings: warnings.filter((p) => p.text) };
}

function findProblems(text: string, today: Date, options: ContextOptions): { errors: Problem[]; warnings: Problem[] } {
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
    if (!isRealDate(date.value)) {
      errors.push({ line: date.line, text: fill(M.badDate, { field: spec.dateField }) });
    } else {
      const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - time) / DAY);
      if (days > spec.staleAfterDays) warnings.push({ line: date.line, text: fill(M.stale, { date: date.value, days }) });
    }
  }

  // Every fact line names its own source, so a story can cite the document that holds it. Headings are exempt.
  // learned.md names each entry's source in a field instead.
  if (options.learned) errors.push(...checkLearned(lines, end, options.others ?? []));
  else {
    lines.slice(end + 1).forEach((line, i) => {
      const { exempt, pattern, message } = spec.lineSource;
      const text = line.trim();
      if (text && !new RegExp(exempt).test(text) && !new RegExp(pattern).test(text)) errors.push({ line: end + i + 2, text: fill(message) });
    });
  }

  // learned.md grows with every approved entry, so it has its own limit, and a nudge to fold entries in before it's full.
  const words = lines.slice(end + 1).join(' ').split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
  const limit = options.learned ? spec.learned.maxBodyWords : spec.maxBodyWords;
  if (words > limit) errors.push({ text: fill(M.tooLong, { count: words, limit }) });
  else if (options.learned && words > spec.learned.foldAfterWords) {
    warnings.push({ text: fill(spec.learned.foldMessage, { count: words, limit: spec.learned.foldAfterWords }) });
  }

  return { errors, warnings };
}

const isRealDate = (value: string) => {
  const time = Date.parse(`${value}T00:00:00Z`);
  return new RegExp(spec.datePattern).test(value) && !Number.isNaN(time) && new Date(time).toISOString().startsWith(value);
};

// The fact lines of another context file, without their bullet or their source: what a "replaces:" line may quote.
const factsIn = (text: string) => {
  const lines = text.split(/\r?\n/);
  return lines.slice(frontMatter(lines).end + 1).map((line) => line.trim().replace(/^(- |\d+\. )/, '').replace(/ \([^()]+\)$/, ''));
};

type Entry = { line: number; text: string; fields: Map<string, { line: number; value: string }> };

function checkLearned(lines: string[], end: number, others: string[]): Problem[] {
  const L = spec.learned;
  const problems: Problem[] = [];
  const add = (line: number, message: string | undefined, vars: Record<string, string> = {}) => problems.push({ line, text: fill(message, vars) });
  const entries: Entry[] = [];
  const header: { line: number; text: string }[] = [];
  lines.slice(end + 1).forEach((raw, i) => {
    const line = end + i + 2;
    const text = raw.trim();
    const entry = new RegExp(L.entry).exec(raw);
    const field = new RegExp(L.field).exec(raw);
    if (!text || text.startsWith('#')) return;
    if (entry) entries.push({ line, text: entry[1], fields: new Map() });
    else if (field && entries.length) {
      if (!L.fields.includes(field[1])) add(line, L.unknownFieldMessage, { field: field[1] });
      else entries.at(-1)!.fields.set(field[1], { line, value: field[2] });
    } else if (entries.length) add(line, L.strayMessage);
    else header.push({ line, text });
  });

  // A short header says what the file is, and that a person approves every entry.
  if (!new RegExp(L.header.pattern, 'i').test(header.map((h) => h.text).join(' '))) add(header[0]?.line ?? end + 2, L.header.message);

  const known = others.flatMap(factsIn);
  const replaced = new Set<string>();
  entries.forEach((e, i) => {
    if (!new RegExp(L.sentence.end).test(e.text) || new RegExp(L.sentence.second).test(e.text)) add(e.line, L.sentence.message);
    const kind = e.fields.get('kind');
    if (!kind || !new RegExp(L.kind.pattern).test(kind.value)) add(kind?.line ?? e.line, L.kind.message);
    const source = e.fields.get('source');
    const date = source && new RegExp(L.source.pattern).exec(source.value);
    if (!date) add(source?.line ?? e.line, L.source.message);
    else if (!isRealDate(date[1])) add(source!.line, L.source.dateMessage);
    const applies = e.fields.get('applies');
    if (applies && !new RegExp(L.applies.pattern).test(applies.value)) add(applies.line, L.applies.message);
    const replaces = e.fields.get('replaces');
    if (!replaces) return;
    const quote = new RegExp(L.replaces.pattern).exec(replaces.value)?.[1];
    if (!quote) return void add(replaces.line, L.replaces.message);
    // It quotes a fact in another context file, or an earlier entry here.
    const earlier = entries.slice(0, i).map((x) => x.text);
    if (![...known, ...earlier].some((fact) => fact.includes(quote))) add(replaces.line, L.replaces.notFoundMessage, { quote });
    // At most one entry stands in for any one fact.
    if (replaced.has(quote)) add(replaces.line, L.replaces.duplicateMessage, { quote });
    replaced.add(quote);
  });
  return problems;
}

export function main(args: string[]): void {
  const today = process.env.LOUPE_TODAY ? new Date(`${process.env.LOUPE_TODAY}T00:00:00Z`) : new Date();
  // Each file is checked on its own; learned.md is checked against the others given with it.
  const check = (text: string, path: string) => {
    const learned = basename(path) === spec.learned.fileName;
    const others = learned ? args.filter((p) => p !== path && p.endsWith('.md')).map((p) => readFileSync(p, 'utf8')) : [];
    return checkContext(text, today, { learned, others });
  };
  runCli(check, 'Usage: node src/check-context.ts path/to/file.md ...\nCheck learned.md together with the team\'s other context files.', args);
}

if (import.meta.main) main(process.argv.slice(2));
