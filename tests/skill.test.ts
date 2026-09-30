import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readZip, type Entry } from '../scripts/zip.ts';
import { frontMatter } from '../src/spec.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-skill-'));
const zipPath = join(temp, 'loupe-skill.zip');
const unzipped = join(temp, 'unzipped');
const md = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.md')).sort();
let entries: Entry[] = [];

before(() => {
  const build = spawnSync('bash', ['scripts/build-skill.sh', zipPath], { cwd: root, encoding: 'utf8' });
  assert.equal(build.status, 0, build.stderr);
  entries = readZip(readFileSync(zipPath));
  for (const { name, data } of entries) {
    if (!data) continue;
    mkdirSync(dirname(join(unzipped, name)), { recursive: true });
    writeFileSync(join(unzipped, name), data);
  }
});
after(() => rmSync(temp, { recursive: true }));

const file = (name: string) => entries.find((e) => e.name === `loupe/${name}`)?.data?.toString('utf8') ?? '';

// Each packaged file and the repo file it comes from. Nothing in skill/ but SKILL.md is ever copied by hand.
const sources: Record<string, string> = {
  'SKILL.md': 'skill/SKILL.md',
  'writing-rules.md': 'skill/writing-rules.md',
  'src/run.js': 'src/run.js',
  'src/node-version.js': 'src/node-version.js',
  'src/check.ts': 'src/check.ts',
  'src/check-context.ts': 'src/check-context.ts',
  'src/spec.ts': 'src/spec.ts',
  ...Object.fromEntries(readdirSync(join(root, 'spec')).map((f) => [`spec/${f}`, `spec/${f}`])),
  ...Object.fromEntries(md('templates').map((f) => [`templates/${f}`, `templates/${f}`])),
  'examples/story.md': 'examples/pellwick/expected/skip-a-box.md',
  'examples/not-ready.md': 'examples/pellwick/expected/export-notes.md',
  'examples/context-file.md': 'examples/pellwick/context/applications.md',
};

test('the zip has one root folder named after the skill, holding exactly the expected files', () => {
  const folders = ['', 'examples/', 'spec/', 'src/', 'templates/'].map((f) => `loupe/${f}`);
  const files = [...Object.keys(sources), 'package.json'].map((f) => `loupe/${f}`);
  assert.deepEqual(entries.map((e) => e.name).sort(), [...folders, ...files].sort());
});

// A guard, not proof of a fix: the Windows password prompt was never traced to a header field.
// Encryption is bit 0 of the flags, and 0 (stored) and 8 (deflate) are the methods every unzip tool reads.
test('guard: no zip entry is marked encrypted or uses an unusual compression method', () => {
  for (const { name, flags, method } of entries) {
    assert.equal(flags & 1, 0, `${name} is marked encrypted`);
    assert.ok(method === 0 || method === 8, `${name} uses compression method ${method}`);
  }
});

test("zip headers match what Python's zipfile writes: made on Unix, normal file modes, no UTF-8 flag for plain names", () => {
  for (const { name, flags, madeBy, attributes } of entries) {
    assert.equal(madeBy >> 8, 3, `${name}: made-by host`);
    assert.equal(attributes, name.endsWith('/') ? 0x41ed0010 : 0x81a40000, `${name}: attributes 0x${attributes.toString(16)}`);
    assert.equal(flags, 0, `${name}: flags 0x${flags.toString(16)}`);
  }
});

test('every packaged file is the repo file, byte for byte', () => {
  for (const [packaged, source] of Object.entries(sources)) {
    assert.equal(file(packaged), readFileSync(join(root, source), 'utf8'), packaged);
  }
});

// Rules from the skill docs: platform.claude.com agent-skills overview and best practices, and the claude.ai help article.
test('SKILL.md front matter follows the documented rules', () => {
  const lines = file('SKILL.md').split('\n');
  const { end, fields } = frontMatter(lines);
  assert.ok(end > 0, 'SKILL.md must start with front matter');
  const name = fields.get('name')?.value ?? '';
  const description = fields.get('description')?.value ?? '';
  assert.deepEqual([...fields.keys()], ['name', 'description']);

  assert.match(name, /^[a-z0-9-]{1,64}$/, 'name: at most 64 lowercase letters, numbers and hyphens');
  assert.doesNotMatch(name, /anthropic|claude/, 'name: no reserved words');
  assert.equal(name, 'loupe', 'the zip folder is named loupe, so the skill must be too');

  assert.ok(description.length > 0, 'description: not empty');
  assert.ok(description.length <= 200, `description: ${description.length} characters; claude.ai allows 200`);
  assert.doesNotMatch(`${name} ${description}`, /<[^>]*>/, 'no XML tags');
  assert.doesNotMatch(description, /^(I|You|We)\b|\b(I can|you can)\b/i, 'description: third person');
  assert.match(description, /\bUse when\b/, 'description: says when to use it');
  for (const term of ['user stories', 'bug reports', 'tickets', 'meeting notes', 'emails', 'product manager', 'sets up their team']) {
    assert.ok(description.includes(term), `description: names "${term}"`);
  }
  assert.match(description, /Not for fiction or creative writing\.$/, 'description: rules out creative writing');

  assert.ok(lines.length - end - 1 < 500, 'body: under 500 lines');
});

test('every file SKILL.md points to is in the zip, one level down', () => {
  const refs = [...file('SKILL.md').matchAll(/SKILL\/([\w./-]+\.\w+)/g)].map((m) => m[1]);
  assert.ok(refs.length > 5);
  for (const ref of refs) assert.ok(file(ref), `SKILL.md points to ${ref}, which is not in the zip`);
  assert.doesNotMatch(file('SKILL.md'), /\\/, 'forward slashes only');
});

const storyMode = () => file('SKILL.md').split('## Write a story')[1].split('\n## ')[0];

test('the checker, not a separate step, reports the Node version, and an unchecked draft says so', () => {
  const skill = file('SKILL.md');
  assert.doesNotMatch(skill, /node --version/);
  assert.doesNotMatch(skill, /node SKILL\/src\/check/, 'every checker runs through run.js');
  assert.ok(skill.includes('`Not checked: <the reason>`'));
  assert.ok(skill.includes('`Checked with Node <version>.`'));
});

test('story mode reads context files where they are, never runs check-context, and keeps the truth check', () => {
  const story = storyMode();
  assert.match(story, /Don't copy them anywhere/);
  assert.match(story, /save only that template/);
  assert.match(story, /Never run `check-context` in this mode/);
  assert.equal(story.match(/node SKILL\/src\/run\.js check-context/g), null);
  assert.match(story, /checker checks shape, not truth/);
  assert.match(story, /Reread every Known line against the source it cites/);
});

test('the skill holds the judgment rules for estimates, missing behavior and confidence, and stays short', () => {
  const skill = file('writing-rules.md');
  assert.match(skill, /basis cites only the input or the context files/);
  assert.match(skill, /Never invent expected behavior/);
  for (const level of ['High means', 'Medium means', 'Low means']) assert.ok(skill.includes(level), level);
  assert.ok(file('SKILL.md').split('\n').length <= 80, 'SKILL.md: keep it to about 80 lines');
  assert.ok(file('SKILL.md').includes('`SKILL/writing-rules.md`'), 'SKILL.md points to the rules');
});

test('the skill asks about what happens around the change, and never answers it by inventing behavior', () => {
  const rules = file('writing-rules.md');
  assert.match(rules, /definition of done and conventions/);
  assert.match(rules, /what the user sees right after the action/);
  assert.match(rules, /boundary the input names/);
  assert.match(rules, /Never answer these by inventing behavior/);
});

test('the packaged checkers need no packages and no network', () => {
  const allowed = new Set(['node:fs', 'node:path', 'node:url', 'node:util']);
  for (const name of ['src/run.js', 'src/node-version.js', 'src/check.ts', 'src/check-context.ts', 'src/spec.ts']) {
    for (const [, from] of file(name).matchAll(/^import .* from '([^']+)';$/gm)) {
      assert.ok(from.startsWith('./') || allowed.has(from), `${name} imports ${from}`);
    }
    assert.doesNotMatch(file(name), /\bfetch\(|\brequire\(/, name);
  }
});

// Runs a checker from the repo and from the unzipped skill on the same files, from the repo root.
function both(checker: string, paths: string[]) {
  const run = (script: string) => {
    const env = { ...process.env, LOUPE_TODAY: '2026-09-30' };
    const { status, stdout, stderr } = spawnSync(process.execPath, [script, ...paths], { cwd: root, encoding: 'utf8', env });
    return { status, stdout, stderr };
  };
  // The skill runs its checkers through run.js, so the packaged side does too.
  const name = checker.replace(/^src\/|\.ts$/g, '');
  const packaged = spawnSync(process.execPath, [join(unzipped, 'loupe/src/run.js'), name, ...paths], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, LOUPE_TODAY: '2026-09-30' },
  });
  return { repo: run(join(root, checker)), packaged: { status: packaged.status, stdout: packaged.stdout, stderr: packaged.stderr } };
}

test('the packaged checkers pass every file in examples/, the same as the repo checkers', () => {
  const teams = readdirSync(join(root, 'examples'));
  const stories = teams.flatMap((t) => ['expected', 'templates'].flatMap((d) => {
    try {
      return md(`examples/${t}/${d}`).map((f) => `examples/${t}/${d}/${f}`);
    } catch {
      return [];
    }
  }));
  const contexts = teams.flatMap((t) => md(`examples/${t}/context`).map((f) => `examples/${t}/context/${f}`));
  for (const [checker, paths] of [['src/check.ts', stories], ['src/check-context.ts', contexts]] as const) {
    assert.ok(paths.length > 0);
    const { repo, packaged } = both(checker, paths);
    assert.deepEqual(packaged, repo, checker);
    assert.deepEqual(packaged, { status: 0, stdout: `Checked with Node ${process.version}.\n`, stderr: '' }, checker);
  }
});

test('the packaged checkers fail every bad fixture, with the same messages as the repo checkers', () => {
  const stories = md('tests/fixtures/bad').map((f) => `tests/fixtures/bad/${f}`);
  const contexts = md('tests/fixtures/bad/context').map((f) => `tests/fixtures/bad/context/${f}`);
  for (const [checker, paths] of [['src/check.ts', stories], ['src/check-context.ts', contexts]] as const) {
    const { repo, packaged } = both(checker, paths);
    assert.deepEqual(packaged, repo, checker);
    assert.equal(packaged.status, 1, checker);
    for (const path of paths) assert.ok(packaged.stdout.includes(`${path}:\n`), `${path} did not fail`);
  }
});

test('setup mode writes only what the sources say', () => {
  const setup = file('SKILL.md').split('## Set up a team')[1].split('\n## ')[0];
  assert.match(setup, /State only what the sources say\. Never add conclusions, advice or predictions/);
});

test('Known facts from a context file cite the original document, via the file', () => {
  assert.match(file('writing-rules.md'), /cite the original document the file names/);
  for (const name of md('examples/pellwick/expected')) {
    const text = readFileSync(join(root, 'examples/pellwick/expected', name), 'utf8');
    const known = text.split('## Known\n')[1]?.split('\n## ')[0] ?? '';
    for (const line of known.split('\n').filter((l) => /context file\)$/i.test(l))) {
      assert.match(line, /, via the \w[\w ]* context file\)$/, `${name}: ${line}`);
    }
  }
});

test('screen details the input does not state are flagged for confirmation, with a bad and a good example', () => {
  const rules = file('writing-rules.md');
  assert.match(rules, /any wording, message, note or display detail the input doesn't state/);
  assert.match(rules, /- Bad: `Given .+`/);
  assert.match(rules, /- Good: `Given .+ To confirm: .+`/);
});

test('a bug always asks about records the bug already damaged', () => {
  assert.match(file('writing-rules.md'), /For a bug, always ask whether records already affected fix themselves once the fix ships, or need a one-time repair/);
  const bug = readFileSync(join(root, 'examples/pellwick/expected/payment-failed-banner.md'), 'utf8');
  assert.match(bug.split('## Questions before building')[1], /already stuck .+ one-time repair\?/);
});

test('nothing comes before the summary, and nothing but the story sits inside it', () => {
  assert.match(file('SKILL.md'), /no narration before the three lines, and no chat notes between the title and the end of the story/);
});

test('setup turns a team form into a template with placeholders, not values, and keeps the team labels', () => {
  const setup = file('SKILL.md').split('## Set up a team')[1].split('\n## ')[0];
  assert.ok(setup.includes('`[High, Medium or Low]` and `[N to M hours]`, never values'));
  assert.match(setup, /Keep the team's own labels/);
});
