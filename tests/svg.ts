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
