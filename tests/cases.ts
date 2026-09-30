// Every input that must fail a checker: the files under fixtures/bad and fixtures/warn, plus a few built here.
import { readdirSync, readFileSync } from 'node:fs';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
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

export const badCases: { name: string; problems: () => Problem[] }[] = [
  ...files('bad/').map((name) => ({ name, problems: () => story(fixture(name)) })),
  ...files('bad/context/').map((name) => ({ name, problems: () => context(fixture(name)) })),
  { name: 'warn/stale.md', problems: () => context(fixture('warn/stale.md'), new Date('2027-01-01T00:00:00Z')) },
  { name: 'a story with an em dash', problems: () => story(emDash()) },
  ...secrets.map(([what, value]) => ({ name: `${what} (${value.slice(0, 4)}...)`, problems: () => context(withLine(secretLine(value))) })),
];
