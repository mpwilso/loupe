import assert from 'node:assert/strict';
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
    .replace(/<!--[\s\S]*?-->/g, '');

const tags = new Set(['p', 'picture', 'source', 'img', 'b', 'details', 'summary', 'br', 'a', 'sub']);

function problems(text: string, base = root): string[] {
  const found: string[] = [];
  const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  if (lines >= 150) found.push(`${lines} lines; keep it under 150`);
  if (text.includes('\u2014')) found.push('an em dash');
  const links = [...text.matchAll(/\]\(([^)\s]+)\)|\b(?:src|srcset|href)="([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  for (const link of links) {
    if (/^(https?:|mailto:|#)/.test(link)) continue;
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

test('the README opens with the lockup, both themes, then the tagline, and leaves a slot for the demo', () => {
  const top = readme.split('\n## ')[0];
  assert.ok(top.includes('<source media="(prefers-color-scheme: dark)" srcset="brand/lockup-dark.svg">'));
  assert.ok(top.includes('<img src="brand/lockup-light.svg" alt="Loupe" width="360">'));
  assert.ok(top.includes('media="(prefers-color-scheme: dark)"'));
  assert.ok(top.includes("Story tools help you write faster. Loupe won't hand you a story it can't back up."));
  assert.match(top, /<!-- Demo GIF goes here\. -->/);
  assert.doesNotMatch(top, /\.gif/i, 'no image until the GIF exists');
});

test('every proof line links its trial file, and the story example is the real one', () => {
  const proof = readme.split('## Proof\n')[1].split('\n## ')[0];
  const items = proof.split('\n').filter((line) => line.startsWith('- '));
  assert.ok(items.length >= 3 && items.length <= 4, `${items.length} proof lines`);
  for (const item of items) assert.match(item, /\]\(docs\/trials\/2026-09-30-trial-\d\.md\)/, item);
  // GitHub shows the trial 5 line as exactly this sentence, with "trial 5" as the link.
  assert.ok(proof.includes('- In [trial 5](docs/trials/2026-09-30-trial-5.md), every cited source checked out: each known fact named the document that holds it.'));
  assert.ok(readme.includes("get one that says what's known, unknown and assumed."));
  assert.ok(proof.includes('From trials on one small invented team, a handful of inputs each; see [docs/trials](docs/trials/).'));
  const story = readFileSync(join(root, 'examples/pellwick/expected/skip-a-box.md'), 'utf8');
  assert.ok(readme.includes(`<details>`) && readme.includes('```markdown\n' + story + '```\n'), 'the README shows skip-a-box.md word for word');
});

test('the diagram is shown for both themes', () => {
  const section = readme.split('## How it works\n')[1].split('\n## ')[0];
  assert.ok(section.includes('<source media="(prefers-color-scheme: dark)" srcset="docs/img/how-it-works-dark.svg">'));
  assert.ok(section.includes('src="docs/img/how-it-works-light.svg"'));
});
