// Every input that must fail a checker: the files under fixtures/bad and fixtures/warn, plus a few built here.
import { readdirSync, readFileSync } from 'node:fs';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { checkTickets } from '../src/check-tickets.ts';
import type { Problem } from '../src/spec.ts';

const dir = new URL('fixtures/', import.meta.url);
export const fixture = (name: string) => readFileSync(new URL(name, dir), 'utf8');
const files = (folder: string) => readdirSync(new URL(folder, dir)).filter((f) => f.endsWith('.md')).map((f) => `${folder}${f}`);
export const today = new Date('2026-09-30T00:00:00Z');

// Fake secrets are built here while the test runs, so no file ever holds one and push protection never sees one.
const mix = (length: number) => Array.from({ length }, (_, i) => 'Zq7Xk2Lm9Pw4Rt8Vn3Bc6Hd1Jf5Gs0Ya'[(i * 7) % 32]).join('');
export const withLine = (line: string) => `${fixture('good-context.md')}${line} (engineering lead, 2026-09-01)\n`;
export const shortLookalikes = [
  'The ghp_ prefix marks a GitHub token.',
  'Keys start with sk- and are long.',
  'Short ids like ' + 'ghp_' + mix(10) + ' or ' + 'sk-' + mix(10) + ' are fine.',
  'The stock code AKIA' + mix(8).toUpperCase() + ' is too short.',
];
export const secrets: [string, string][] = [
  ['a cloud access key', 'AKIA' + mix(16).toUpperCase()],
  ['an API key', 'sk-' + mix(48)],
  ['an API key', 'sk-proj-' + mix(40)],
  ['an API key', 'AIza' + mix(35)],
  ['a GitHub token', 'ghp_' + mix(36)],
  ['a GitHub token', 'gho_' + mix(36)],
  ['a GitHub token', 'github_pat_' + mix(22) + '_' + mix(59)],
  ['a Slack token', 'xoxb-' + mix(12) + '-' + mix(24)],
];
export const secretLine = (value: string) => `The staging key is ${value} if you need it.`;

// An em dash can't live in a tracked file, so that fixture is built here too.
export const emDash = () => fixture('good-story.md').replace('Nothing needed.', 'Nothing\u2014needed.');

const story = (text: string) => check(text).errors;
const context = (text: string, date = today) => {
  const { errors, warnings } = checkContext(text, date);
  return [...errors, ...warnings];
};
// learned.md is checked with the team's other context files, which its "replaces:" lines quote.
export const learnedOptions = () => ({ learned: true, others: [fixture('good-context.md')] });
export const learned = (text: string) => {
  const { errors, warnings } = checkContext(text, today, learnedOptions());
  return [...errors, ...warnings];
};

// looks.md and history.md have entries with fields, like learned.md.
export const looks = (text: string) => {
  const { errors, warnings } = checkContext(text, today, { looks: true });
  return [...errors, ...warnings];
};
export const history = (text: string) => {
  const { errors, warnings } = checkContext(text, today, { history: true });
  return [...errors, ...warnings];
};
// A story checked against the team's history, as check-folder checks it: its Calibration line is verified.
export const calibrated = (text: string) => check(text, undefined, { history: fixture('good-history.md') }).errors;
export const lookStory = () => fixture('good-look-story.md');
const calibration = 'Calibration: "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated.';
export const calibrationCases: [string, string][] = [
  ['a Calibration line saying there is no history file, for a team with one', lookStory().replace(calibration, 'Calibration: none, the team has no history file.')],
  ['a Calibration line naming a story that is not in history.md', lookStory().replace('Send a reminder email two days before the cutoff', 'Send a reminder email')],
  ['a Calibration line with other numbers than history.md', lookStory().replace('took 7 hours', 'took 9 hours')],
];
// One command per sign of a write, each put in place of a clean look.
export const writeSigns: [string, string][] = [
  ['a request method that writes', 'curl -s -X POST http://localhost:8765/subscribers/{subscriber}/next-box'],
  ['data sent with the request', 'curl -s --data skipped=true http://localhost:8765/subscribers/{subscriber}/next-box'],
  ['a database statement that writes', 'psql postgresql://localhost/pellwick_test -c "UPDATE orders SET status = 1"'],
  ['a command that changes files', 'cat notes.txt | tee copy.txt'],
  ['an edit in place', 'sed -i s/a/b/ notes.txt'],
  ['output sent to a file', 'curl -s http://localhost:8765/subscribers/{subscriber}/boxes > boxes.json'],
  ['a git command that changes a repository', 'git push origin staging'],
];
export const withRun = (run: string) => fixture('good-looks.md').replace('run: curl -s http://localhost:8765/subscribers/{subscriber}/next-box', `run: ${run}`);

// tickets.md is checked against the stories in the folder: two finished stories and one "Not ready yet".
export const ticketStories = () =>
  new Map([
    ['2026-10-02-skip-next-box.md', fixture('good-story.md')],
    ['2026-10-02-orders-date.md', fixture('good-live-story.md')],
    ['2026-10-02-export-notes.md', fixture('good-not-ready.md')],
  ]);
export const tickets = (text: string) => checkTickets(text, ticketStories()).errors;

export const badCases: { name: string; problems: () => Problem[] }[] = [
  ...files('bad/').map((name) => ({ name, problems: () => story(fixture(name)) })),
  ...files('bad/context/').map((name) => ({ name, problems: () => context(fixture(name)) })),
  ...files('bad/learned/').map((name) => ({ name, problems: () => learned(fixture(name)) })),
  ...files('bad/tickets/').map((name) => ({ name, problems: () => tickets(fixture(name)) })),
  ...files('bad/v2/').map((name) => ({ name, problems: () => story(fixture(name)) })),
  ...files('bad/looks/').map((name) => ({ name, problems: () => looks(fixture(name)) })),
  ...files('bad/history/').map((name) => ({ name, problems: () => history(fixture(name)) })),
  ...writeSigns.map(([what, run]) => ({ name: `a look with ${what}`, problems: () => looks(withRun(run)) })),
  ...calibrationCases.map(([name, text]) => ({ name, problems: () => calibrated(text) })),
  { name: 'warn/many-scenarios.md', problems: () => check(fixture('warn/many-scenarios.md')).warnings },
  { name: 'warn/stale.md', problems: () => context(fixture('warn/stale.md'), new Date('2027-01-01T00:00:00Z')) },
  { name: 'warn/future.md', problems: () => context(fixture('warn/future.md')) },
  { name: 'a story with an em dash', problems: () => story(emDash()) },
  ...secrets.map(([what, value]) => ({ name: `${what} (${value.slice(0, 4)}...)`, problems: () => context(withLine(secretLine(value))) })),
];
