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

export function render(): Record<string, string> {
  return {
    'brand/mark.svg': mark(),
    'brand/lockup-light.svg': lockup('light'),
    'brand/lockup-dark.svg': lockup('dark'),
  };
}

if (import.meta.main) {
  for (const [path, text] of Object.entries(render())) writeFileSync(new URL(path, root), text);
}
