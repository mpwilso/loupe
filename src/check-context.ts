// Checks a context file against the rules in spec/context-file.json.
// Three files have entries with their own fields instead of a source on every line: learned.md, the file Loupe proposes
// and a person approves (check it with the team's other context files, since its "replaces:" lines quote them);
// looks.md, the read-only looks at lower environments; and history.md, what finished stories were estimated at and took.
// Usage: node src/check-context.ts path/to/file.md ...
// Set LOUPE_TODAY=YYYY-MM-DD to check staleness against a fixed date.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { commandProblems, productionLike, type LookRules } from './look-command.ts';
import { fill, frontMatter, isRealDate, loadSpec, parseEntries, runCli, todayFromEnv, type Entry, type Problem } from './spec.ts';

type Rule = { pattern: string; message?: string };
type EntriesSpec = {
  fileName: string;
  header: Rule;
  entry: string;
  field: string;
  fields: string[];
  unknownFieldMessage?: string;
  repeatedFieldMessage?: string;
  strayMessage?: string;
};
type LearnedSpec = EntriesSpec & {
  maxBodyWords: number;
  foldAfterWords: number;
  foldMessage?: string;
  sentence: { end: string; second: string; message?: string };
  kind: Rule;
  source: Rule & { dateMessage?: string };
  applies: Rule;
  replaces: Rule & { notFoundMessage?: string; duplicateMessage?: string };
};
type LooksSpec = EntriesSpec &
  LookRules & {
    sentence: { end: string; second: string; message?: string };
    environment: Rule & { neverMessage?: string };
    run: Rule;
    fill: Record<string, string | undefined>;
    source: Rule & { dateMessage?: string };
  };
type HistorySpec = EntriesSpec & {
  duplicateMessage?: string;
  estimated: Rule & { ascendingMessage?: string };
  actual: Rule;
  source: Rule & { dateMessage?: string };
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
  looks: LooksSpec;
  history: HistorySpec;
  messages: Record<string, string>;
};

// learned: check the file as learned.md. others: the texts of the team's other context files.
// looks: check it as looks.md. history: check it as history.md.
export type ContextOptions = { learned?: boolean; looks?: boolean; history?: boolean; others?: string[] };

export const contextSpec = loadSpec<ContextSpec>('context-file.json');
let spec: ContextSpec;
let M: Record<string, string>;

// Swaps in other rules. Tests use it to switch rules off; nothing else should.
export function setContextSpec(next: ContextSpec): void {
  spec = next;
  M = spec.messages;
}
setContextSpec(contextSpec);
// The rules in use, swapped rules included, for check-look and the story checker, which share them.
export const contextRules = (): ContextSpec => spec;
const DAY = 24 * 60 * 60 * 1000;

// The options for a context file, from its name: learned.md, looks.md and history.md have their own rules.
export function contextOptions(path: string): ContextOptions {
  const name = basename(path);
  return { learned: name === spec.learned.fileName, looks: name === spec.looks.fileName, history: name === spec.history.fileName };
}

export function checkContext(text: string, today = new Date(), options: ContextOptions = {}): { errors: Problem[]; warnings: Problem[] } {
  const { errors, warnings } = findProblems(text, today, options);
  return { errors: errors.filter((p) => p.text), warnings: warnings.filter((p) => p.text) };
}

function findProblems(text: string, today: Date, options: ContextOptions): { errors: Problem[]; warnings: Problem[] } {
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  const lines = text.split(/\r?\n/);
  // An empty file holds nothing to check, and a story checker treats it as no file at all.
  if (!text.trim()) {
    errors.push({ line: 1, text: fill(M.empty) });
    return { errors, warnings };
  }

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
    if (!isSpecDate(date.value)) {
      errors.push({ line: date.line, text: fill(M.badDate, { field: spec.dateField }) });
    } else {
      const days = Math.floor((Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - time) / DAY);
      if (days > spec.staleAfterDays) warnings.push({ line: date.line, text: fill(M.stale, { date: date.value, days }) });
      // A date after today can't be when the facts were last checked.
      if (days < 0) warnings.push({ line: date.line, text: fill(M.future, { field: spec.dateField, date: date.value, today: today.toISOString().slice(0, 10) }) });
    }
  }

  // Every fact line names its own source, so a story can cite the document that holds it. Headings are exempt.
  // learned.md, looks.md and history.md name each entry's source in a field instead.
  if (options.learned) errors.push(...checkLearned(lines, end, options.others ?? []));
  else if (options.looks) errors.push(...checkLooks(lines, end));
  else if (options.history) errors.push(...checkHistory(lines, end));
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

// A date in the spec's own form, like 2026-09-22, that is also a real day.
const isSpecDate = (value: string) => new RegExp(spec.datePattern).test(value) && isRealDate(value);

// The fact lines of another context file, without their bullet or their source: what a "replaces:" line may quote.
const factsIn = (text: string) => {
  const lines = text.split(/\r?\n/);
  return lines.slice(frontMatter(lines).end + 1).map((line) => line.trim().replace(/^(- |\d+\. )/, '').replace(/ \([^()]+\)$/, ''));
};

type Add = (line: number, message: string | undefined, vars?: Record<string, string | number>) => void;

// The parts every file of entries shares: the header line, the fields each entry may have, and stray lines.
function entriesOf(lines: string[], end: number, rule: EntriesSpec, add: Add): Entry[] {
  const { header, entries, unknown, repeated, stray } = parseEntries(lines, end, rule);
  for (const { line, field } of unknown) add(line, rule.unknownFieldMessage, { field });
  for (const { line, field } of repeated) add(line, rule.repeatedFieldMessage, { field });
  for (const line of stray) add(line, rule.strayMessage);
  if (!new RegExp(rule.header.pattern, 'i').test(header.map((h) => h.text).join(' '))) add(header[0]?.line ?? end + 2, rule.header.message);
  return entries;
}

// One plain sentence, ending with a period and holding no second one.
const oneSentence = (text: string, rule: { end: string; second: string }) => new RegExp(rule.end).test(text) && !new RegExp(rule.second).test(text);

// A source field with a date at its end, in the rule's form, that is a real day.
function checkSource(entry: Entry, rule: Rule & { dateMessage?: string }, add: Add): void {
  const source = entry.fields.get('source');
  const date = source && new RegExp(rule.pattern).exec(source.value);
  if (!date) add(source?.line ?? entry.line, rule.message);
  else if (!isSpecDate(date[1])) add(source!.line, rule.dateMessage);
}

function checkLearned(lines: string[], end: number, others: string[]): Problem[] {
  const L = spec.learned;
  const problems: Problem[] = [];
  const add: Add = (line, message, vars = {}) => problems.push({ line, text: fill(message, vars) });
  const entries = entriesOf(lines, end, L, add);

  const known = others.flatMap(factsIn);
  const replaced = new Set<string>();
  entries.forEach((e, i) => {
    if (!oneSentence(e.text, L.sentence)) add(e.line, L.sentence.message);
    const kind = e.fields.get('kind');
    if (!kind || !new RegExp(L.kind.pattern).test(kind.value)) add(kind?.line ?? e.line, L.kind.message);
    checkSource(e, L.source, add);
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

// looks.md: each look is one sentence saying what it shows, the lower environment it reads, the exact command, and
// who gave it. The environment is refused when a part of its name is a production word, like prod1 or PROD_US. The
// command must be one read from the short list in src/look-command.ts. Both check names and forms, not proof: a host
// named staging can point anywhere, so a person reads every look, and Claude Code asks before each one runs.
function checkLooks(lines: string[], end: number): Problem[] {
  const L = spec.looks;
  const problems: Problem[] = [];
  const add: Add = (line, message, vars = {}) => problems.push({ line, text: fill(message, vars) });
  for (const e of entriesOf(lines, end, L, add)) {
    if (!oneSentence(e.text, L.sentence)) add(e.line, L.sentence.message);
    const environment = e.fields.get('environment');
    if (!environment || !new RegExp(L.environment.pattern).test(environment.value)) add(environment?.line ?? e.line, L.environment.message);
    else if (productionLike(environment.value, L.productionWords)) add(environment.line, L.environment.neverMessage, { value: environment.value });
    const run = e.fields.get('run');
    if (!run || !new RegExp(L.run.pattern).test(run.value)) add(run?.line ?? e.line, L.run.message);
    else for (const problem of commandProblems(run.value, L, true)) problems.push({ line: run.line, text: problem });
    checkSource(e, L.source, add);
  }
  return problems;
}

// history.md: each entry is a finished story's title, the range it was estimated at, the hours it took, and where
// the hours came from.
function checkHistory(lines: string[], end: number): Problem[] {
  const H = spec.history;
  const problems: Problem[] = [];
  const add: Add = (line, message, vars = {}) => problems.push({ line, text: fill(message, vars) });
  const titles = new Set<string>();
  for (const e of entriesOf(lines, end, H, add)) {
    // A Calibration line names a past story by its title, so no two entries share one.
    if (titles.has(e.text)) add(e.line, H.duplicateMessage, { title: e.text });
    titles.add(e.text);
    const estimated = e.fields.get('estimated');
    const range = estimated && new RegExp(H.estimated.pattern).exec(estimated.value);
    if (!range) add(estimated?.line ?? e.line, H.estimated.message);
    else if (Number(range[1]) > Number(range[2])) add(estimated!.line, H.estimated.ascendingMessage, { low: range[1], high: range[2] });
    const actual = e.fields.get('actual');
    if (!actual || !new RegExp(H.actual.pattern).test(actual.value)) add(actual?.line ?? e.line, H.actual.message);
    checkSource(e, H.source, add);
  }
  return problems;
}

export type HistoryEntry = { title: string; low: number; high: number; actual: number };

// The entries of a history.md that the story checker can compare a Calibration line with. Entries that don't fit the
// rules are left out; check-context reports them. A file with no front matter, an empty one included, is no history
// at all, so the story checker treats it as no file.
export function historyEntries(text: string): HistoryEntry[] | undefined {
  const H = spec.history;
  const lines = text.split(/\r?\n/);
  const { end } = frontMatter(lines);
  if (end < 0) return undefined;
  return parseEntries(lines, end, H).entries.flatMap((e) => {
    const range = new RegExp(H.estimated.pattern).exec(e.fields.get('estimated')?.value ?? '');
    const actual = new RegExp(H.actual.pattern).exec(e.fields.get('actual')?.value ?? '');
    return range && actual ? [{ title: e.text, low: Number(range[1]), high: Number(range[2]), actual: Number(actual[1]) }] : [];
  });
}

// The environments a team's looks.md lists, for the story checker's look sources. A file with no front matter lists none
// that can be trusted, so it counts as no file.
export function lookEnvironments(text: string): string[] | undefined {
  const lines = text.split(/\r?\n/);
  const { end } = frontMatter(lines);
  if (end < 0) return undefined;
  return parseEntries(lines, end, spec.looks).entries.flatMap((e) => e.fields.get('environment')?.value.trim() || []);
}

// Whether a name is like production, by the looks rules in use.
export const productionName = (name: string) => productionLike(name, spec.looks.productionWords);

export function main(args: string[]): void {
  const today = todayFromEnv();
  // Each file is checked on its own; learned.md is checked against the others given with it.
  const check = (text: string, path: string) => {
    const options = contextOptions(path);
    const others = options.learned ? args.filter((p) => p !== path && p.endsWith('.md')).map((p) => readFileSync(p, 'utf8')) : [];
    return checkContext(text, today, { ...options, others });
  };
  runCli(check, 'Usage: node src/check-context.ts path/to/file.md ...\nCheck learned.md together with the team\'s other context files.', args);
}

if (import.meta.main) main(process.argv.slice(2));
