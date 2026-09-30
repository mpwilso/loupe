import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { inflateSync } from 'node:zlib';
import { CENTER, FACETS, OPEN_STROKE, VERTICES, palette, render, wordmark } from '../scripts/brand.ts';
import { parseSvg, walk } from './svg.ts';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (path: string) => readFileSync(join(root, path), 'utf8');
const svgs = ['brand', 'docs/img'].flatMap((dir) => (existsSync(join(root, dir)) ? readdirSync(join(root, dir)).filter((f) => f.endsWith('.svg')).map((f) => `${dir}/${f}`) : []));
const hex = (name: string) => palette[name].hex;
const animated = ['brand/mark.svg', 'brand/mark-light.svg', 'brand/lockup-dark.svg', 'brand/lockup-light.svg'];
const onDark = ['brand/mark.svg', 'brand/lockup-dark.svg'];

test('every SVG file is drawn by scripts/brand.ts, and matches what it draws today', () => {
  const drawn = render();
  assert.deepEqual(svgs.sort(), Object.keys(drawn).sort());
  for (const [path, text] of Object.entries(drawn)) assert.equal(read(path), text, `${path} is stale: run node scripts/brand.ts`);
});

test('every SVG is well formed, never asks for the page theme, and moves by CSS only: no script, no SMIL', () => {
  assert.ok(svgs.length >= 7);
  for (const path of svgs) {
    const text = read(path);
    assert.doesNotThrow(() => parseSvg(text), path);
    assert.doesNotMatch(text, /prefers-color-scheme/, path);
    assert.doesNotMatch(text, /<script|<animate|<set\b|\bon[a-z]+="/i, path);
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

test('every themed image has a file for light pages and one for dark pages', () => {
  const pairs = [['brand/mark.svg', 'brand/mark-light.svg'], ['brand/lockup-dark.svg', 'brand/lockup-light.svg'], ['docs/img/how-it-works-dark.svg', 'docs/img/how-it-works-light.svg']];
  for (const pair of pairs) for (const path of pair) assert.ok(svgs.includes(path), path);
  for (const path of svgs.filter((p) => /-(light|dark)\.svg$/.test(p))) assert.ok(pairs.flat().includes(path), `${path} has no partner`);
});

test('the mark is a hexagon of radius 46 in six facets: five filled clockwise from the top, the sixth open and dashed', () => {
  assert.equal(parseSvg(read('brand/mark.svg')).attrs.viewBox, '0 0 120 120');
  for (const [x, y] of VERTICES) assert.ok(Math.abs(Math.hypot(x - CENTER[0], y - CENTER[1]) - 46) < 0.1, `${x},${y}`);
  assert.deepEqual(FACETS.map((f) => f.fill.toUpperCase()), ['#0E5E4E', '#1F8A6E', '#2FA383', '#57C29D', '#7BD9B8']);
  assert.equal(FACETS[0].d, 'M60 60L60 14L99.8 37Z');
  for (const path of animated) {
    const paths = walk(parseSvg(read(path))).filter((n) => n.name === 'path' && n.attrs.d.startsWith('M60 60'));
    assert.deepEqual(paths.slice(0, 5).map((p) => [p.attrs.d, p.attrs.fill]), FACETS.map((f) => [f.d, f.fill]), path);
    const open = paths[5];
    assert.equal(open.attrs.d, 'M60 60L20.2 37L60 14Z', path);
    assert.deepEqual([open.attrs.fill, open.attrs['stroke-width'], open.attrs['stroke-dasharray'], open.attrs['stroke-linejoin']], ['none', '2.5', '4 4', 'round'], path);
    assert.equal(open.attrs.stroke, onDark.includes(path) ? hex('mint') : hex('emerald'), `${path}: open facet stroke`);
  }
  assert.deepEqual(OPEN_STROKE, { dark: hex('mint'), light: hex('emerald') });
});

test('the facets fade in once, 0.35s each, 0.2s apart, and hold; reduced motion shows the finished mark', () => {
  for (const path of animated) {
    const style = read(path).match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
    assert.match(style, /\.facet\{animation-name:facet;animation-duration:\.35s;animation-timing-function:ease-out;animation-iteration-count:1;animation-fill-mode:both\}/, path);
    assert.ok(style.includes('.f1{animation-delay:0.0s}.f2{animation-delay:0.2s}.f3{animation-delay:0.4s}.f4{animation-delay:0.6s}.f5{animation-delay:0.8s}'), path);
    assert.match(style, /@keyframes facet\{from\{opacity:0\}to\{opacity:1\}\}/, path);
    assert.ok(style.includes('@media (prefers-reduced-motion: reduce){*{animation:none!important}}'), path);
    assert.doesNotMatch(style, /infinite|alternate/, path);
    // Hidden only inside the keyframes: the base state is the finished mark.
    assert.equal(style.replace(/@keyframes[^}]*\}[^}]*\}\}/, '').match(/opacity/g), null, path);
    assert.doesNotMatch(read(path), /opacity="0"/, path);
  }
});

test('the small mark is still, cropped close, with the open facet a solid Emerald stroke', () => {
  const text = read('brand/mark-small.svg');
  assert.doesNotMatch(text, /<style|animation|dasharray/);
  const open = walk(parseSvg(text)).find((n) => n.name === 'path' && n.attrs.fill === 'none')!;
  assert.deepEqual([open.attrs.d, open.attrs.stroke, open.attrs['stroke-width']], ['M60 60L20.2 37L60 14Z', hex('emerald'), '5']);
});

test('the wordmark is LOUPE in Unbounded SemiBold, as paths: Frost on dark, Night on light', () => {
  const data = JSON.parse(read('brand/wordmark-paths.json'));
  assert.deepEqual([data.text, data.font, data.weight, data.letterSpacingEm, data.license], ['LOUPE', 'Unbounded', 600, 0.1, 'SIL Open Font License 1.1']);
  assert.match(data.source, /github\.com\/google\/fonts\/tree\/main\/ofl\/unbounded$/);
  for (const [path, ink] of [['brand/lockup-dark.svg', hex('frost')], ['brand/lockup-light.svg', hex('night')]]) {
    const svg = parseSvg(read(path));
    assert.equal(walk(svg).filter((n) => n.name === 'text').length, 0, `${path}: no live text`);
    const word = walk(svg).find((n) => n.name === 'path' && n.attrs.d === wordmark.d);
    assert.equal(word?.attrs.fill, ink, path);
  }
});

const luminance = (color: string) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
// Page backgrounds the files are shown on: a white page and a typical dark page.
const pages = { light: '#ffffff', dark: '#0d1117' };

test('the palette holds the four colors and five facet shades, in the pairs that read', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(palette).map(([name, c]) => [name, c.hex])), {
    night: '#10151C',
    emerald: '#1F8A6E',
    mint: '#7BD9B8',
    frost: '#E9EEF0',
    'facet-1': '#0E5E4E',
    'facet-2': '#1F8A6E',
    'facet-3': '#2FA383',
    'facet-4': '#57C29D',
    'facet-5': '#7BD9B8',
  });
  for (const { use } of Object.values(palette)) assert.ok(use.length > 0);
  // The open facet must always show. 3 to 1 is the bar for graphics; mint misses it on white, which is why light pages get Emerald.
  assert.ok(contrast(hex('mint'), pages.light) < 3, 'mint is too faint on white');
  for (const page of Object.values(pages)) assert.ok(contrast(hex('emerald'), page) >= 3, `emerald on ${page}`);
  assert.ok(contrast(hex('mint'), pages.dark) >= 3 && contrast(hex('mint'), hex('night')) >= 3, 'mint on dark');
  // Text: 4.5 to 1.
  assert.ok(contrast(hex('night'), pages.light) >= 4.5 && contrast(hex('frost'), pages.dark) >= 4.5, 'text on each page');
  assert.ok(contrast(hex('frost'), hex('facet-1')) >= 4.5, 'text in the Loupe steps');
  assert.ok(contrast(hex('night'), hex('mint')) >= 4.5, 'text in the Automatic steps');
  assert.ok(contrast(hex('frost'), hex('night')) >= 4.5, 'text in the You steps');
});

test('every color in the SVG files comes from the palette', () => {
  const allowed = new Set(Object.values(palette).map((c) => c.hex.toLowerCase()));
  for (const path of svgs) {
    for (const [color] of read(path).matchAll(/#[0-9a-fA-F]{3,8}\b/g)) assert.ok(allowed.has(color.toLowerCase()), `${path}: ${color}`);
  }
});

// Reads a PNG's size, color type and top-left pixel. Row 0's first pixel is stored as is under every filter.
function png(path: string) {
  const data = readFileSync(join(root, path));
  assert.equal(data.subarray(1, 4).toString(), 'PNG', path);
  const idat: Buffer[] = [];
  let [width, height, type] = [0, 0, 0];
  for (let at = 8; at < data.length; ) {
    const length = data.readUInt32BE(at);
    const kind = data.subarray(at + 4, at + 8).toString();
    const body = data.subarray(at + 8, at + 8 + length);
    if (kind === 'IHDR') [width, height, type] = [body.readUInt32BE(0), body.readUInt32BE(4), body[9]];
    if (kind === 'IDAT') idat.push(body);
    at += 12 + length;
  }
  const first = [...inflateSync(Buffer.concat(idat)).subarray(1, 5)];
  return { width, height, type, first };
}

test('the PNG exports: 2x lockups and a 512 mark on transparent backgrounds, and a 1280 by 640 social preview on Night', () => {
  for (const theme of ['dark', 'light']) {
    const svg = parseSvg(read(`brand/lockup-${theme}.svg`));
    const file = png(`brand/png/lockup-${theme}.png`);
    assert.deepEqual([file.width, file.height], [2 * Number(svg.attrs.width), Math.round(2 * Number(svg.attrs.height))], theme);
    assert.equal(file.type, 6, `${theme}: has an alpha channel`);
    assert.equal(file.first[3], 0, `${theme}: transparent`);
  }
  const mark = png('brand/png/mark-512.png');
  assert.deepEqual([mark.width, mark.height, mark.type, mark.first[3]], [512, 512, 6, 0]);
  const social = png('brand/png/social-preview.png');
  assert.deepEqual([social.width, social.height], [1280, 640]);
  const night = [1, 3, 5].map((i) => parseInt(hex('night').slice(i, i + 2), 16));
  assert.deepEqual(social.first.slice(0, 3), night);
  assert.ok(social.type !== 6 || social.first[3] === 255, 'opaque');
});

test('the brand notes show every palette color and its use, every file, and credit Unbounded under the OFL', () => {
  const notes = read('brand/README.md');
  for (const [name, { hex: value, use }] of Object.entries(palette)) {
    assert.ok(notes.includes(`\`${value}\``), `${name}: ${value}`);
    assert.ok(notes.includes(use), `${name}: its use`);
  }
  for (const file of [...Object.keys(render()).filter((p) => p.startsWith('brand/')), 'brand/png/social-preview.png']) assert.ok(notes.includes(file.replace('brand/', '')), file);
  assert.match(notes, /Unbounded/);
  assert.match(notes, /SIL Open Font License/);
});

test('no pixel-art leftovers', () => {
  for (const path of ['README.md', 'brand/README.md', 'scripts/brand.ts', ...svgs]) {
    assert.doesNotMatch(read(path), /pixel|crispEdges|MARK_ROWS|amber|#313859|#12131f/i, path);
  }
});

// The diagram uses a monospace font, so a line's width is its length times the font's character width.
// Common monospace fonts use about 0.6 of the font size per character; 0.62 leaves a margin.
const CHAR = 0.62;
type Box = { x: number; y: number; w: number; h: number; what: string };
const overlaps = (a: Box, b: Box) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
const inside = (a: Box, b: Box) => a.x >= b.x && a.y >= b.y && a.x + a.w <= b.x + b.w && a.y + a.h <= b.y + b.h;
const num = (value: string | undefined) => Number(value ?? 0);

function layout(path: string) {
  const svg = parseSvg(read(path));
  const [, , width, height] = svg.attrs.viewBox.split(' ').map(Number);
  const boxOf = (rect: (typeof svg)['children'][number], what: string): Box => ({ x: num(rect.attrs.x), y: num(rect.attrs.y), w: num(rect.attrs.width), h: num(rect.attrs.height), what });
  const lines = (text: (typeof svg)['children'][number]): Box[] => {
    const size = num(text.attrs['font-size']);
    const spans = text.children.length ? text.children : [text];
    return spans.map((span) => {
      const x = num(span.attrs.x ?? text.attrs.x);
      const w = span.text.length * CHAR * size;
      const left = (text.attrs['text-anchor'] ?? 'start') === 'middle' ? x - w / 2 : x;
      return { x: left, y: num(span.attrs.y ?? text.attrs.y) - 0.8 * size, w, h: 1.05 * size, what: span.text };
    });
  };
  const steps = walk(svg).filter((n) => n.name === 'g' && /\bbox\b/.test(n.attrs.class ?? ''));
  const boxes = steps.map((g) => ({ g, box: boxOf(g.children.find((c) => c.name === 'rect')!, g.children.find((c) => c.name === 'text')!.children.map((s) => s.text).join(' ')) }));
  const swatches = walk(svg).filter((n) => n.name === 'rect' && n.attrs.class === 'swatch').map((r) => boxOf(r, 'legend swatch'));
  const loose = walk(svg).filter((n) => n.name === 'text' && !steps.some((g) => g.children.includes(n))).flatMap(lines);
  return { svg, width, height, boxes, swatches, loose, lines };
}

for (const theme of ['light', 'dark']) {
  const path = `docs/img/how-it-works-${theme}.svg`;

  test(`${path}: no text overflows its box, and no boxes overlap`, () => {
    const { width, height, boxes, swatches, loose, lines } = layout(path);
    const all = [...boxes.map((b) => b.box), ...swatches];
    assert.ok(boxes.length >= 7, 'every step has a box');
    for (const { g, box } of boxes) {
      const pad = { x: box.x + 8, y: box.y + 4, w: box.w - 16, h: box.h - 8, what: 'padding' };
      for (const line of lines(g.children.find((c) => c.name === 'text')!)) assert.ok(inside(line, pad), `"${line.what}" overflows its box`);
    }
    for (const [i, a] of all.entries()) {
      assert.ok(inside(a, { x: 0, y: 0, w: width, h: height, what: 'the image' }), `${a.what} is outside the image`);
      for (const b of all.slice(i + 1)) assert.ok(!overlaps(a, b), `"${a.what}" overlaps "${b.what}"`);
    }
    for (const line of loose) {
      assert.ok(inside(line, { x: 0, y: 0, w: width, h: height, what: 'the image' }), `"${line.what}" is outside the image`);
      for (const box of all) assert.ok(!overlaps(line, box), `"${line.what}" overlaps "${box.what}"`);
    }
  });

  test(`${path}: every step is colored by who does it, with a legend`, () => {
    const { svg, boxes } = layout(path);
    const text = walk(svg).filter((n) => n.name === 'text' || n.name === 'tspan').map((n) => n.text).join(' ');
    for (const label of ['You', 'Loupe (the model)', 'Automatic (the checker)']) assert.ok(text.includes(label), label);
    const legend = Object.fromEntries(walk(svg).filter((n) => n.attrs.class === 'swatch').map((r) => [r.attrs['data-owner'], r.attrs.fill]));
    assert.deepEqual(Object.keys(legend).sort(), ['automatic', 'loupe', 'you']);
    for (const { g, box } of boxes.filter(({ g }) => g.attrs['data-owner'])) {
      assert.equal(g.children.find((c) => c.name === 'rect')!.attrs.fill, legend[g.attrs['data-owner']], box.what);
    }
    const flow = boxes.map((b) => b.box.what).join(' | ');
    for (const words of ['context files', 'every fact with its source', 'note, transcript, ticket or email', 'Readiness check', 'Not ready yet', "team's template", 'until it passes', 'reread against its source', 'You get the story']) {
      assert.ok(flow.includes(words), `the diagram says "${words}"`);
    }
  });
}

test('the diagram marks known steps with Emerald edges, and the unknown path with a dashed outline in the open facet color', () => {
  for (const theme of ['light', 'dark'] as const) {
    const svg = parseSvg(read(`docs/img/how-it-works-${theme}.svg`));
    const groups = walk(svg).filter((n) => n.name === 'g' && /\bbox\b/.test(n.attrs.class ?? ''));
    const rect = (g: (typeof groups)[number]) => g.children.find((c) => c.name === 'rect')!;
    for (const g of groups.filter((g) => g.attrs['data-owner'])) assert.equal(rect(g).attrs.stroke, hex('emerald'), theme);
    const note = groups.find((g) => g.attrs.class === 'box note')!;
    assert.deepEqual([rect(note).attrs.stroke, rect(note).attrs.fill, rect(note).attrs['stroke-dasharray']], [OPEN_STROKE[theme], 'none', '4 3'], theme);
    const text = walk(svg).filter((n) => n.name === 'text').map((n) => n.attrs.fill).filter(Boolean);
    assert.ok(text.includes(theme === 'light' ? hex('night') : hex('frost')), `${theme}: page text`);
  }
});
