import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const readme = readFileSync(join(root, 'README.md'), 'utf8');

// The README with code blocks, code spans and HTML comments taken out: what GitHub shows as prose and tags.
const prose = (text: string) =>
  text
    .replace(/^```[\s\S]*?^```$/gm, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    // A quote is copied output, like the story excerpt, not the README's own claims.
    .replace(/^>.*$/gm, '');

const tags = new Set(['p', 'picture', 'source', 'img', 'b', 'details', 'summary', 'br', 'a', 'sub']);

// GitHub's heading anchors: lower case, punctuation dropped, spaces as hyphens.
const slug = (heading: string) => heading.trim().toLowerCase().replace(/[^\w\- ]/g, '').replace(/ /g, '-');
// Headings outside code blocks. A story inside a fence has "##" lines too, and they are not the README's.
const headings = (text: string) => prose(text).split('\n').filter((line) => /^#{1,6} /.test(line)).map((line) => line.replace(/^#+ /, ''));

function problems(text: string, base = root): string[] {
  const found: string[] = [];
  // The collapsed full story is there for anyone who opens it; the limit is on what a reader sees.
  const shownLines = text.replace(/<details>[\s\S]*?<\/details>/g, '<details></details>');
  const lines = shownLines.split('\n').length - (shownLines.endsWith('\n') ? 1 : 0);
  if (lines >= 155) found.push(`${lines} lines; keep it under 155`);
  if (text.includes('\u2014')) found.push('an em dash');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)|\b(?:src|srcset|href)="([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  for (const link of links) {
    if (link.startsWith('#')) {
      if (!headings(text).map(slug).includes(link.slice(1))) found.push(`an anchor with no heading: ${link}`);
      continue;
    }
    if (/^(https?:|mailto:)/.test(link)) continue;
    if (!existsSync(join(base, link.split(/[?#]/)[0]))) found.push(`a broken link: ${link}`);
  }
  const shown = prose(text);
  for (const [tag, name] of shown.matchAll(/<\/?([^\s>/]*)[^>]*>/g)) {
    if (!tags.has(name.toLowerCase())) found.push(`a bare angle-bracket placeholder: ${tag}`);
  }
  const words = shown.replace(/<[^>]*>/g, (tag) => (tag.match(/alt="([^"]*)"/)?.[1] ?? ''));
  for (const [word] of words.matchAll(/\b(only|first|best)\b/gi)) found.push(`"${word}" in the prose`);
  return found;
}

test('the README passes every rule: short, no em dashes, links that resolve, no hidden placeholders, no claims it cannot prove', () => {
  assert.deepEqual(problems(readme), []);
});

test('each README rule catches what it should', () => {
  assert.deepEqual(problems('line\n'.repeat(155)), ['155 lines; keep it under 155']);
  assert.deepEqual(problems(`<details>\n${'line\n'.repeat(155)}</details>\n`), []);
  assert.deepEqual(problems('## Setup\n\nJump to [setup](#setup) or [the end](#the-end).\n\n```\n## The end\n```\n'), ['an anchor with no heading: #the-end']);
  assert.deepEqual(problems('A long pause\u2014then more.\n'), ['an em dash']);
  assert.deepEqual(problems('See [the notes](docs/nowhere.md) and <img src="brand/missing.svg">.\n'), [
    'a broken link: docs/nowhere.md',
    'a broken link: brand/missing.svg',
  ]);
  assert.deepEqual(problems('Show the draft under <the reason>.\n'), ['a bare angle-bracket placeholder: <the reason>']);
  assert.deepEqual(problems('Show the draft under `<the reason>`.\n\n```\n<folder>\n```\n'), []);
  assert.deepEqual(problems('The first tool, and the best.\n<img src="brand/mark.svg" alt="Our only mark">\n'), [
    '"first" in the prose',
    '"best" in the prose',
    '"only" in the prose',
  ]);
  assert.deepEqual(problems('```markdown\nFirst question: only the next box?\n```\n'), []);
});

const sections = () => {
  const found: { title: string; body: string }[] = [];
  let fenced = false;
  for (const line of readme.split('\n')) {
    if (line.startsWith('```')) fenced = !fenced;
    if (!fenced && line.startsWith('## ')) found.push({ title: line.slice(3), body: '' });
    else if (found.length) found.at(-1)!.body += `${line}\n`;
  }
  return found;
};
const section = (title: string) => sections().find((s) => s.title === title)?.body ?? '';
const story = readFileSync(join(root, 'examples/pellwick/expected/skip-a-box.md'), 'utf8');

// Every image the README shows: <img src>, <source srcset> and Markdown images.
const images = (text: string) => [...text.matchAll(/<img[^>]*\ssrc="([^"]+)"|<source[^>]*\ssrcset="([^"]+)"|!\[[^\]]*\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? m[2] ?? m[3]);
const missingImages = (text: string) => images(text).filter((path) => !/^https?:/.test(path) && !existsSync(join(root, path)));

test('every image the README references exists in the repo', () => {
  assert.ok(images(readme).length >= 4, 'the lockup and the diagram, each light and dark');
  assert.deepEqual(missingImages(readme), []);
  assert.deepEqual(missingImages('<img src="docs/img/no-such-demo.gif" alt="x">\n![x](brand/nowhere.png)\n<source srcset="brand/lockup-dark.svg">\n'), [
    'docs/img/no-such-demo.gif',
    'brand/nowhere.png',
  ]);
});

test('the README opens with the lockup, both themes, the CI badge, the tagline, the plain sentence and the status line', () => {
  const top = readme.split('\n## ')[0];
  assert.ok(top.includes('<source media="(prefers-color-scheme: dark)" srcset="brand/lockup-dark.svg">'));
  assert.ok(top.includes('<img src="brand/lockup-light.svg" alt="Loupe" width="360">'));
  assert.ok(top.includes('<a href="https://github.com/mpwilso/loupe/actions/workflows/tests.yml"><img src="https://github.com/mpwilso/loupe/actions/workflows/tests.yml/badge.svg" alt="CI"></a>'));
  assert.ok(top.includes("Turns meeting notes into stories a developer can build. It won't hand you one it can't back up."));
  assert.ok(top.includes("A Claude skill for product managers. It turns meeting notes, tickets and emails into user stories a developer can build, and refuses to write one it can't back up."));
  assert.ok(top.includes('Status: a portfolio project, built to show how I design, test and judge an AI tool. Tried on one invented team across ten trials, with reruns. Every trial is in [docs/trials](docs/trials/README.md), including the misses.'));
  // The plain sentence is the first prose a visitor reads: nothing but the lockup, the badge and the tagline comes before it.
  assert.ok(top.indexOf('A Claude skill for product managers.') < top.indexOf('Status: '));
  assert.doesNotMatch(top, /^Jump to /m, 'no hand-rolled table of contents');
});

test('the other tools are named once, near the end, and Loupe is plain text there', () => {
  const others = section('The other tools');
  assert.ok(others.includes("This is one of six tools. Three run in order: Loupe writes the story, [Parallax](https://github.com/mpwilso/parallax) builds it in a sandbox and keeps the record, and [ISR](https://github.com/mpwilso/isr) tells the person accepting it what is left to check. Three stand alone: [Polarizer](https://github.com/mpwilso/polarizer) holds an agent's risky tool calls until a person approves them, [Mordecai](https://github.com/mpwilso/mordecai) judges whether a Claude skill helps, and [Max Q](https://github.com/mpwilso/Project-Max-Q) ranks job postings against a profile. Each runs on its own. The three were run in order once, on one change: [ISR's run log](https://github.com/mpwilso/isr/blob/master/docs/run-log.md)."));
  assert.doesNotMatch(others, /\[Loupe\]/);
  const titles = sections().map((s) => s.title);
  assert.deepEqual(titles.slice(-2), ['The other tools', 'License']);
  assert.ok(section('License').includes('[MIT](LICENSE).'));
});

test('what is different includes the learning loop, and what is next no longer lists it', () => {
  assert.ok(section("What's different").includes('- **It learns your team from your documents, your corrections and your answers.** Every learned fact names its source, and nothing is saved without your yes.'));
  const next = section("What's next");
  assert.doesNotMatch(next, /learning loop/i);
  assert.ok(next.includes('Checks against your lower environments that read and never change anything'));
});

test('the story section shows real lines from the example, then the whole story, collapsed', () => {
  const body = section('What a story looks like');
  assert.ok(body.includes('Every story opens with three lines: the call (written, or not ready yet), how confident Loupe is, and the question to ask before anything else.'));
  // A quote, not a code block, so long lines wrap on GitHub. Headings show as bold text; summary lines end in <br>.
  const quote = body.split('\n').filter((line) => line.startsWith('>')).map((line) => line.replace(/^> ?/, ''));
  assert.doesNotMatch(body.split('<details>')[0], /```/, 'the excerpt is not a code block');
  const lines = story.split('\n');
  const excerpt: string[] = [];
  for (const line of quote.filter(Boolean)) {
    const bold = line.match(/^\*\*(.+)\*\*$/);
    if (bold) assert.ok(lines.includes(`## ${bold[1]}`), `no section "${bold[1]}" in skip-a-box.md`);
    else excerpt.push(...line.split('<br>').filter(Boolean));
  }
  assert.deepEqual(quote.filter((line) => line.endsWith('<br>')).length, 2, 'the three summary lines stay on separate lines');
  for (const line of excerpt) assert.ok(lines.includes(line), `not in skip-a-box.md: ${line}`);
  const after = (heading: string, n: number) => story.split(`${heading}\n`)[1].split('\n').slice(0, n);
  for (const line of [...lines.slice(0, 3), ...after('## Known', 2), ...after('## Unknown', 1)]) assert.ok(excerpt.includes(line), line);
  assert.ok(excerpt.some((line) => line.includes('To confirm:')), 'a "To confirm" line');
  // v2: the excerpt shows a whole test scenario, with its happy and unhappy paths.
  for (const start of ['TEST SCENARIO: ', 'HAPPY PATH: ', 'UNHAPPY PATH: ', 'WHEN ', 'THEN ']) assert.ok(excerpt.some((line) => line.startsWith(start)), start);
  assert.ok(body.includes('The full story, with its background, requirements, test scenarios, estimate and questions, is below.'));
  assert.ok(body.includes('<details>') && body.includes('```markdown\n' + story + '```\n'), 'the full story, word for word');
});

const trialsIndex = readFileSync(join(root, 'docs/trials/README.md'), 'utf8');

// Three findings in the README, each with the trial records it came from; the rest, one per trial, in the trials index.
test('what the trials found: each bullet links the trials it came from, with the numbers they recorded', () => {
  const body = section('What the trials found');
  const items = body.split('\n').filter((line) => line.startsWith('- '));
  assert.equal(items.length, 3, 'three bullets: the baseline, the guesses and the tickets');
  const has = (...parts: string[]) => assert.ok(items.some((item) => parts.every((part) => item.includes(part))), parts.join(' ... '));
  has('a usable estimate on 1 of 4 stories, against Loupe\'s 4 of 4', 'the same format every time', '(docs/trials/2026-09-30-trial-2.md)');
  has('9 guessed behaviors', 'trial 3 had 0', '(docs/trials/2026-09-30-trial-3.md)');
  has('Every ticket created in trial 9 matched its story byte for byte, compared by script, and nothing was created without a yes.', '[trial 9](docs/trials/2026-10-01-trial-9.md)');
  assert.ok(body.includes('Each trial was run by hand and recorded, on one small invented team with a handful of inputs each. What every trial found, and what changed after it, is in [docs/trials](docs/trials/README.md).'));
  // The trials are evals run by hand; the scripts that measured trial 9 are tracked, not left in the gitignored build/.
  assert.ok(body.includes('The scripts that ran trial 9 and compared its tickets with their stories are in [scripts/trials](scripts/trials/).'));
  for (const file of ['compare.py', 'run-all.sh', 'run-turn.sh', 'settings-flag.json']) assert.ok(existsSync(join(root, 'scripts/trials/trial-9', file)), file);
  for (const item of items) {
    const trials = [...item.matchAll(/\]\((docs\/trials\/[\w.-]+\.md)\)/g)].map((m) => m[1]);
    assert.ok(trials.length >= 1, `a trial record: ${item}`);
    for (const file of trials) assert.ok(existsSync(join(root, file)), file);
  }
  // The findings that left the README live in the trials index, with their numbers.
  for (const claim of [
    "the skill didn't start in 1 of 6 runs, the refusal skipped the checker, and it broke four rules, the team's and its own, such as using the user story template for a bug.",
    "Loupe ran and the checker passed in 6 of 6 runs, the refusal of thin input included, at about one to three minutes a story, and it got all four of trial 3's missed rules right, but some known facts cited a document that didn't hold them, because each context file listed its sources as a group.",
    'with each fact in a context file now carrying its own source. Every known fact in the two finished stories cited the document that holds it',
    '"remember this" went to learned.md, not memory; all five steps passed.',
    "the first run tried shell commands outside its rules, including a python edit, and permissions blocked them, so files mode now writes with Claude Code's file tools, never with shell commands",
    'All 77 tracker calls read, no customer email surfaced',
    'the checker now needs a live source for a ticket anywhere in a story; a story marked "Not checked" without trying led to "always run the checker"; and repeat runs found that the setup guide\'s edit rule broke after a cd, which the guide\'s new rule fixes.',
    'Trial 10 found two stories with an invented Example, and 10b three requirements stating behaviors the input never mentions; after both fixes, Examples keep to the input, an unsettled behavior becomes a whole "To confirm" requirement, and all four address-change stories passed in 10c.',
  ]) assert.ok(trialsIndex.includes(claim), claim);
  assert.match(readFileSync(join(root, 'docs/trials/2026-09-30-trial-8.md'), 'utf8'), /\| Tracker calls \| 77, all reads \|/);
});

test('the limits keep three bullets, and the full list and who scored each trial live in docs', () => {
  const limits = section('Limits');
  assert.equal(limits.split('\n').filter((line) => line.startsWith('- ')).length, 3);
  assert.ok(limits.includes('- Tested on one invented company, at about one to three minutes per story, by the people who built Loupe. [docs/trials](docs/trials/README.md) says who scored each trial, and which were blind.'));
  assert.ok(limits.includes('The full list is in [docs/limits.md](docs/limits.md).'));
  assert.ok(trialsIndex.includes('The trials were run by the people who built Loupe. The advisor scored trials 1, 2, 4, 5, 6, 6b, 7 and 8 through 8b. Trials 7 and 8 were scored from saved outputs, not blind, and 8c to 8e and trials 9 and 10 were measured by the Claude Code session that ran them, with Matt Wilson reviewing two readings in 10c. A separate reviewer scored trials 2 and 3 blind.'));
  const full = readFileSync(join(root, 'docs/limits.md'), 'utf8');
  for (const line of limits.split('\n').filter((line) => line.startsWith('- ')).slice(1)) assert.ok(full.includes(line), `in docs/limits.md too: ${line}`);
  assert.ok(full.includes("- In claude.ai, you swap the updated learned.md into the project's files by hand; in Claude Code, Loupe edits it in place. Learning has been tested on the invented team and no other."));
  assert.doesNotMatch(readme, /doesn't learn from corrections yet/);
});

test('try it gives the three routes, gets the skill from the latest release, and says what is tested', () => {
  const tryIt = section('Try it');
  assert.ok(tryIt.includes('You need a Claude account with Skills and code execution turned on.'));
  // Actions artifacts last 7 days, so the release is the one route that is always there.
  assert.ok(tryIt.includes('- **Claude:** download `loupe-skill.zip` from the [latest release](https://github.com/mpwilso/loupe/releases/latest)'));
  assert.doesNotMatch(readme, /\/actions\/(?!workflows\/tests\.yml)/, 'no link to Actions artifacts; the CI badge is the one Actions link');
  assert.ok(tryIt.includes('- **Claude Code plugin:** run `/plugin marketplace add mpwilso/loupe`, then `/plugin install loupe@loupe`. Untested in trials.'));
  assert.ok(tryIt.includes('- **Claude Code installer:** clone this repository and run `node scripts/install-claude-code.ts`.'));
  assert.ok(tryIt.includes('[docs/claude-project.md](docs/claude-project.md)') && tryIt.includes('[docs/claude-code.md](docs/claude-code.md)'));
  assert.match(tryIt, /The terminal is tested; the VS Code extension isn't yet\./);
  assert.ok(tryIt.includes('To search your tracker before writing, and to create tickets from finished stories, see [docs/live-context.md](docs/live-context.md).'));
  // The guides hold the steps the README used to repeat.
  const project = readFileSync(join(root, 'docs/claude-project.md'), 'utf8');
  for (const step of ['## 1. Get the skill zip', '## 2. Upload the skill', '## 3. Create the project', '## 4. Add the context files', '## 5. Share the project']) assert.ok(project.includes(step), step);
  const code = readFileSync(join(root, 'docs/claude-code.md'), 'utf8');
  assert.ok(code.includes('```\ngit clone https://github.com/mpwilso/loupe.git\ncd loupe\nnode scripts/install-claude-code.ts\n```'));
  assert.match(code, /The terminal is tested; the VS Code extension isn't yet\./);
  assert.doesNotMatch(code, /in a terminal or in the VS Code extension/, 'the guide no longer says the extension works');
});

test('how it was built says who directed it, how the checker works, and the documented checker command passes', () => {
  const built = section('How it was built');
  assert.ok(built.includes('I designed and directed Loupe: I set the quality bar,'));
  assert.ok(built.includes('Claude Code wrote most of the code.'));
  assert.ok(built.includes('designed ten trials, with reruns, and fixed what each exposed. Trials 1 to 6b were run in claude.ai, and trials 7 to 10 in Claude Code.'));
  assert.ok(built.includes('Two of the trials were scored in blind review, one of them against plain Claude.'));
  assert.doesNotMatch(built, /tested live in claude\.ai/, 'trials 7 to 9 ran in Claude Code');
  assert.ok(built.includes('[docs/trials](docs/trials/)'));
  assert.ok(built.includes("The model writes the story, and code checks it, so a story's shape doesn't depend on the model behaving"));
  assert.ok(built.includes('Zero runtime dependencies. TypeScript, run directly by Node 22.18 or newer. CI tests on Node 22.18.0 and 24.21.0.'));
  assert.ok(built.includes('`scripts/test.sh`'));
  const command = built.match(/```\n(node src\/run\.js check [^\n]+)\n```/)?.[1];
  assert.ok(command, 'a checker command in a code block');
  const run = spawnSync(process.execPath, command.split(' ').slice(1), { cwd: root, encoding: 'utf8' });
  assert.deepEqual([run.status, run.stdout], [0, `Checked with Node ${process.version}.\n`], command);
  assert.ok(built.includes('[docs/layout.md](docs/layout.md)'));
});

test('the folder map in docs/layout.md is real', () => {
  const layout = readFileSync(join(root, 'docs/layout.md'), 'utf8');
  for (const [, dir] of layout.matchAll(/^- `([\w/.-]+\/)`/gm)) assert.ok(existsSync(join(root, dir)), dir);
  for (const dir of ['skill/', 'spec/', 'src/', 'examples/pellwick/', 'docs/', 'docs/trials/', 'mock/', 'brand/', 'scripts/']) assert.ok(layout.includes(`- \`${dir}\``), dir);
  for (const [, link] of layout.matchAll(/\]\(([^)\s]+)\)/g)) assert.ok(existsSync(join(root, 'docs', link)), link);
  assert.ok(layout.includes('[claude-code.md](claude-code.md)') && layout.includes('[live-context.md](live-context.md)'));
});

test('the diagram is shown for both themes', () => {
  const body = section('How it works');
  assert.ok(body.includes('<source media="(prefers-color-scheme: dark)" srcset="docs/img/how-it-works-dark.svg">'));
  assert.ok(body.includes('src="docs/img/how-it-works-light.svg"'));
});

// After trial 7b: Claude Code support, in what is different and what is next.
test('what is different covers Claude Code, and what is next has moved on from it', () => {
  assert.ok(section("What's different").includes('- **In Claude Code, it keeps to its folder.** It reads your team\'s context from a `loupe/` folder in your repository and writes nowhere else.'));
  const next = section("What's next");
  assert.doesNotMatch(next, /A VS Code version/);
  assert.ok(next.includes('Checks against your lower environments that read and never change anything, so a story can cite how the system behaves today.'));
  assert.doesNotMatch(next, /creating Jira tickets/, 'ticket creation shipped in M4c');
});

// M4b and M4c: the tracker, in plain words, with its limits as measured in trial 8e.
test('the README says what reading a tracker and creating tickets do, and the limits as measured', () => {
  assert.ok(section("What's different").includes('- **In Claude Code, it can read your tracker and create tickets.** It searches the team\'s tracker before writing, cites any ticket it uses with when it was read, and flags likely duplicates. It creates a ticket from a finished story after showing you exactly what it will create and asking, and it never changes an existing ticket.'));
  const limits = section('Limits');
  assert.ok(limits.includes('- The customer-data detector catches emails and secrets, but not names, phone numbers or street addresses.'));
  assert.ok(limits.includes("- Reading a tracker and creating tickets were tested on an invented mock tracker, never a real one, with Claude Code's own permission prompt stood in for in trial 9."));
  // M4c, trial 9.
  assert.ok(section("What's different").includes('- **Stories are written for developers and QA.** User and job stories have a background, numbered requirements and test scenarios, each scenario with a happy path and at least one unhappy path.'));
  const full = readFileSync(join(root, 'docs/limits.md'), 'utf8');
  assert.ok(full.includes('- Where Loupe cites tracker facts still varies from run to run: in trial 8e, 2 of 3 stories listed a fact from a ticket under Known, and the third left it as a question.'));
  assert.match(readFileSync(join(root, 'docs/trials/2026-09-30-trial-8.md'), 'utf8'), /\| 8e \| 2 of 3 \|/, 'the rate the docs quote is the one recorded');
});
