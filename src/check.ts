// Checks a story, or a "Not ready yet" response, against the rules in spec/.
// A file that starts with front matter is a template: its own example must fit its own patterns.
// A team's own templates live in a templates folder next to its context folder, found from the story's path.
// Usage: node src/check.ts [--templates <folder>] path/to/story.md ...
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { escapeRegExp, fill, format, frontMatter, loadSpec, runCli, type Problem } from './spec.ts';

type LineRule = {
  pattern: string;
  message?: string;
  ascending?: [number, number];
  ascendingMessage?: string;
  listOf?: 'items';
  separator?: string;
  unknownMessage?: string;
  placeholder?: string;
  placeholderMessage?: string;
};
type Section = {
  heading: string;
  name: string;
  kind: 'template' | 'list' | 'lines';
  allowNone?: boolean;
  itemPattern?: string;
  itemMessage?: string;
  lines?: LineRule[];
  questionMarks?: { count: number; message: string };
  overflow?: { line: string; message: string; confidence: string; notLevel: string; confidenceMessage: string; unknown: string; unknownMessage?: string };
};
type Closing = { pattern: string; message?: string; separator: string; max: number; maxMessage?: string };
type Shape = { title: { pattern: string; message?: string }; preamble?: LineRule[]; sections: Section[]; closing?: Closing };
type StoryShape = Shape & {
  listItem: string;
  maxListItems: number;
  none: string;
  unchecked: { pattern: string; message?: string };
  failed: { pattern: string; message?: string };
  chatOnly: { pattern: string; message?: string };
  summary: {
    lines: LineRule[];
    calls: { story: string; notReady: string; unchecked: string; failed: string };
    callMessage?: string;
    noStory: string;
    noStoryMessage?: string;
    levelMessage?: string;
    questions: { story: string; notReady: string };
    questionMessage?: string;
  };
  templates: { folder: string; fields: Record<string, string> };
  messages: Record<string, string>;
  errors: Record<string, string>;
};
export type Template = { name: string; patterns: string[] };
type Readiness = { items: { id: string; label: string }[]; notReady: Shape & { detect: string } };
type PlainLanguage = {
  bannedCharacters: { char: string; message?: string }[];
  bannedPhrases: { match: string; flags: string; message: string; list: string[] };
  acronyms: { match: string; spelledOut: string[]; allow: string[]; message: string };
  sentences: { split: string; maxWords: number; message: string };
};
type Entry = { line: number; text: string };

export type Specs = { story: StoryShape; readiness: Readiness; plain: PlainLanguage };
export const specs: Specs = {
  story: loadSpec('story-shape.json'),
  readiness: loadSpec('readiness.json'),
  plain: loadSpec('plain-language.json'),
};
let story: StoryShape;
let readiness: Readiness;
let plain: PlainLanguage;
let M: Record<string, string>;
let listItem: RegExp;

// Swaps in other rules. Tests use it to switch rules off; nothing else should.
export function setSpecs(next: Specs): void {
  ({ story, readiness, plain } = next);
  M = story.messages;
  listItem = new RegExp(story.listItem);
}
setSpecs(specs);

// Reads a template file's front matter. A template is its name plus the patterns its story lines must match.
export function readTemplate(text: string): { template?: Template; end: number; problems: Problem[] } {
  const { end, fields } = frontMatter(text.split(/\r?\n/));
  const problems: Problem[] = [];
  const name = fields.get('name')?.value;
  const patterns = fields.get('patterns')?.items ?? [];
  for (const [field, help] of Object.entries(story.templates.fields)) {
    if (field === 'name' ? !name : !patterns.length) {
      problems.push({ line: fields.get(field)?.line ?? 1, text: fill(M.templateMissingField, { field, help }) });
    }
  }
  for (const pattern of patterns) {
    try {
      new RegExp(pattern);
    } catch {
      problems.push({ line: fields.get('patterns')?.line, text: fill(M.templateBadPattern, { pattern }) });
    }
  }
  return { template: problems.length || !name ? undefined : { name, patterns }, end, problems: problems.filter((p) => p.text) };
}

// Loads every template in a folder. Markdown files without front matter, like the definition of ready, are skipped.
export function loadTemplates(folder: string): Template[] {
  let files: string[];
  try {
    files = readdirSync(folder).filter((f) => f.endsWith('.md')).sort();
  } catch {
    throw new Error(fill(story.errors.templateFolder, { folder }));
  }
  const templates: Template[] = [];
  for (const file of files) {
    const { template, end, problems } = readTemplate(readFileSync(join(folder, file), 'utf8'));
    if (end < 0) continue;
    if (!template) throw new Error(problems.map((p) => `${join(folder, file)}: ${format(p)}`).join('\n'));
    templates.push(template);
  }
  return templates;
}

// Walks up from the story to the nearest folder holding a context folder, and returns its templates folder if there is one.
export function findTeamTemplates(storyPath: string): string | undefined {
  for (let dir = dirname(storyPath); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'context'))) {
      const folder = join(dir, 'templates');
      return existsSync(folder) ? folder : undefined;
    }
    if (dirname(dir) === dir) return undefined;
  }
}

export const builtInFolder = fileURLToPath(new URL(`../${specs.story.templates.folder}/`, import.meta.url));
const builtIn = loadTemplates(builtInFolder);

export function check(text: string, templates = builtIn): { errors: Problem[]; warnings: Problem[] } {
  let lines = text.split(/\r?\n/);
  let offset = 0;
  if (lines[0]?.trim() === '---') {
    const { template, end, problems } = readTemplate(text);
    if (!template) return { errors: problems, warnings: [] };
    templates = [template];
    offset = end + 1;
    lines = lines.slice(offset);
  }
  // A story or response starts with three summary lines and a blank line. A template has none.
  const found: Problem[] = [];
  const add = (line: number | undefined, message = '') => void (message && found.push({ line, text: message }));
  const hasSummary = !offset && lines.slice(0, 3).some((line) => /^(Call|Confidence|First question): /.test(line));
  if (!offset && !hasSummary) add(1, story.summary.lines[0].message);
  const head = hasSummary ? lines.slice(3).findIndex((line) => line.trim()) + 3 : 0;
  const summary = lines.slice(0, hasSummary ? 3 : 0).map((text, i) => ({ line: i + 1, text: text.trim() }));
  // "Checked with Node" is for the chat. In the file it is reported, then blanked so the shape is judged without it.
  const chatOnly = new RegExp(story.chatOnly.pattern);
  const chat = lines.flatMap((text, i) => (i >= head && chatOnly.test(text) ? [{ line: i + 1, text: story.chatOnly.message ?? '' }] : []));
  const body = lines.slice(head).map((text) => (chatOnly.test(text) ? '' : text));

  // A draft marked "Not checked:" or "Failed the checker after five runs:" can never pass. When the mark is the first line, the rest is checked as usual.
  const kinds = { unchecked: story.unchecked, failed: story.failed } as const;
  const marks = body.flatMap((text, i) =>
    Object.entries(kinds).flatMap(([kind, rule]) => (new RegExp(rule.pattern).test(text) ? [{ line: i + 1, text: rule.message ?? '', kind }] : [])),
  );
  const skip = marks[0]?.line === 1 ? 1 : 0;
  const mark = skip ? (marks[0].kind as keyof typeof kinds) : undefined;
  const rest = body.slice(skip);
  const notReady = new RegExp(readiness.notReady.detect, 'i').test(rest[0] ?? '');
  const shape = notReady ? readiness.notReady : story;
  if (hasSummary) checkLines(summary, story.summary.lines, 'The summary', 1, add);
  if (hasSummary) checkSummary(summary, rest, notReady, mark, add);
  const inBody = [...marks.map(({ line, text }) => ({ line, text })), ...checkShape(rest, shape, templates, offset > 0).map((e) => (e.line ? { ...e, line: e.line + skip } : e))];
  const errors = [...found, ...chat.filter((e) => e.text), ...inBody.filter((e) => e.text).map((e) => (e.line ? { ...e, line: e.line + head } : e)), ...checkPlainLanguage(lines)];
  return { errors: errors.map((e) => (e.line ? { ...e, line: e.line + offset } : e)), warnings: [] };
}

function checkShape(lines: string[], shape: Shape, templates: Template[], template: boolean): Problem[] {
  const problems: Problem[] = [];
  const add = (line: number | undefined, message = '') => void (message && problems.push({ line, text: message }));
  if (!new RegExp(shape.title.pattern).test(lines[0] ?? '')) add(1, shape.title.message);

  const preamble: Entry[] = [];
  const blocks: { heading: string; line: number; body: Entry[] }[] = [];
  lines.forEach((raw, i) => {
    const text = raw.trim();
    if (i === 0 || !text) return;
    if (text.startsWith('# ')) add(i + 1, M.extraTitle);
    else if (text.startsWith('## ')) blocks.push({ heading: text, line: i + 1, body: [] });
    else (blocks.at(-1)?.body ?? preamble).push({ line: i + 1, text });
  });

  // A story ends with one "Before release:" line after its last section.
  if (shape.closing) {
    const last = blocks.at(-1)?.body.at(-1);
    if (last && new RegExp(shape.closing.pattern).test(last.text)) {
      blocks.at(-1)?.body.pop();
      const count = last.text.replace(/^[^:]*: /, '').split(shape.closing.separator).length;
      if (count > shape.closing.max) add(last.line, fill(shape.closing.maxMessage, { count, max: shape.closing.max }));
    } else add(undefined, shape.closing.message);
  }

  if (shape.preamble) checkLines(preamble, shape.preamble, 'The top', 1, add);
  else if (preamble.length) add(preamble[0].line, M.strayText);

  const order = shape.sections.map((s) => `"${s.heading}"`).join(', ');
  const seen = new Set<string>();
  let furthest = -1;
  for (const block of blocks) {
    const index = shape.sections.findIndex((s) => s.heading === block.heading);
    if (index < 0) {
      add(block.line, fill(M.unknownSection, { heading: block.heading, order }));
      continue;
    }
    if (seen.has(block.heading)) {
      add(block.line, fill(M.duplicateSection, { heading: block.heading }));
      continue;
    }
    seen.add(block.heading);
    if (index < furthest) add(block.line, fill(M.outOfOrder, { heading: block.heading, order }));
    furthest = Math.max(furthest, index);
    checkSection(shape.sections[index], block.line, block.body, templates, template, add);
  }
  for (const section of shape.sections) {
    if (!seen.has(section.heading)) add(undefined, fill(M.missingSection, { heading: section.heading }));
  }
  checkOverflow(shape, blocks, add);
  return problems;
}

type Add = (line: number | undefined, message?: string) => void;

// The summary must agree with what follows: the call, the confidence level and the first question.
function checkSummary(summary: Entry[], rest: string[], notReady: boolean, mark: 'unchecked' | 'failed' | undefined, add: Add): void {
  const S = story.summary;
  const [call, confidence, question] = summary.map((entry) => entry.text.replace(/^[^:]*: /, ''));
  const expected = mark ? S.calls[mark] : notReady ? S.calls.notReady : S.calls.story;
  const marked = { unchecked: 'an unchecked draft', failed: 'a draft that failed the checker' };
  const what = mark ? marked[mark] : notReady ? 'a "Not ready yet" response' : 'a story';
  if (Object.values(S.calls).includes(call) && call !== expected) add(1, fill(S.callMessage, { call, what, expected }));

  const after = (heading: string) => rest.slice(rest.findIndex((line) => line.trim() === heading) + 1).find((line) => line.trim())?.trim();
  if (notReady && confidence !== S.noStory && summary[1]?.text.startsWith('Confidence: ')) add(2, S.noStoryMessage);
  const levelRule = story.sections.find((s) => s.heading === '## Confidence')?.lines?.[0];
  const found = notReady ? undefined : after('## Confidence');
  const level = found && levelRule && new RegExp(levelRule.pattern).test(found) ? found : undefined;
  if (level && summary[1]?.text.startsWith('Confidence: ') && !confidence.startsWith(`${level}, `)) add(2, fill(S.levelMessage, { level }));

  const heading = notReady ? S.questions.notReady : S.questions.story;
  const first = rest.some((line) => line.trim() === heading) ? after(heading)?.replace(listItem, '') : undefined;
  if (first && summary[2]?.text.startsWith('First question: ') && question !== first) add(3, fill(S.questionMessage, { heading }));
}

// A list may end with one fixed line saying more questions are open than fit. It needs a full list, and rules out top confidence.
function checkOverflow(shape: Shape, blocks: { heading: string; body: Entry[] }[], add: Add): void {
  for (const section of shape.sections) {
    const rule = section.overflow;
    const body = blocks.find((b) => b.heading === section.heading)?.body;
    const at = body?.findIndex((entry) => entry.text === rule?.line) ?? -1;
    if (!rule || !body || at < 0) continue;
    const items = body.filter((entry) => listItem.test(entry.text)).length;
    if (at !== body.length - 1 || items < story.maxListItems) add(body[at].line, rule.message);
    const heading = shape.sections.find((s) => s.name === rule.confidence)?.heading;
    const level = blocks.find((b) => b.heading === heading)?.body[0];
    if (level?.text === rule.notLevel) add(level.line, rule.confidenceMessage);
    const unknownHeading = shape.sections.find((s) => s.name === rule.unknown)?.heading;
    const unknown = blocks.find((b) => b.heading === unknownHeading)?.body[0];
    if (unknown?.text === story.none) add(unknown.line, rule.unknownMessage);
  }
}

function checkSection(section: Section, headingLine: number, body: Entry[], templates: Template[], template: boolean, add: Add): void {
  const { name } = section;
  if (body.length === 0) {
    add(headingLine, fill(section.allowNone ? M.emptyNoneAllowed : M.emptySection, { name }));
    return;
  }
  checkListLengths(name, body, add);

  if (section.kind === 'template') {
    const fits = templates.some((t) => t.patterns.every((p) => body.some((entry) => new RegExp(p).test(entry.text))));
    if (!fits) {
      const names = templates.map((t) => t.name);
      const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names.join('');
      add(headingLine, fill(M.noTemplate, { names: list }));
    }
  } else if (section.kind === 'list') {
    body = body.filter((entry) => entry.text !== section.overflow?.line);
    const none = body.find((entry) => entry.text === story.none);
    if (none && !section.allowNone) add(none.line, fill(M.noneNotAllowed, { name }));
    else if (none && body.length > 1) add(none.line, fill(M.noneMixed, { name }));
    else if (!none) {
      for (const entry of body) {
        if (!listItem.test(entry.text)) add(entry.line, fill(M.notAListItem, { name }));
        else if (section.itemPattern && !new RegExp(section.itemPattern).test(entry.text)) {
          add(entry.line, section.itemMessage);
        } else if (section.questionMarks) {
          const marks = entry.text.split('?').length - 1;
          if (marks !== section.questionMarks.count) add(entry.line, fill(section.questionMarks.message, { name, count: marks }));
        }
      }
    }
  } else if (section.kind === 'lines' && section.lines) {
    checkLines(body, section.lines, name, headingLine, add, template);
  }
}

// Every run of list items, in any section, stays within the limit.
function checkListLengths(name: string, body: Entry[], add: Add): void {
  let start = 0;
  let count = 0;
  for (const entry of [...body, { line: 0, text: '' }]) {
    if (listItem.test(entry.text)) {
      if (count === 0) start = entry.line;
      count++;
      continue;
    }
    if (count > story.maxListItems) add(start, fill(M.tooManyItems, { name, count, limit: story.maxListItems }));
    count = 0;
  }
}

// Walks the rules in order. A line that fits a later rule means this rule's line is missing.
// A rule without a message is switched off: it takes any line that doesn't belong to a later rule.
// In a template, a line with a placeholder must hold a bracketed placeholder, never a value.
function checkLines(body: Entry[], rules: LineRule[], name: string, anchor: number, add: Add, template = false): void {
  let next = 0;
  rules.forEach((rule, i) => {
    const entry = body[next];
    if (template && rule.placeholder && entry && (/^\[.+\]$/.test(entry.text) || new RegExp(rule.pattern).test(entry.text))) {
      if (!/^\[.+\]$/.test(entry.text)) add(entry.line, rule.placeholderMessage);
      next++;
      return;
    }
    const match = entry && new RegExp(rule.pattern).exec(entry.text);
    if (!entry || !match || !rule.message) {
      add(entry?.line ?? anchor, rule.message);
      const fitsLater = entry && rules.slice(i + 1).some((r) => new RegExp(r.pattern).test(entry.text));
      if (entry && !fitsLater) next++;
      return;
    }
    next++;
    if (rule.ascending) {
      const [low, high] = rule.ascending.map((group) => Number(match[group]));
      if (low > high) add(entry.line, fill(rule.ascendingMessage, { low, high }));
    }
    if (rule.listOf) {
      const labels = readiness[rule.listOf].map((item) => item.label);
      for (const item of match[1].split(rule.separator ?? ', ')) {
        if (!labels.includes(item)) add(entry.line, fill(rule.unknownMessage, { item, labels: labels.join(', ') }));
      }
    }
  });
  if (body.length > next) add(body[next].line, fill(M.extraLine, { name, count: rules.length }));
}

function checkPlainLanguage(lines: string[]): Problem[] {
  const problems: Problem[] = [];
  const { bannedPhrases: phrases, acronyms, sentences } = plain;
  const phraseRules = phrases.list.map((phrase) => ({
    phrase,
    re: new RegExp(fill(phrases.match, { phrase: escapeRegExp(phrase) }), phrases.flags),
  }));
  const seenAcronyms = new Set(acronyms.allow);

  lines.forEach((text, i) => {
    const line = i + 1;
    for (const banned of plain.bannedCharacters) {
      if (text.includes(banned.char)) problems.push({ line, text: banned.message ?? '' });
    }
    for (const { phrase, re } of phraseRules) {
      if (re.test(text)) problems.push({ line, text: fill(phrases.message, { phrase }) });
    }
    for (const match of text.matchAll(new RegExp(acronyms.match, 'g'))) {
      const acronym = match[1];
      if (seenAcronyms.has(acronym)) continue;
      seenAcronyms.add(acronym);
      const spelled = acronyms.spelledOut.some((t) => new RegExp(fill(t, { acronym })).test(text));
      if (!spelled) problems.push({ line, text: fill(acronyms.message, { acronym }) });
    }
    for (const sentence of text.split(new RegExp(sentences.split))) {
      const count = sentence.split(/\s+/).filter((word) => /[\p{L}\p{N}]/u.test(word)).length;
      if (count > sentences.maxWords) {
        problems.push({ line, text: fill(sentences.message, { count, limit: sentences.maxWords }) });
      }
    }
  });
  return problems.filter((p) => p.text);
}

export function main(args: string[]): void {
  const usage = [
    'Usage: node src/check.ts [--templates <folder>] path/to/story.md ...',
    'Fix every line it reports and run it again, up to five runs.',
    'If it still fails after five runs, show the draft under "Failed the checker after five runs:" and the remaining messages.',
    '"Not checked:" is only for when the checker can\'t start or Node is too old.',
  ].join('\n');
  const onFail = 'Fix every line above and run the checker again. After five failed runs, show the draft under "Failed the checker after five runs:" and these messages.';
  try {
    const { values, positionals } = parseArgs({ args, options: { templates: { type: 'string', multiple: true } }, allowPositionals: true });
    const override = values.templates && [...builtIn, ...values.templates.flatMap(loadTemplates)];
    const forStory = (path: string) => {
      const folder = findTeamTemplates(path);
      return folder ? [...builtIn, ...loadTemplates(folder)] : builtIn;
    };
    runCli((text, path) => check(text, override ?? forStory(path)), usage, positionals, onFail);
  } catch (error) {
    console.error((error as Error).message);
    process.exit(2);
  }
}

if (import.meta.main) main(process.argv.slice(2));
