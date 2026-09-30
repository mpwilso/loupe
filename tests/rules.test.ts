import assert from 'node:assert/strict';
import { test } from 'node:test';
import { setSpecs, specs } from '../src/check.ts';
import { contextSpec, setContextSpec } from '../src/check-context.ts';
import { badCases } from './cases.ts';

type Node = Record<string, unknown> | unknown[];
type Path = (string | number)[];

const isMessage = (key: string, parent: string | number | undefined) =>
  key === 'message' || key.endsWith('Message') || parent === 'messages';

// A rule is anything with a message, plus any pattern in a list that has no message of its own, like each secret.
// Usage errors live under "errors" and are not rules.
function rulesIn(node: unknown, path: Path = []): Path[] {
  if (Array.isArray(node)) {
    return node.flatMap((item, i) => {
      const own = item && typeof item === 'object' && 'pattern' in item && !Object.keys(item).some((k) => isMessage(k, i));
      return [...(own ? [[...path, i]] : []), ...rulesIn(item, [...path, i])];
    });
  }
  if (!node || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) => {
    if (key === 'errors') return [];
    if (typeof value === 'string' && isMessage(key, path.at(-1))) return [[...path, key]];
    return rulesIn(value, [...path, key]);
  });
}

function without<T>(spec: T, path: Path): T {
  const copy = structuredClone(spec);
  const parent = path.slice(0, -1).reduce<Node>((node, key) => (node as Record<string, Node>)[key], copy as Node);
  const last = path.at(-1)!;
  if (Array.isArray(parent)) parent.splice(Number(last), 1);
  else delete parent[last];
  return copy;
}

const files = [
  { file: 'story-shape.json', spec: specs.story, use: (s: typeof specs.story) => setSpecs({ ...specs, story: s }) },
  { file: 'readiness.json', spec: specs.readiness, use: (s: typeof specs.readiness) => setSpecs({ ...specs, readiness: s }) },
  { file: 'plain-language.json', spec: specs.plain, use: (s: typeof specs.plain) => setSpecs({ ...specs, plain: s }) },
  { file: 'context-file.json', spec: contextSpec, use: setContextSpec },
] as const;

const failing = () => badCases.filter((c) => c.problems().length > 0).map((c) => c.name);

test('every bad case fails with the full spec', () => {
  assert.deepEqual(failing(), badCases.map((c) => c.name));
});

test('every rule in spec/ bites: switching it off lets at least one bad case pass', () => {
  const all = failing();
  const untested: string[] = [];
  let count = 0;
  for (const { file, spec, use } of files) {
    for (const path of rulesIn(spec)) {
      count++;
      (use as (s: unknown) => void)(without(spec, path));
      try {
        if (failing().length === all.length) untested.push(`${file} ${path.join('.')}`);
      } finally {
        (use as (s: unknown) => void)(spec);
      }
    }
  }
  assert.ok(count > 40, `found only ${count} rules`);
  assert.deepEqual(untested, [], `No bad case notices these rules switched off:\n${untested.join('\n')}`);
});
