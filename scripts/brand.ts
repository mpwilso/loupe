// Draws Loupe's Facet mark, lockups and "how it works" diagram as SVG from code, from brand/palette.json
// and brand/wordmark-paths.json, so nothing is traced or hand-edited.
// Usage: node scripts/brand.ts   (writes every file in render() to the repo)
import { readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const json = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
export const palette: Record<string, { hex: string; use: string }> = json('brand/palette.json');
export const wordmark: { d: string; capHeight: number; box: { x: number; y: number; width: number; height: number } } = json('brand/wordmark-paths.json');
const C = Object.fromEntries(Object.entries(palette).map(([name, { hex }]) => [name, hex]));

type Theme = 'light' | 'dark';

// The mark: a hexagon of radius 46 around (60, 60), split into six facets from the center.
// Facets 1 to 5 are filled, clockwise from the top. Facet 6 stays open: the unknown.
export const CENTER = [60, 60] as const;
export const VERTICES = [
  [60, 14],
  [99.8, 37],
  [99.8, 83],
  [60, 106],
  [20.2, 83],
  [20.2, 37],
] as const;
// Facet n runs from the center to vertices n - 1 and n; facet 6 closes the ring, from (20.2, 37) back to the top.
const facet = (n: number) => {
  const [a, b] = [VERTICES[(n - 1) % 6], VERTICES[n % 6]];
  return `M${CENTER.join(' ')}L${a.join(' ')}L${b.join(' ')}Z`;
};
export const FACETS = [1, 2, 3, 4, 5].map((n) => ({ n, d: facet(n), fill: C[`facet-${n}`] }));
export const OPEN = facet(6);
// Mint has too little contrast on a light page, so the open facet's stroke is Emerald there.
export const OPEN_STROKE: Record<Theme, string> = { dark: C.mint, light: C.emerald };

// The light pass: every filled facet rests at full opacity, dims briefly and comes back, one after another,
// clockwise. Nothing ever starts hidden, so a viewer that doesn't run the animation (a hidden tab, a paused
// timeline) still sees the complete mark. The open facet never moves.
// One cycle, in seconds: the pass takes about 0.9s, then the mark rests. Set it to 0 to turn the pass off.
export const CYCLE_SECONDS = 10;
// "*" alone would lose to the .facet and .fN rules on specificity, so the reduced-motion rule needs !important.
export const ANIMATION = CYCLE_SECONDS
  ? `<style>.facet{animation-name:pass;animation-duration:${CYCLE_SECONDS}s;animation-timing-function:ease-in-out;animation-iteration-count:infinite;animation-fill-mode:none}` +
    FACETS.map(({ n }) => `.f${n}{animation-delay:${((n - 1) * 12) / 100}s}`).join('') +
    '@keyframes pass{0%{opacity:1}4%{opacity:.4}9%{opacity:1}100%{opacity:1}}' +
    '@media (prefers-reduced-motion: reduce){*{animation:none!important}}</style>'
  : '';

function markBody(theme: Theme): string {
  const facets = FACETS.map(({ n, d, fill }) => `<path class="facet f${n}" d="${d}" fill="${fill}"/>`).join('');
  const open = `<path d="${OPEN}" fill="none" stroke="${OPEN_STROKE[theme]}" stroke-width="2.5" stroke-dasharray="4 4" stroke-linejoin="round"/>`;
  return ANIMATION + facets + open;
}

const round = (n: number) => Math.round(n * 100) / 100;
const svg = (viewBox: string, width: number, height: number, label: string, body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="${round(width)}" height="${round(height)}" role="img" aria-label="${label}"><title>${label}</title>${body}</svg>\n`;

export function mark(theme: Theme): string {
  return svg('0 0 120 120', 120, 120, 'Loupe', markBody(theme));
}

// For 32px and under: still, cropped close to the hexagon, and the open facet drawn solid,
// since dashes vanish when this small.
export function markSmall(): string {
  const facets = FACETS.map(({ d, fill }) => `<path d="${d}" fill="${fill}"/>`).join('');
  const open = `<path d="${OPEN}" fill="none" stroke="${C.emerald}" stroke-width="5" stroke-linejoin="round"/>`;
  return svg('8 8 104 104', 32, 32, 'Loupe', facets + open);
}

// The mark and the word LOUPE, set in Unbounded SemiBold and stored as paths, since an image can't load a web font.
const WORD = { x: 126, cap: 36 };
export function lockup(theme: Theme): string {
  const scale = WORD.cap / wordmark.capHeight;
  const top = 60 - WORD.cap / 2;
  const width = WORD.x + wordmark.box.width * scale;
  const ink = theme === 'light' ? C.night : C.frost;
  const word = `<path transform="translate(${WORD.x} ${top}) scale(${round(scale * 10000) / 10000})" fill="${ink}" d="${wordmark.d}"/>`;
  return svg(`14 10 ${round(width)} 100`, 360, (360 * 100) / width, 'Loupe', markBody(theme) + word);
}

// How it works: one column of steps, top to bottom, each colored by who does it.
type Owner = 'you' | 'loupe' | 'automatic';
export const LABELS: Record<Owner, string> = { you: 'You', loupe: 'Loupe (the model)', automatic: 'Automatic (the checker)' };
const OWNERS: Record<Theme, Record<Owner, { fill: string; ink: string }>> = {
  light: { you: { fill: C.night, ink: C.frost }, loupe: { fill: C['facet-1'], ink: C.frost }, automatic: { fill: C.mint, ink: C.night } },
  dark: { you: { fill: C.frost, ink: C.night }, loupe: { fill: C['facet-1'], ink: C.frost }, automatic: { fill: C.mint, ink: C.night } },
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
export const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

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

// Emerald edges mark the steps that handle known facts. The unknown path, "Not ready yet", has a dashed outline
// in the same color as the mark's open facet.
export function diagram(theme: Theme): string {
  const ink = theme === 'light' ? C.night : C.frost;
  const owners = OWNERS[theme];
  const size = 13;
  const pad = 14;
  const column = { x: 24, w: 392 };
  const note = { x: 456, w: 180, size: 12 };
  const chars = (w: number, fontSize: number) => Math.floor((w - 2 * pad) / (0.62 * fontSize));
  const height = (lines: number, fontSize: number) => Math.ceil(lines * fontSize * 1.4 + 2 * 10);
  const parts: string[] = [];

  // The legend: one swatch per owner, in a row across the top.
  let x = column.x;
  for (const [key, label] of Object.entries(LABELS) as [Owner, string][]) {
    parts.push(`<rect class="swatch" data-owner="${key}" x="${x}" y="16" width="14" height="14" rx="3" fill="${owners[key].fill}" stroke="${C.emerald}"/>`);
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
    const { fill, ink: color } = owners[owner];
    const lines = wrap(text, chars(column.w, size));
    const h = height(lines.length, size);
    parts.push(
      `<g class="box" data-owner="${owner}"><rect x="${column.x}" y="${y}" width="${column.w}" height="${h}" rx="4" fill="${fill}" stroke="${C.emerald}" stroke-width="1.5"/>` +
        `${textBlock(lines, column.x + pad, y + 10, size, color)}</g>`,
    );
    if (i === READINESS) {
      const noteLines = wrap(THIN, chars(note.w, note.size));
      const noteH = height(noteLines.length, note.size);
      const noteY = y + h / 2 - noteH / 2;
      parts.push(
        `<g class="box note"><rect x="${note.x}" y="${noteY}" width="${note.w}" height="${noteH}" rx="4" fill="none" stroke="${OPEN_STROKE[theme]}" stroke-width="1.5" stroke-dasharray="4 3"/>` +
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
  return svg(`0 0 ${width} ${y + 16}`, width, y + 16, label, parts.join(''));
}

export function render(): Record<string, string> {
  return {
    'brand/mark.svg': mark('dark'),
    'brand/mark-light.svg': mark('light'),
    'brand/mark-small.svg': markSmall(),
    'brand/lockup-dark.svg': lockup('dark'),
    'brand/lockup-light.svg': lockup('light'),
    'docs/img/how-it-works-light.svg': diagram('light'),
    'docs/img/how-it-works-dark.svg': diagram('dark'),
  };
}

// The PNG exports, rendered outside the repo so the project keeps no dependencies. Each is the final, fully filled
// frame: the animation's style is taken out, and the base state is the finished mark.
export const still = (text: string) => text.replace(/<style>[\s\S]*?<\/style>/, '');
export const SOCIAL = { width: 1280, height: 640, lockupWidth: 720 };
export function pngSources(): Record<string, { svg: string; width: number }> {
  const dark = still(lockup('dark'));
  const viewBox = dark.match(/viewBox="([^"]+)"/)![1];
  const [, , w, h] = viewBox.split(' ').map(Number);
  const { width, height, lockupWidth } = SOCIAL;
  const lockupHeight = (lockupWidth * h) / w;
  const inner = dark.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\n$/, '');
  const social =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">` +
    `<rect width="${width}" height="${height}" fill="${C.night}"/>` +
    `<svg x="${round((width - lockupWidth) / 2)}" y="${round((height - lockupHeight) / 2)}" width="${lockupWidth}" height="${round(lockupHeight)}" viewBox="${viewBox}">${inner}</svg></svg>`;
  return {
    'brand/png/lockup-dark.png': { svg: dark, width: 720 },
    'brand/png/lockup-light.png': { svg: still(lockup('light')), width: 720 },
    'brand/png/mark-512.png': { svg: still(mark('dark')), width: 512 },
    'brand/png/social-preview.png': { svg: social, width },
  };
}

if (import.meta.main) {
  for (const [path, text] of Object.entries(render())) writeFileSync(new URL(path, root), text);
}
