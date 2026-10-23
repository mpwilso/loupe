// Checks loupe/tickets.md, the list of tickets Loupe created: one line per ticket, naming its key, the story it
// came from and when it was created. The story must exist and be finished, and no story or key appears twice.
import { fill, isRealDate, loadSpec, type Problem } from './spec.ts';
import { storyShape } from './check.ts';

type TicketsSpec = {
  fileName: string;
  line: { pattern: string; message?: string };
  badTimeMessage?: string;
  noStoryMessage?: string;
  notWrittenMessage?: string;
  duplicateKeyMessage?: string;
  duplicateStoryMessage?: string;
};
export let ticketsSpec = loadSpec<TicketsSpec>('tickets.json');
export const setTicketsSpec = (next: TicketsSpec) => void (ticketsSpec = next);

// stories: each story file's name, and its text.
export function checkTickets(text: string, stories: Map<string, string>): { errors: Problem[]; warnings: Problem[] } {
  const rule = ticketsSpec;
  // The key is the same tracker key the story checker looks for.
  const pattern = new RegExp(fill(rule.line.pattern, { key: storyShape().liveSource.key }));
  // A finished story's first line, the same call the story checker requires.
  const written = `Call: ${storyShape().summary.calls.story}`;
  const errors: Problem[] = [];
  const add = (line: number, message?: string) => void (message && errors.push({ line, text: message }));
  const keys = new Map<string, number>();
  const files = new Map<string, string>();
  text.split(/\r?\n/).forEach((raw, i) => {
    const line = i + 1;
    if (!raw.trim()) return;
    const match = pattern.exec(raw.trim());
    if (!match) return add(line, rule.line.message);
    const [, key, file, date] = match;
    if (!isRealDate(date)) add(line, rule.badTimeMessage);
    const story = stories.get(file);
    if (story === undefined) add(line, fill(rule.noStoryMessage, { file }));
    else if (story.split(/\r?\n/)[0]?.trim() !== written) add(line, fill(rule.notWrittenMessage, { file, call: written }));
    if (keys.has(key)) add(line, fill(rule.duplicateKeyMessage, { key }));
    else if (files.has(file)) add(line, fill(rule.duplicateStoryMessage, { file, key: files.get(file)! }));
    keys.set(key, line);
    if (!files.has(file)) files.set(file, key);
  });
  return { errors, warnings: [] };
}
