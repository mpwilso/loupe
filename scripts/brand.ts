// Draws Loupe's mark and lockup as SVG from code, on a pixel grid, so nothing is traced or hand-edited.
// Usage: node scripts/brand.ts   (writes every file in render() to the repo)
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
export const palette: Record<string, { hex: string; use: string }> = JSON.parse(readFileSync(new URL('brand/palette.json', root), 'utf8'));
const C = Object.fromEntries(Object.entries(palette).map(([name, { hex }]) => [name, hex]));

// A jeweler's loupe, its round lens showing a magnified sparkle of the cut gem below it. 16 by 16, one letter per pixel.
// k outline, t tile, g gold, a amber, l glass, w white.
export const MARK_ROWS = [
  'kkkkkkkkkkkkkkkk',
  'kttttttttttttttk',
  'ktttkkkkkttttttk',
  'kttkgggggktttttk',
  'ktkglwlllgkttttk',
  'ktkgwllllgkttttk',
  'ktkglllalgkttttk',
  'ktkgllaaagkttttk',
  'ktkglllalgkttttk',
  'kttkgggggktttttk',
  'ktttkkkkktkktttk',
  'kttttttttkawkttk',
  'ktttttttkaaaaktk',
  'kttttttttkgakttk',
  'kttttttttttkkttk',
  'kkkkkkkkkkkkkkkk',
];
const PIXEL: Record<string, string> = { k: 'outline', t: 'tile', g: 'gold', a: 'amber', l: 'glass', w: 'white' };

// One rect per run of same-colored pixels in a row. Every coordinate is a whole number.
export function markBody(): string {
  return MARK_ROWS.map((row, y) => {
    if (row.length !== 16) throw new Error(`mark row ${y} is ${row.length} pixels wide`);
    return [...row.matchAll(/(.)\1*/g)]
      .map((run) => `<rect x="${run.index}" y="${y}" width="${run[0].length}" height="1" fill="${C[PIXEL[run[1]]]}"/>`)
      .join('');
  }).join('');
}

const svg = (viewBox: string, width: number, height: number, label: string, body: string, crisp = true) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${width}" height="${height}"${crisp ? ' shape-rendering="crispEdges"' : ''} role="img" aria-label="${label}"><title>${label}</title>${body}</svg>\n`;

export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const INK = { light: C.outline, dark: C.cream };

export function mark(): string {
  return svg('0 0 16 16', 64, 64, 'Loupe', markBody());
}

// The mark and the word. An image can't see the page's theme, so there is one file per theme.
export function lockup(theme: 'light' | 'dark'): string {
  const word = `<text x="20" y="12.2" font-family="${MONO}" font-size="11" font-weight="600" fill="${INK[theme]}">Loupe</text>`;
  return svg('0 0 54 16', 216, 64, 'Loupe', markBody() + word);
}

// How it works: one column of steps, top to bottom, each colored by who does it.
type Owner = 'you' | 'loupe' | 'automatic';
export const OWNERS: Record<Owner, { label: string; fill: string; ink: string }> = {
  you: { label: 'You', fill: C.tile, ink: C.white },
  loupe: { label: 'Loupe (the model)', fill: C.amber, ink: C.outline },
  automatic: { label: 'Automatic (the checker)', fill: C.gold, ink: C.white },
};
export const STEPS: [Owner, string][] = [
  ['loupe', "Setup, once: your team's documents become context files, every fact with its source"],
  ['you', 'A note, transcript, ticket or email comes in'],
  ['loupe', 'Readiness check: enough to build from?'],
  ['loupe', "Written in your team's template"],
  ['automatic', 'The checker checks the shape. Loupe fixes and reruns until it passes'],
  ['loupe', 'Every known fact reread against its source'],
  ['you', 'You get the story'],
];
const READINESS = 2;
const THIN = 'Too thin: "Not ready yet", with the questions to ask';

// Each line fits its box: a monospace character is about 0.6 of the font size, and the tests allow 0.62.
const wrap = (text: string, chars: number) =>
  text.split(' ').reduce<string[]>((lines, word) => {
    const last = lines.at(-1);
    if (last !== undefined && `${last} ${word}`.length <= chars) lines[lines.length - 1] = `${last} ${word}`;
    else lines.push(word);
    return lines;
  }, []);
const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;');

function textBlock(lines: string[], x: number, top: number, size: number, ink: string): string {
  const spans = lines.map((line, i) => `<tspan x="${x}" y="${(top + 0.8 * size + i * size * 1.4).toFixed(1)}">${escape(line)}</tspan>`).join('');
  return `<text font-family="${MONO}" font-size="${size}" fill="${ink}">${spans}</text>`;
}

export function diagram(theme: 'light' | 'dark'): string {
  const ink = INK[theme];
  const edge = theme === 'light' ? C.outline : C.glass;
  const size = 13;
  const pad = 14;
  const column = { x: 24, w: 392 };
  const note = { x: 456, w: 180, size: 12 };
  const chars = (w: number, fontSize: number) => Math.floor((w - 2 * pad) / (0.62 * fontSize));
  const height = (lines: number, fontSize: number) => Math.ceil(lines * fontSize * 1.4 + 2 * 10);
  const parts: string[] = [];

  // The legend: one swatch per owner, in a row across the top.
  let x = column.x;
  for (const [key, { label, fill }] of Object.entries(OWNERS)) {
    parts.push(`<rect class="swatch" data-owner="${key}" x="${x}" y="16" width="14" height="14" rx="3" fill="${fill}" stroke="${edge}"/>`);
    parts.push(`<text x="${x + 22}" y="27.5" font-family="${MONO}" font-size="12" fill="${ink}">${escape(label)}</text>`);
    x += 22 + Math.ceil(label.length * 0.62 * 12) + 24;
  }

  let y = 56;
  const center = column.x + column.w / 2;
  const arrow = (x1: number, y1: number, x2: number, y2: number) => {
    const [dx, dy] = [Math.sign(x2 - x1), Math.sign(y2 - y1)];
    const head = `${x2},${y2} ${x2 - 5 * dx - 4 * dy},${y2 - 5 * dy - 4 * dx} ${x2 - 5 * dx + 4 * dy},${y2 - 5 * dy + 4 * dx}`;
    return `<line x1="${x1}" y1="${y1}" x2="${x2 - 5 * dx}" y2="${y2 - 5 * dy}" stroke="${ink}" stroke-width="1.5"/><polygon points="${head}" fill="${ink}"/>`;
  };
  STEPS.forEach(([owner, text], i) => {
    const { fill, ink: color } = OWNERS[owner];
    const lines = wrap(text, chars(column.w, size));
    const h = height(lines.length, size);
    parts.push(
      `<g class="box" data-owner="${owner}"><rect x="${column.x}" y="${y}" width="${column.w}" height="${h}" rx="4" fill="${fill}" stroke="${edge}"/>` +
        `${textBlock(lines, column.x + pad, y + 10, size, color)}</g>`,
    );
    if (i === READINESS) {
      const noteLines = wrap(THIN, chars(note.w, note.size));
      const noteH = height(noteLines.length, note.size);
      const noteY = y + h / 2 - noteH / 2;
      const accent = theme === 'light' ? C.gold : C.amber;
      parts.push(
        `<g class="box note"><rect x="${note.x}" y="${noteY}" width="${note.w}" height="${noteH}" rx="4" fill="none" stroke="${accent}" stroke-width="1.5" stroke-dasharray="4 3"/>` +
          `${textBlock(noteLines, note.x + pad, noteY + 10, note.size, ink)}</g>`,
      );
      parts.push(arrow(column.x + column.w, y + h / 2, note.x, y + h / 2));
    }
    y += h;
    if (i < STEPS.length - 1) {
      parts.push(arrow(center, y, center, y + 28));
      if (i === READINESS) parts.push(`<text x="${center + 10}" y="${y + 18}" font-family="${MONO}" font-size="12" fill="${ink}">Ready</text>`);
      y += 28;
    }
  });

  const width = note.x + note.w + 24;
  const label = 'How Loupe works: setup turns your documents into sourced context files; each input gets a readiness check, a story in your template, the checker until it passes, and a reread of every known fact against its source.';
  return svg(`0 0 ${width} ${y + 16}`, width, y + 16, label, parts.join(''), false);
}

export function render(): Record<string, string> {
  return {
    'brand/mark.svg': mark(),
    'brand/lockup-light.svg': lockup('light'),
    'brand/lockup-dark.svg': lockup('dark'),
    'docs/img/how-it-works-light.svg': diagram('light'),
    'docs/img/how-it-works-dark.svg': diagram('dark'),
  };
}

if (import.meta.main) {
  for (const [path, text] of Object.entries(render())) writeFileSync(new URL(path, root), text);
}
