// Checks a story, or a "Not ready yet" response, against the rules in spec/.
// Usage: node src/check.ts path/to/story.md
import { escapeRegExp, fill, loadSpec, runCli, type Problem } from './spec.ts';

type LineRule = {
  pattern: string;
  message: string;
  ascending?: [number, number];
  ascendingMessage?: string;
  listOf?: 'items';
  separator?: string;
  unknownMessage?: string;
};
type Section = {
  heading: string;
  name: string;
  kind: 'text' | 'list' | 'lines';
  allowNone?: boolean;
  itemPattern?: string;
  itemMessage?: string;
  lines?: LineRule[];
  forms?: { name: string; lines: string[] }[];
};
type Shape = { title: { pattern: string; message: string }; preamble?: LineRule[]; sections: Section[] };
type StoryShape = Shape & { listItem: string; maxListItems: number; none: string; messages: Record<string, string> };
type Readiness = { items: { id: string; label: string }[]; notReady: Shape };
type PlainLanguage = {
  bannedCharacters: { char: string; message: string }[];
  bannedPhrases: { match: string; flags: string; message: string; list: string[] };
  acronyms: { match: string; spelledOut: string[]; allow: string[]; message: string };
  sentences: { split: string; maxWords: number; message: string };
};
type Entry = { line: number; text: string };

const story = loadSpec<StoryShape>('story-shape.json');
const readiness = loadSpec<Readiness>('readiness.json');
const plain = loadSpec<PlainLanguage>('plain-language.json');
const M = story.messages;
const listItem = new RegExp(story.listItem);

export function check(text: string): { errors: Problem[]; warnings: Problem[] } {
  const lines = text.split(/\r?\n/);
  const shape = new RegExp(readiness.notReady.title.pattern).test(lines[0] ?? '') ? readiness.notReady : story;
  return { errors: [...checkShape(lines, shape), ...checkPlainLanguage(lines)], warnings: [] };
}

function checkShape(lines: string[], shape: Shape): Problem[] {
  const problems: Problem[] = [];
  const add = (line: number | undefined, message: string) => problems.push({ line, text: message });
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
    checkSection(shape.sections[index], block.line, block.body, add);
  }
  for (const section of shape.sections) {
    if (!seen.has(section.heading)) add(undefined, fill(M.missingSection, { heading: section.heading }));
  }
  return problems;
}

type Add = (line: number | undefined, message: string) => void;

function checkSection(section: Section, headingLine: number, body: Entry[], add: Add): void {
  const { name } = section;
  if (body.length === 0) {
    add(headingLine, fill(section.allowNone ? M.emptyNoneAllowed : M.emptySection, { name }));
    return;
  }
  checkListLengths(name, body, add);

  if (section.kind === 'text' && section.forms) {
    const fits = section.forms.some((form) =>
      form.lines.every((pattern) => body.some((entry) => new RegExp(pattern).test(entry.text))),
    );
    if (!fits) {
      const names = section.forms.map((f) => f.name);
      add(headingLine, fill(M.noForm, { forms: `${names.slice(0, -1).join(', ')} or ${names.at(-1)}` }));
    }
  } else if (section.kind === 'list') {
    const none = body.find((entry) => entry.text === story.none);
    if (none && !section.allowNone) add(none.line, fill(M.noneNotAllowed, { name }));
    else if (none && body.length > 1) add(none.line, fill(M.noneMixed, { name }));
    else if (!none) {
      for (const entry of body) {
        if (!listItem.test(entry.text)) add(entry.line, fill(M.notAListItem, { name }));
        else if (section.itemPattern && !new RegExp(section.itemPattern).test(entry.text)) {
          add(entry.line, section.itemMessage ?? '');
        }
      }
    }
  } else if (section.kind === 'lines' && section.lines) {
    checkLines(body, section.lines, name, headingLine, add);
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
function checkLines(body: Entry[], rules: LineRule[], name: string, anchor: number, add: Add): void {
  let next = 0;
  rules.forEach((rule, i) => {
    const entry = body[next];
    const match = entry && new RegExp(rule.pattern).exec(entry.text);
    if (!entry || !match) {
      add(entry?.line ?? anchor, rule.message);
      const fitsLater = entry && rules.slice(i + 1).some((r) => new RegExp(r.pattern).test(entry.text));
      if (entry && !fitsLater) next++;
      return;
    }
    next++;
    if (rule.ascending) {
      const [low, high] = rule.ascending.map((group) => Number(match[group]));
      if (low > high) add(entry.line, fill(rule.ascendingMessage ?? '', { low, high }));
    }
    if (rule.listOf) {
      const labels = readiness[rule.listOf].map((item) => item.label);
      for (const item of match[1].split(rule.separator ?? ', ')) {
        if (!labels.includes(item)) add(entry.line, fill(rule.unknownMessage ?? '', { item, labels: labels.join(', ') }));
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
      if (text.includes(banned.char)) problems.push({ line, text: banned.message });
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
  return problems;
}

if (import.meta.main) runCli(check, 'Usage: node src/check.ts path/to/story.md');
