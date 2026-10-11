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

test('the README opens with the lockup, both themes, the tagline, the status line, where it runs, the three tools and a line of links to the sections', () => {
  const top = readme.split('\n## ')[0];
  assert.ok(top.includes('<source media="(prefers-color-scheme: dark)" srcset="brand/lockup-dark.svg">'));
  assert.ok(top.includes('<img src="brand/lockup-light.svg" alt="Loupe" width="360">'));
  assert.ok(top.includes("Story tools help you write faster. Loupe won't hand you a story it can't back up."));
  assert.ok(top.includes('Status: A portfolio project, built to show how I design, test and judge an AI tool. Tried on one invented team across ten trials, with reruns. Every trial is in docs/trials, including the misses.'));
  assert.ok(top.includes("get one that says what's known, unknown and assumed."));
  assert.ok(top.includes("It runs in Claude, or in Claude Code, where it reads the team's context from your repository, can search your tracker before writing, and can create a ticket from a finished story with your approval."));
  assert.ok(top.includes("Loupe is one of three tools. Loupe writes the story, [Parallax](https://github.com/mpwilso/parallax) builds it under a gated agent loop and keeps the record, and [ISR](https://github.com/mpwilso/isr) tells the person accepting it what is left. Each runs on its own, and they have been run in that order once, on one change: [ISR's run log](https://github.com/mpwilso/isr/blob/master/docs/run-log.md)."));
  // Where each jump goes is checked by the anchor rule above.
  assert.match(top, /^Jump to \[setup\]\(#setup\), /m);
});

test('what is different includes the learning loop, and what is next no longer lists it', () => {
  assert.ok(section("What's different").includes('- **It learns from corrections and answers.** Every learned fact names its source, and nothing is saved without your yes.'));
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

// The proof and what each trial changed, in one list: each claim once, with the trial records it came from.
test('what the trials found: each bullet links the trials it came from, with the numbers they recorded', () => {
  const body = section('What the trials found');
  const items = body.split('\n').filter((line) => line.startsWith('- '));
  assert.ok(items.length > 0, 'bullets');
  const has = (...parts: string[]) => assert.ok(items.some((item) => parts.every((part) => item.includes(part))), parts.join(' ... '));
  has('a usable estimate on 1 of 4 stories, against Loupe\'s 4 of 4', 'the same format every time', '(docs/trials/2026-09-30-trial-2.md)');
  has('9 guessed behaviors', 'trial 3 had 0', '(docs/trials/2026-09-30-trial-3.md)');
  has('1 of 6 runs', 'all 6 runs in trial 4 used Loupe and passed the checker before they were shown, the refusal of thin input included, at about one to three minutes a story.', '[trial 5](docs/trials/2026-09-30-trial-5.md)');
  has('in trial 5 every citation checked out: each known fact named the document that holds it.', '[trial 5](docs/trials/2026-09-30-trial-5.md)');
  has('trial 6b passed every step it reran', '(docs/trials/2026-09-30-trial-6b.md)');
  has('In trial 7, Loupe tried shell commands outside its rules, including a python edit, and permissions blocked them.', "Files mode now writes with Claude Code's file tools, never with shell commands");
  has('the checker now needs a live source for a ticket anywhere in a story', '"always run the checker"', 'for v0.3.0 users too');
  // The tracker evidence, with the totals in the trial 8 and 9 records.
  has('Every tracker call in trials 8 to 8e was a read, 77 in all, and customer data surfaced 0 times.', '[trial 8](docs/trials/2026-09-30-trial-8.md)');
  assert.match(readFileSync(join(root, 'docs/trials/2026-09-30-trial-8.md'), 'utf8'), /\| Tracker calls \| 77, all reads \|/);
  has('Every ticket created in trial 9 matched its story byte for byte, compared by script, and nothing was created without a yes.', '[trial 9](docs/trials/2026-10-01-trial-9.md)');
  has('an unsettled behavior becomes a whole "To confirm" requirement; in 10c, all four address-change stories passed');
  assert.ok(body.includes('From trials on one small invented team, a handful of inputs each; see [docs/trials](docs/trials/).'));
  for (const item of items) {
    const trials = [...item.matchAll(/\]\((docs\/trials\/[\w.-]+\.md)\)/g)].map((m) => m[1]);
    assert.ok(trials.length >= 1, `a trial record: ${item}`);
    for (const file of trials) assert.ok(existsSync(join(root, file)), file);
  }
});

test('the limits say exactly who ran and scored the trials', () => {
  assert.ok(section('Limits').includes('- The trials were run by the people who built Loupe. The advisor, Claude in a separate claude.ai chat with me checking, scored trials 1, 2, 4, 5, 6, 6b, 7 and 8 through 8b. Trials 7 and 8 were scored from saved outputs, not blind, and 8c to 8e and trials 9 and 10 were measured by the Claude Code session that ran them, with me reviewing two readings in 10c. A separate reviewer scored trials 2 and 3 blind.'));
  assert.ok(section('Limits').includes("- In claude.ai, you swap the updated learned.md into the project's files by hand; in Claude Code, Loupe edits it in place. Learning has been tested on the invented team and no other."));
  assert.doesNotMatch(readme, /doesn't learn from corrections yet/);
});

test('setup says what you need, and gets the skill from the latest release, nothing else', () => {
  const setup = section('Setup');
  assert.ok(setup.includes('You need a Claude account with Skills and code execution turned on.'));
  // Actions artifacts last 7 days, so the release is the one route that is always there.
  assert.ok(setup.includes('**Get the skill.** Download `loupe-skill.zip` from the [latest release](https://github.com/mpwilso/loupe/releases/latest).'));
  assert.doesNotMatch(readme, /\/actions\b/, 'no link to Actions artifacts');
});

test('under the hood: the repo map is real, and the documented checker command passes', () => {
  const hood = section('Under the hood');
  assert.ok(hood.includes("The model writes the story, and code checks it, so a story's shape doesn't depend on the model behaving"));
  for (const [, dir] of hood.matchAll(/^- `([\w/.-]+\/)`/gm)) assert.ok(existsSync(join(root, dir)), dir);
  for (const dir of ['skill/', 'spec/', 'src/', 'examples/pellwick/', 'docs/', 'docs/trials/', 'mock/', 'brand/', 'scripts/']) assert.ok(hood.includes(`- \`${dir}\``), dir);
  assert.ok(hood.includes('`scripts/test.sh`'));
  const command = hood.match(/```\n(node src\/run\.js check [^\n]+)\n```/)?.[1];
  assert.ok(command, 'a checker command in a code block');
  const run = spawnSync(process.execPath, command.split(' ').slice(1), { cwd: root, encoding: 'utf8' });
  assert.deepEqual([run.status, run.stdout], [0, `Checked with Node ${process.version}.\n`], command);
  assert.ok(hood.includes('[LICENSE](LICENSE)'));
  assert.ok(hood.includes('[claude-code.md](docs/claude-code.md)') && hood.includes('[live-context.md](docs/live-context.md)'));
});

test('how it was built says who directed it and links the trials', () => {
  const built = section('How it was built');
  assert.ok(built.includes('I designed and directed Loupe: I set the quality bar,'));
  assert.ok(built.includes('Claude Code wrote most of the code.'));
  assert.ok(built.includes('designed ten trials, with reruns, and fixed what each exposed. Trials 1 to 6b were run in claude.ai, and trials 7 to 10 in Claude Code.'));
  assert.ok(built.includes('Two of the trials were scored in blind review, one of them against plain Claude.'));
  assert.doesNotMatch(built, /tested live in claude\.ai/, 'trials 7 to 9 ran in Claude Code');
  assert.ok(built.includes('[docs/trials](docs/trials/)'));
});

test('the diagram is shown for both themes', () => {
  const body = section('How it works');
  assert.ok(body.includes('<source media="(prefers-color-scheme: dark)" srcset="docs/img/how-it-works-dark.svg">'));
  assert.ok(body.includes('src="docs/img/how-it-works-light.svg"'));
});

// After trial 7b: Claude Code support, with what was and wasn't tested.
test('setup covers Claude Code: the install commands, the guide, and what is tested', () => {
  const setup = section('Setup');
  const part = setup.split('### Use it in Claude Code\n')[1] ?? '';
  assert.ok(part, 'a "Use it in Claude Code" part');
  assert.ok(part.includes('```\ngit clone https://github.com/mpwilso/loupe.git\ncd loupe\nnode scripts/install-claude-code.ts\n```'));
  assert.ok(part.includes('[docs/claude-code.md](docs/claude-code.md)'));
  assert.match(part, /The terminal is tested; the VS Code extension isn't yet\./);
  assert.ok(part.includes('To search your tracker before writing, and to create tickets from finished stories, see [docs/live-context.md](docs/live-context.md).'));
  assert.ok(section("What's different").includes('- **In Claude Code, it keeps to its folder.** It reads your team\'s context from a `loupe/` folder in your repository and writes nowhere else.'));
  const next = section("What's next");
  assert.doesNotMatch(next, /A VS Code version/);
  assert.ok(next.includes('Checks against your lower environments that read and never change anything, so a story can cite how the system behaves today.'));
  assert.doesNotMatch(next, /creating Jira tickets/, 'ticket creation shipped in M4c');
});

// M4b: the tracker, in plain words, with its limits as measured in trial 8e.
test('the README says what reading a tracker does, and its limits as measured', () => {
  assert.ok(section("What's different").includes('- **In Claude Code, it can read your tracker.** It searches the team\'s tracker before writing, cites any ticket it uses with when it was read, flags likely duplicates, and never changes the tracker.'));
  const limits = section('Limits');
  assert.ok(limits.includes('- The customer-data detector catches emails and secrets, but not names, phone numbers or street addresses.'));
  assert.ok(limits.includes("- Reading a tracker and creating tickets were tested on an invented mock tracker, never a real one, with Claude Code's own permission prompt stood in for in trial 9."));
  // M4c, trial 9.
  assert.ok(section("What's different").includes('- **Stories are written for developers and QA.** User and job stories have a background, numbered requirements and test scenarios, each scenario with a happy path and at least one unhappy path.'));
  assert.ok(section("What's different").includes('- **It can create a ticket from a finished story.** It shows exactly what it will create and asks before it does, and it never changes an existing ticket.'));
  assert.ok(limits.includes('- Where Loupe cites tracker facts still varies from run to run: in trial 8e, 2 of 3 stories listed a fact from a ticket under Known, and the third left it as a question.'));
  assert.match(readFileSync(join(root, 'docs/trials/2026-09-30-trial-8.md'), 'utf8'), /\| 8e \| 2 of 3 \|/, 'the rate the README quotes is the one recorded');
});
