import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, before, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { readZip } from '../scripts/zip.ts';
import { frontMatter } from '../src/spec.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const temp = mkdtempSync(join(tmpdir(), 'loupe-skill-'));
const zipPath = join(temp, 'loupe-skill.zip');
const unzipped = join(temp, 'unzipped');
const md = (dir: string) => readdirSync(join(root, dir)).filter((f) => f.endsWith('.md')).sort();
let entries: { name: string; data?: Buffer }[] = [];

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

test('both modes start by checking the checker can run, and say so when it cannot', () => {
  const skill = file('SKILL.md');
  assert.equal(skill.match(/- \[ \] Run node --version/g)?.length, 2);
  assert.ok(skill.includes('`Not checked: <the reason>`'));
});

test('the skill says the checker cannot check truth, so Claude rereads every Known line', () => {
  const skill = file('SKILL.md');
  assert.ok(skill.includes('- [ ] Reread every Known line against its source'));
  assert.match(skill, /checker checks shape, not truth/);
});

test('the skill holds the judgment rules for estimates, missing behavior and confidence, and stays short', () => {
  const skill = file('SKILL.md');
  assert.match(skill, /basis cites only the input or the context files/);
  assert.match(skill, /Never invent expected behavior/);
  for (const level of ['High means', 'Medium means', 'Low means']) assert.ok(skill.includes(level), level);
  assert.ok(skill.split('\n').length <= 80, 'SKILL.md: keep it to about 80 lines');
});

test('the packaged checkers need no packages and no network', () => {
  const allowed = new Set(['node:fs', 'node:path', 'node:url', 'node:util']);
  for (const name of ['src/check.ts', 'src/check-context.ts', 'src/spec.ts']) {
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
  return { repo: run(join(root, checker)), packaged: run(join(unzipped, 'loupe', checker)) };
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
    assert.deepEqual(packaged, { status: 0, stdout: '', stderr: '' }, checker);
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
