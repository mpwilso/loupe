import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { after, test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildSkillFolder } from '../scripts/skill-folder.ts';
import { frontMatter } from '../src/spec.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const temp = mkdtempSync(join(tmpdir(), 'loupe-plugin-'));
after(() => rmSync(temp, { recursive: true }));

const skillFields = (text: string) => {
  const { fields } = frontMatter(text.split('\n'));
  return { name: fields.get('name')?.value, description: fields.get('description')?.value };
};

// Claude Code users add this repository as a plugin marketplace. The one plugin is the release zip, so the plugin
// gets exactly the files claude.ai gets, and nothing built is committed. `claude plugin validate .` passes on it.
test('the plugin marketplace lists Loupe as the latest release zip, under the skill\'s own name and description', () => {
  const market = JSON.parse(read('.claude-plugin/marketplace.json'));
  const skill = skillFields(read('skill/SKILL.md'));
  assert.equal(market.name, 'loupe');
  assert.ok(market.owner?.name, 'an owner name');
  assert.equal(market.plugins.length, 1);
  const [plugin] = market.plugins;
  assert.equal(plugin.name, skill.name);
  assert.equal(plugin.description, skill.description);
  assert.equal(plugin.license, JSON.parse(read('package.json')).license);
  // The release workflow attaches the zip this URL names.
  const zip = read('.github/workflows/release.yml').match(/files: (\S+\.zip)\n/)?.[1] ?? '';
  assert.ok(zip, 'the release attaches a zip');
  assert.deepEqual(plugin.source, { source: 'archive', url: `https://github.com/mpwilso/loupe/releases/latest/download/${basename(zip)}` });
  assert.ok(!existsSync(join(root, '.claude-plugin/plugin.json')), 'the marketplace entry is the whole manifest');
});

// With no plugin.json and no skills/ folder, Claude Code loads a plugin whose root holds SKILL.md as one skill.
test('the zip\'s folder works as a plugin root: SKILL.md at its top, with its name and description', () => {
  const dir = join(temp, 'loupe');
  buildSkillFolder(dir);
  const skill = skillFields(readFileSync(join(dir, 'SKILL.md'), 'utf8'));
  assert.equal(skill.name, 'loupe');
  assert.ok(skill.description);
  assert.ok(!existsSync(join(dir, 'skills')) && !existsSync(join(dir, '.claude-plugin')), 'nothing that would change how it loads');
});

test('the README and the Claude Code guide give the same two plugin commands', () => {
  for (const doc of ['README.md', 'docs/claude-code.md']) {
    const text = read(doc);
    assert.ok(text.includes('/plugin marketplace add mpwilso/loupe'), doc);
    assert.ok(text.includes('/plugin install loupe@loupe'), doc);
  }
});
