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
  if (lines >= 150) found.push(`${lines} lines; keep it under 150`);
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
  assert.deepEqual(problems('line\n'.repeat(150)), ['150 lines; keep it under 150']);
  assert.deepEqual(problems(`<details>\n${'line\n'.repeat(150)}</details>\n`), []);
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

test('the README runs from plain to technical, in a fixed order', () => {
  assert.deepEqual(
    sections().map((s) => s.title),
    ['Why it exists', 'What a story looks like', "What's different", 'Proof', 'What the trials changed', 'How it works', 'Limits', 'Setup', 'Under the hood', 'How it was built', "What's next"],
  );
});

test('the README opens with the lockup, both themes, the tagline, the paragraph and a line of links to the sections', () => {
  const top = readme.split('\n## ')[0];
  assert.ok(top.includes('<source media="(prefers-color-scheme: dark)" srcset="brand/lockup-dark.svg">'));
  assert.ok(top.includes('<img src="brand/lockup-light.svg" alt="Loupe" width="360">'));
  assert.ok(top.includes("Story tools help you write faster. Loupe won't hand you a story it can't back up."));
  assert.ok(top.includes("get one that says what's known, unknown and assumed."));
  const jump = 'Jump to [setup](#setup), [an example story](#what-a-story-looks-like), [what the trials changed](#what-the-trials-changed), [how it works under the hood](#under-the-hood), or [how it was built](#how-it-was-built).';
  assert.ok(top.includes(`get one that says what's known, unknown and assumed.\n\n${jump}`), 'the paragraph, then the jump line');
});

test('the story section shows real lines from the example, then the whole story, collapsed', () => {
  const body = section('What a story looks like');
  assert.match(body, /^\nEvery story opens with three lines: the call \(written, or not ready yet\), how confident Loupe is, and the question to ask before anything else\.\n\n> /, 'one sentence, then the excerpt');
  // A quote, not a code block, so long lines wrap on GitHub. Headings show as bold text; summary lines end in <br>.
  const quote = body.split('\n').filter((line) => line.startsWith('>')).map((line) => line.replace(/^> ?/, ''));
  assert.doesNotMatch(body.split('<details>')[0], /```/, 'the excerpt is not a code block');
  const lines = story.split('\n');
  const excerpt: string[] = [];
  for (const line of quote.filter(Boolean)) {
    const bold = line.match(/^\*\*(.+)\*\*$/);
    if (bold) assert.ok(lines.includes(`## ${bold[1]}`), `no section "${bold[1]}" in skip-a-box.md`);
    else excerpt.push(line.replace(/<br>$/, ''));
  }
  assert.deepEqual(quote.filter((line) => line.endsWith('<br>')).length, 2, 'the three summary lines stay on separate lines');
  for (const line of excerpt) assert.ok(lines.includes(line), `not in skip-a-box.md: ${line}`);
  const after = (heading: string, n: number) => story.split(`${heading}\n`)[1].split('\n').slice(0, n);
  for (const line of [...lines.slice(0, 3), ...after('## Known', 2), ...after('## Unknown', 1)]) assert.ok(excerpt.includes(line), line);
  assert.ok(excerpt.some((line) => line.includes('To confirm:')), 'a "To confirm" line');
  assert.ok(body.includes('The full story, with acceptance criteria, estimate and questions, is below.'));
  assert.ok(body.includes('<details>') && body.includes('```markdown\n' + story + '```\n'), 'the full story, word for word');
});

test('every proof line links its trial file, in plain words', () => {
  const proof = section('Proof');
  const items = proof.split('\n').filter((line) => line.startsWith('- '));
  assert.ok(items.length >= 3 && items.length <= 4, `${items.length} proof lines`);
  for (const item of items) assert.match(item, /\]\(docs\/trials\/2026-09-30-trial-\d\.md\)/, item);
  // GitHub shows the trial 5 line as exactly this sentence, with "trial 5" as the link.
  assert.ok(proof.includes('- In [trial 5](docs/trials/2026-09-30-trial-5.md), every cited source checked out: each known fact named the document that holds it.'));
  assert.ok(proof.includes('- In trial 4, all 6 responses passed the checker before they were shown, including the one that refused thin input. A story takes about one to three minutes. ([trial 4](docs/trials/2026-09-30-trial-4.md), [trial 5](docs/trials/2026-09-30-trial-5.md))'));
  assert.ok(proof.includes('From trials on one small invented team, a handful of inputs each; see [docs/trials](docs/trials/).'));
});

test('what the trials changed: five bullets in a fixed order, each linking the trial it came from and the next', () => {
  const items = section('What the trials changed').split('\n').filter((line) => line.startsWith('- '));
  assert.deepEqual(items.map((item) => item.match(/^- \*\*(.+?)\*\*/)?.[1]), ['A fair baseline.', 'Guesses marked.', 'Starts every time.', 'Rules it missed.', 'One source per fact.']);
  const links = items.map((item) => [...item.matchAll(/\[(trial \d)\]/g)].map((m) => m[1]).join(', '));
  assert.deepEqual(links, ['trial 1, trial 2', 'trial 2, trial 3', 'trial 3, trial 4', 'trial 3, trial 4', 'trial 4, trial 5']);
  assert.ok(items[0].includes('a usable estimate on 1 of 4 stories, against Loupe\'s 4 of 4'));
  assert.ok(items[1].includes('9 guessed behaviors') && items[1].includes('trial 3 had 0'));
  assert.ok(items[2].includes('1 of 6 runs') && items[2].includes('all 6 runs in trial 4'));
  for (const item of items) {
    const trials = [...item.matchAll(/\]\((docs\/trials\/[\w.-]+\.md)\)/g)].map((m) => m[1]);
    assert.ok(trials.length >= 2, `a trial and the next one: ${item}`);
    for (const file of trials) assert.ok(existsSync(join(root, file)), file);
  }
});

test('setup says what you need, and leads with the release download', () => {
  const setup = section('Setup');
  assert.match(setup, /^\nYou need a Claude account with Skills and code execution turned on\.\n/);
  const step = setup.split('\n').find((line) => line.startsWith('1. '))!;
  // The release is the main route; the Actions download is the shorter second one.
  assert.ok(step.startsWith('1. **Get the skill.** Download `loupe-skill.zip` from the [latest release](https://github.com/mpwilso/loupe/releases/latest).'), step);
  assert.ok(step.indexOf('latest release') < step.indexOf('Actions'), 'the release first');
  // The branch and workflow names a reader will see on GitHub.
  const workflow = readFileSync(join(root, '.github/workflows/tests.yml'), 'utf8').match(/^name: (.+)$/m)![1];
  assert.ok(step.includes(`the latest **${workflow}** run on **master**`), step);
});

test('under the hood: the repo map is real, and the documented checker command passes', () => {
  const hood = section('Under the hood');
  assert.match(hood, /^\nThe model writes the story, and code checks it, so a story's shape doesn't depend on the model behaving/);
  for (const [, dir] of hood.matchAll(/^- `([\w/.-]+\/)`/gm)) assert.ok(existsSync(join(root, dir)), dir);
  for (const dir of ['skill/', 'spec/', 'src/', 'examples/pellwick/', 'docs/trials/', 'brand/', 'scripts/']) assert.ok(hood.includes(`- \`${dir}\``), dir);
  assert.ok(hood.includes('`scripts/test.sh`'));
  const command = hood.match(/```\n(node src\/run\.js check [^\n]+)\n```/)?.[1];
  assert.ok(command, 'a checker command in a code block');
  const run = spawnSync(process.execPath, command.split(' ').slice(1), { cwd: root, encoding: 'utf8' });
  assert.deepEqual([run.status, run.stdout], [0, `Checked with Node ${process.version}.\n`], command);
  assert.ok(hood.includes('[LICENSE](LICENSE)'));
});

test('how it was built says who directed it and links the trials', () => {
  const built = section('How it was built');
  assert.ok(built.includes('Designed and directed by Matt Wilson'));
  assert.ok(built.includes('Claude Code wrote most of the code.'));
  assert.ok(built.includes('[docs/trials](docs/trials/)'));
});

test('the diagram is shown for both themes', () => {
  const body = section('How it works');
  assert.ok(body.includes('<source media="(prefers-color-scheme: dark)" srcset="docs/img/how-it-works-dark.svg">'));
  assert.ok(body.includes('src="docs/img/how-it-works-light.svg"'));
});
