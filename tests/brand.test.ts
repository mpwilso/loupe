import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { MARK_ROWS, palette, render } from '../scripts/brand.ts';
import { parseSvg, walk } from './svg.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const svgs = ['brand', 'docs/img'].flatMap((dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.svg')).map((f) => `${dir}/${f}`) : []));

test('every SVG file is drawn by scripts/brand.ts, and matches what it draws today', () => {
  const drawn = render();
  assert.deepEqual(svgs.sort(), Object.keys(drawn).sort());
  for (const [path, text] of Object.entries(drawn)) assert.equal(read(path), text, `${path} is stale: run node scripts/brand.ts`);
});

test('every SVG is well formed, and none asks for the page theme', () => {
  assert.ok(svgs.length >= 3);
  for (const path of svgs) {
    const text = read(path);
    assert.doesNotThrow(() => parseSvg(text), path);
    assert.doesNotMatch(text, /prefers-color-scheme/, path);
  }
});

test('the strict reader rejects broken SVG', () => {
  const ok = '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1"/></svg>';
  assert.doesNotThrow(() => parseSvg(ok));
  for (const bad of [
    '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1"></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect x=1/></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><text>A & B</text></svg>',
    '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" x="2"/></svg>',
    '<svg><rect/></svg>',
  ]) assert.throws(() => parseSvg(bad), bad);
});

test('every themed image has both a light and a dark file', () => {
  const themed = svgs.filter((p) => /-(light|dark)\.svg$/.test(p));
  assert.ok(themed.some((p) => p.startsWith('brand/lockup-')), 'a lockup pair');
  for (const path of themed) {
    const other = path.endsWith('-light.svg') ? path.replace('-light.svg', '-dark.svg') : path.replace('-dark.svg', '-light.svg');
    assert.ok(svgs.includes(other), `${path} has no ${other}`);
  }
});

test('the mark is a 16 by 16 pixel grid: whole-number coordinates, a dark 1-pixel outline, the tile inside', () => {
  const mark = parseSvg(read('brand/mark.svg'));
  assert.equal(mark.attrs.viewBox, '0 0 16 16');
  const rects = walk(mark).filter((n) => n.name === 'rect');
  assert.ok(rects.length > 16);
  for (const rect of rects) {
    for (const key of ['x', 'y', 'width', 'height']) assert.match(rect.attrs[key], /^\d+$/, `${key}="${rect.attrs[key]}"`);
    assert.ok(Number(rect.attrs.x) + Number(rect.attrs.width) <= 16 && Number(rect.attrs.y) + Number(rect.attrs.height) <= 16);
  }
  assert.equal(MARK_ROWS.length, 16);
  for (const [y, row] of MARK_ROWS.entries()) {
    assert.equal(row.length, 16, `row ${y}`);
    assert.ok(row.startsWith('k') && row.endsWith('k'), `row ${y} outline`);
  }
  assert.equal(MARK_ROWS[0], 'k'.repeat(16));
  assert.equal(MARK_ROWS[15], 'k'.repeat(16));
  assert.equal(MARK_ROWS[1], `k${'t'.repeat(14)}k`);
  // The same drawing in every file that holds the mark.
  const body = read('brand/mark.svg').match(/<\/title>(.*)<\/svg>/)![1];
  for (const theme of ['light', 'dark']) assert.ok(read(`brand/lockup-${theme}.svg`).includes(body), theme);
});

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Page backgrounds the files are shown on: a white page and a typical dark page.
const pages = { light: '#ffffff', dark: '#0d1117' };

test('the palette keeps the shared tile and outline, and its accents read where the brand notes say they go', () => {
  const hex = (name: string) => palette[name].hex;
  assert.equal(hex('tile'), '#313859');
  assert.equal(hex('outline'), '#12131f');
  for (const { hex: value, use } of Object.values(palette)) {
    assert.match(value, /^#[0-9a-f]{6}$/);
    assert.ok(use.length > 0);
  }
  // Bright amber: on the tile and on dark pages. Deep gold: on light and dark pages. 3 to 1 is the bar for graphics.
  assert.ok(contrast(hex('amber'), hex('tile')) >= 4.5, 'amber on the tile');
  assert.ok(contrast(hex('amber'), pages.dark) >= 4.5, 'amber on a dark page');
  assert.ok(contrast(hex('gold'), pages.light) >= 3, 'gold on a light page');
  assert.ok(contrast(hex('gold'), pages.dark) >= 3, 'gold on a dark page');
  assert.ok(contrast(hex('white'), hex('gold')) >= 3, 'white text on gold');
  assert.ok(contrast(hex('outline'), hex('amber')) >= 4.5, 'dark text on amber');
  assert.ok(contrast(hex('outline'), pages.light) >= 4.5 && contrast(hex('cream'), pages.dark) >= 4.5, 'text on each page');
});

test('every color in the SVG files comes from the palette', () => {
  const allowed = new Set(Object.values(palette).map((c) => c.hex));
  for (const path of svgs) {
    for (const [color] of read(path).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) assert.ok(allowed.has(color.toLowerCase()), `${path}: ${color}`);
  }
});

test('the brand notes show every palette color and its use, and the light and dark lockups', () => {
  const notes = read('brand/README.md');
  for (const [name, { hex, use }] of Object.entries(palette)) {
    assert.ok(notes.includes(`\`${hex}\``), `${name}: ${hex}`);
    assert.ok(notes.includes(use), `${name}: its use`);
  }
  for (const file of ['mark.svg', 'lockup-light.svg', 'lockup-dark.svg']) assert.ok(notes.includes(file), file);
});
