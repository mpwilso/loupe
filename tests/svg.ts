// A small, strict XML reader for the SVG files we draw. It throws on anything malformed:
// an unclosed or mismatched tag, an unquoted or repeated attribute, a stray "<" or "&".
export type Node = { name: string; attrs: Record<string, string>; children: Node[]; text: string };

export function parseSvg(source: string): Node {
  const root: Node = { name: '#root', attrs: {}, children: [], text: '' };
  const stack = [root];
  let at = 0;
  const fail = (why: string): never => {
    throw new Error(`${why} at character ${at}`);
  };
  while (at < source.length) {
    const open = source.indexOf('<', at);
    const text = source.slice(at, open < 0 ? source.length : open);
    if (/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);)/i.test(text)) fail('a bare "&"');
    stack.at(-1)!.text += text;
    if (open < 0) break;
    at = open;
    if (source.startsWith('<!--', at)) {
      const end = source.indexOf('-->', at);
      if (end < 0) fail('an unclosed comment');
      at = end + 3;
      continue;
    }
    if (source.startsWith('<?xml', at) && at === 0) {
      at = source.indexOf('?>', at) + 2;
      continue;
    }
    const close = source.indexOf('>', at);
    if (close < 0) fail('an unclosed tag');
    const tag = source.slice(at + 1, close);
    at = close + 1;
    if (tag.startsWith('/')) {
      const name = tag.slice(1).trim();
      if (stack.length < 2 || stack.at(-1)!.name !== name) fail(`a closing </${name}> with no matching opening tag`);
      stack.pop();
      continue;
    }
    const selfClosing = tag.endsWith('/');
    const [, name, rest] = tag.replace(/\/$/, '').match(/^([A-Za-z][\w:.-]*)([\s\S]*)$/) ?? fail(`a malformed tag <${tag}>`);
    const attrs: Record<string, string> = {};
    const leftover = rest.replace(/\s+([\w:.-]+)="([^"<]*)"/g, (_, key: string, value: string) => {
      if (key in attrs) fail(`a repeated attribute ${key}`);
      attrs[key] = value;
      return '';
    });
    if (leftover.trim()) fail(`a malformed attribute in <${name}>`);
    const node: Node = { name, attrs, children: [], text: '' };
    stack.at(-1)!.children.push(node);
    if (!selfClosing) stack.push(node);
  }
  if (stack.length > 1) fail(`an unclosed <${stack.at(-1)!.name}>`);
  const elements = root.children;
  if (elements.length !== 1 || elements[0].name !== 'svg') fail('more or less than one root <svg>');
  if (elements[0].attrs.xmlns !== 'http://www.w3.org/2000/svg') fail('a root <svg> without the SVG namespace');
  if (root.text.trim()) fail('text outside the root');
  return elements[0];
}

export const walk = (node: Node): Node[] => [node, ...node.children.flatMap(walk)];

// The wordmark's strokes: flatten the outline, split it into letters, and measure each vertical stroke
// along a horizontal line where that stroke stands alone. y runs down from the top of the capitals.
type Point = [number, number];
function contours(d: string): Point[][] {
  const out: Point[][] = [];
  const tokens = d.match(/[MLQCZ]|-?\d*\.?\d+/g) ?? [];
  let at = 0;
  let pen: Point = [0, 0];
  const num = () => Number(tokens[at++]);
  while (at < tokens.length) {
    const op = tokens[at++];
    if (op === 'M') out.push([(pen = [num(), num()])]);
    else if (op === 'L') out.at(-1)!.push((pen = [num(), num()]));
    else if (op === 'Q' || op === 'C') {
      const pts: Point[] = [pen];
      for (let i = 0; i < (op === 'Q' ? 2 : 3); i++) pts.push([num(), num()]);
      for (let t = 1; t <= 16; t++) {
        let layer = pts;
        while (layer.length > 1) layer = layer.slice(1).map((p, i) => [layer[i][0] + (p[0] - layer[i][0]) * (t / 16), layer[i][1] + (p[1] - layer[i][1]) * (t / 16)]);
        out.at(-1)!.push(layer[0]);
      }
      pen = pts.at(-1)!;
    }
  }
  return out;
}
function letters(d: string): Point[][][] {
  const box = (c: Point[]) => [Math.min(...c.map((p) => p[0])), Math.max(...c.map((p) => p[0]))];
  const groups: Point[][][] = [];
  for (const c of contours(d).sort((a, b) => box(b)[1] - box(b)[0] - (box(a)[1] - box(a)[0]))) {
    const [lo, hi] = box(c);
    const home = groups.find((g) => box(g[0])[0] <= lo && hi <= box(g[0])[1]);
    if (home) home.push(c);
    else groups.push([c]);
  }
  return groups.sort((a, b) => box(a[0])[0] - box(b[0])[0]);
}
const crossings = (letter: Point[][], y: number) =>
  letter
    .flatMap((c) => c.map((p, i) => [p, c[(i + 1) % c.length]] as const))
    .filter(([a, b]) => a[1] <= y !== b[1] <= y)
    .map(([a, b]) => a[0] + ((y - a[1]) / (b[1] - a[1])) * (b[0] - a[0]))
    .sort((a, b) => a - b);
// Where each stroke stands alone, as a share of the cap height: L's stem above its foot, O's left side at
// mid-height, U's left stem above its bowl, P's stem below its bowl, E's stem between its top and middle arms.
export const STEMS = { L: 0.4, O: 0.5, U: 0.3, P: 0.85, E: 0.25 };
export function strokes(d: string, cap: number): Record<string, number> {
  const found = letters(d);
  if (found.length !== 5) throw new Error(`expected five letters, found ${found.length}`);
  return Object.fromEntries(Object.entries(STEMS).map(([name, at], i) => {
    const [left, right] = crossings(found[i], at * cap);
    return [name, Math.round((right - left) * 10) / 10];
  }));
}
