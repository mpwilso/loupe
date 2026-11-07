// Judges a look's command before it runs: one read command from a short list, with no shell characters, its options
// from that tool's list, and each placeholder where a value can't change what runs. The tools, their options and the
// messages are data in spec/context-file.json, under looks. It judges words, never the whole line by pattern.
// It is a guard on names and forms, not proof: a SELECT can call a function that writes, and a host named staging can
// point anywhere. A person still reads every look, and Claude Code asks before each one runs.
import { fill } from './spec.ts';

type Message = string | undefined;
export type ToolRules = {
  kind: 'url' | 'sql' | 'kubectl';
  verbs?: string[];
  methods?: string[];
  flags: string[];
  values: string[];
  choices?: Record<string, string[]>;
  query?: string[];
  hosts?: string[];
  databases?: string[];
  database?: { plain: string; uri?: string; uriExample?: string };
  required?: { option: string; options: string[]; why: string };
  refused?: Record<string, string>;
};
export type CommandRules = {
  anywhere: string;
  bare: string;
  url: string;
  select: string;
  writeWords: string[];
  aliases: Record<string, string>;
  tools: Record<string, ToolRules>;
  shellMessage?: Message;
  unquotedMessage?: Message;
  quoteMessage?: Message;
  toolMessage?: Message;
  verbMessage?: Message;
  refusedOptionMessage?: Message;
  optionMessage?: Message;
  clusterMessage?: Message;
  valueMessage?: Message;
  choiceMessage?: Message;
  requiredMessage?: Message;
  urlMessage?: Message;
  urlCountMessage?: Message;
  methodMessage?: Message;
  credentialsMessage?: Message;
  productionMessage?: Message;
  queryCountMessage?: Message;
  selectMessage?: Message;
  writeWordMessage?: Message;
  databaseMessage?: Message;
  secretResourceMessage?: Message;
  placeholderMessage?: Message;
};
export type Shape = { pattern: string; realDate?: boolean; example: string; message?: Message };
export type LookRules = {
  productionWords: string[];
  placeholder: string;
  defaultShape: string;
  shapes: Record<string, Shape>;
  shapeMessage?: Message;
  command: CommandRules;
};

// The parts of a name, split at anything but a letter or digit, between letters and digits, and where a lower-case
// letter meets a capital: "prod_us" is prod and us, "PROD2" is PROD and 2, "updateOne" is update and One.
export function wordParts(text: string): string[] {
  return text
    .split(/[^A-Za-z0-9]+/)
    .flatMap((word) => word.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Za-z])(?=\d)|(?<=\d)(?=[A-Za-z])/))
    .filter(Boolean);
}

// A name is like production when one of its parts is a production word, in any case. A part that only holds one, like
// "products" or "delivery", is not.
export const productionLike = (name: string, words: string[]) => wordParts(name).some((part) => words.includes(part.toLowerCase()));

export type Placeholder = { name: string; shape: string };
export const placeholdersIn = (template: string, rules: LookRules): Placeholder[] =>
  [...template.matchAll(new RegExp(rules.placeholder, 'g'))].map((m) => ({ name: m[1], shape: m[2] ?? rules.defaultShape }));

// While a look is judged as written in looks.md, each placeholder stands as one private-use character, so it is
// never read as text a shell could act on, and its place in its word can be checked.
const MARK = 0xe100;
const isMark = (c: string) => c.charCodeAt(0) >= MARK && c.charCodeAt(0) < MARK + 256;

type Word = { text: string };
type Add = (message: Message, vars?: Record<string, string | number>) => void;
const list = (items: string[], last: string) => (items.length > 1 ? `${items.slice(0, -1).join(', ')} ${last} ${items.at(-1)}` : items.join(''));

// The splitter: reads a command into words the way a POSIX shell does, for the few forms a look may take.
// - A space or a tab outside quotes ends a word.
// - Inside '...' or "...", every character is kept as written. That holds for "..." too, because $, ` and \, the
//   characters a shell still reads there, are refused anywhere.
// - A quote joins the text next to it, so -c"SELECT 1" is one word, as in a shell. An empty '' is a word.
// - & | < > ` $ \ and a new line are refused anywhere, so &&, || and heredocs are too. ; is refused outside quotes;
//   inside them it is kept, and the checks refuse it anywhere but at the end of a query. ( ) { } * ? [ ] # ~ ! are
//   refused outside quotes, where a shell would read them.
// Each kind of refusal is told once, at its first character. A refused character is left out of its word.
function splitWords(text: string, C: CommandRules, add: Add): Word[] {
  const words: Word[] = [];
  const told = new Set<Message>();
  const once = (message: Message, vars: Record<string, string> = {}) => {
    if (!told.has(message)) add(message, vars);
    told.add(message);
  };
  let word: Word | undefined;
  let quote: string | undefined;
  for (const c of text) {
    if (c === '\n' || c === '\r') once(C.shellMessage, { char: 'a new line' });
    else if (C.anywhere.includes(c)) once(C.shellMessage, { char: `"${c}"` });
    else if (quote) {
      if (c === quote) quote = undefined;
      else word!.text += c;
    } else if (c === "'" || c === '"') {
      quote = c;
      word ??= { text: '' };
    } else if (c === ' ' || c === '\t') {
      if (word) words.push(word);
      word = undefined;
    } else if (c === ';') once(C.shellMessage, { char: '";"' });
    else if (C.bare.includes(c)) once(C.unquotedMessage, { char: c });
    else (word ??= { text: '' }).text += c;
  }
  if (quote) add(C.quoteMessage);
  if (word) words.push(word);
  return words;
}

// The host a URL names, and whether it holds a password, as in http://user:password@host.
function authority(url: string): { host: string; password: boolean } {
  const part = /^[A-Za-z][A-Za-z0-9+.-]*:\/\/([^/?#]*)/.exec(url)?.[1] ?? '';
  const at = part.lastIndexOf('@');
  return { host: part.slice(at + 1).replace(/:\d*$/, ''), password: at >= 0 && part.slice(0, at).includes(':') };
}

// A placeholder in a URL may sit in its path or in a query value, never in its host, a query name or a fragment.
function inUrlPath(url: string, at: number): boolean {
  const start = url.indexOf('://') + 3;
  const rest = url.slice(start).search(/[/?#]/);
  const hostEnd = rest < 0 ? url.length : start + rest;
  const hash = url.indexOf('#');
  const query = url.indexOf('?');
  if (at < hostEnd || (hash >= 0 && at > hash)) return false;
  if (query < 0 || at < query) return true;
  const equals = url.indexOf('=', query);
  return equals >= 0 && equals < at;
}

// A placeholder in a query may sit only inside a single-quoted literal, like WHERE box = '{box}'. A '' inside one is
// a quote, and flips twice, so it leaves the count as it was.
const inLiteral = (query: string, at: number) => [...query.slice(0, at)].filter((c) => c === "'").length % 2 === 1;

// The problems with a command, each a whole message. template: judge it as written in looks.md, placeholders and all;
// otherwise it is a filled command, about to run, and a brace is just a brace.
export function commandProblems(command: string, rules: LookRules, template = false): string[] {
  const C = rules.command;
  const problems: string[] = [];
  const add: Add = (message, vars = {}) => {
    const text = fill(message, vars);
    if (text && !problems.includes(text)) problems.push(text);
  };
  const marks: string[] = [];
  let text = command;
  if (template) {
    text = command.replace(new RegExp(rules.placeholder, 'g'), (whole, _name: string, shape: string | undefined) => {
      if (shape !== undefined && !Object.hasOwn(rules.shapes, shape)) add(rules.shapeMessage, { shape, shapes: list(Object.keys(rules.shapes), 'and') });
      marks.push(whole);
      return String.fromCharCode(MARK + marks.length - 1);
    });
  }
  const shown = (t: string) => [...t].map((c) => (isMark(c) ? marks[c.charCodeAt(0) - MARK] : c)).join('');
  const words = splitWords(text, C, add);
  if (problems.length || !words.length) return problems;

  const [first, ...rest] = words;
  const name = C.aliases[first.text] ?? first.text;
  const tool = Object.hasOwn(C.tools, name) ? C.tools[name] : undefined;
  if (!tool) {
    add(C.toolMessage, { tool: shown(first.text) });
    return problems;
  }
  const vars = { tool: first.text };
  let args = rest;
  if (tool.verbs) {
    const verb = args[0]?.text ?? '';
    if (!tool.verbs.includes(verb)) {
      add(C.verbMessage, { verb: shown(verb), verbs: list(tool.verbs, 'or') });
      return problems;
    }
    args = args.slice(1);
  }

  // Options, judged one word at a time. Short options may be joined, like -sS, when each is a flag on its own list.
  type Given = { option: string; value: string; word: Word; offset: number };
  const given: Given[] = [];
  const seen = new Set<string>();
  const positional: Word[] = [];
  const flags = new Set(tool.flags);
  const choices = tool.choices ?? {};
  const refused = tool.refused ?? {};
  const takesValue = (option: string) => tool.values.includes(option) || Object.hasOwn(choices, option);
  let unsure = false; // once an option is refused, which words are values is a guess, so the URL and query checks wait
  const refuse: Add = (message, v) => {
    unsure = true;
    add(message, v);
  };
  for (let i = 0; i < args.length; i++) {
    const word = args[i];
    const t = word.text;
    if (!t.startsWith('-') || t === '-') {
      positional.push(word);
      continue;
    }
    const equals = t.startsWith('--') ? t.indexOf('=') : -1;
    const option = equals > 0 ? t.slice(0, equals) : t;
    if (flags.has(option) && equals < 0) seen.add(option);
    else if (takesValue(option)) {
      const next = equals > 0 ? undefined : args[i + 1];
      if (equals < 0 && !next) refuse(C.valueMessage, { option });
      else if (next) {
        i++;
        given.push({ option, value: next.text, word: next, offset: 0 });
      } else given.push({ option, value: t.slice(equals + 1), word, offset: equals + 1 });
    } else if (Object.hasOwn(refused, option)) refuse(C.refusedOptionMessage, { option, what: refused[option] });
    else if (!t.startsWith('--') && t.length > 2) {
      const letters = [...t.slice(1)];
      const odd = letters.findIndex((l) => !flags.has(`-${l}`));
      if (odd < 0) letters.forEach((l) => seen.add(`-${l}`));
      else {
        const what = refused[`-${letters[odd]}`];
        if (what) refuse(C.refusedOptionMessage, { option: `-${letters[odd]}`, what });
        else refuse(C.clusterMessage, { option: t });
        if (odd === letters.length - 1 && takesValue(`-${letters[odd]}`)) i++;
      }
    } else refuse(C.optionMessage, { ...vars, option: shown(option), options: list([...tool.flags, ...tool.values, ...Object.keys(choices)], 'and') });
  }
  for (const g of given) {
    const allowed = choices[g.option];
    if (allowed && !allowed.includes(g.value)) add(C.choiceMessage, { option: g.option, choices: list(allowed, 'or'), value: shown(g.value) });
  }
  const req = tool.required;
  if (req && !req.options.some((o) => seen.has(o) || given.some((g) => g.option === o))) add(C.requiredMessage, { ...vars, option: req.option, why: req.why });

  // Hosts and the words a placeholder may sit in.
  const production = (host: string) => {
    if (productionLike(host, rules.productionWords)) add(C.productionMessage, { host });
  };
  const hostOf = (value: string) => {
    const { host, password } = authority(value);
    if (password) add(C.credentialsMessage, { token: shown(value) });
    production(host);
  };
  let urlWord: Word | undefined;
  let queryGiven: Given | undefined;
  if (!unsure && tool.kind === 'url') {
    const urls = [...positional];
    if (tool.methods && urls[0] && /^[A-Z]+$/.test(urls[0].text)) {
      const method = urls.shift()!.text;
      if (!tool.methods.includes(method)) add(C.methodMessage, { ...vars, method });
    }
    if (urls.length !== 1) add(C.urlCountMessage, { ...vars, count: urls.length });
    else if (!new RegExp(C.url).test(urls[0].text)) add(C.urlMessage, { ...vars, token: shown(urls[0].text) });
    else {
      urlWord = urls[0];
      hostOf(urlWord.text);
    }
  }
  if (!unsure && tool.kind === 'sql') {
    const queries = given.filter((g) => tool.query?.includes(g.option));
    if (queries.length !== 1) add(C.queryCountMessage, { ...vars, options: list(tool.query ?? [], 'or'), count: queries.length });
    else {
      queryGiven = queries[0];
      const query = queryGiven.value.trim().replace(/;\s*$/, '');
      if (query.includes(';') || !new RegExp(C.select, 'i').test(query)) add(C.selectMessage, { query: shown(queryGiven.value) });
    }
    const db = tool.database;
    const databases = [...positional.map((w) => w.text), ...given.filter((g) => tool.databases?.includes(g.option)).map((g) => g.value)];
    databases.forEach((value, i) => {
      const uri = db?.uri && new RegExp(db.uri).test(value);
      if ((i > 0 && positional.length > 1) || !(uri || (db && new RegExp(db.plain).test(value)))) add(C.databaseMessage, { ...vars, token: shown(value), uri: db?.uriExample ?? '' });
      else if (uri) hostOf(value);
    });
  }
  if (tool.kind === 'kubectl') {
    for (const word of positional) {
      if (word.text.split(',').some((part) => /^secrets?$/i.test(part.split('/')[0].split('.')[0]))) add(C.secretResourceMessage);
    }
  }
  for (const g of given) if (tool.hosts?.includes(g.option)) production(g.value);

  // ";" is kept inside quotes only for the end of a query; anywhere else it is refused, as outside quotes.
  for (const word of args) if (word !== queryGiven?.word && word.text.includes(';')) add(C.shellMessage, { char: '";"' });

  // A placeholder sits in a URL's path or query value, or in a single-quoted literal of the query, and nowhere else.
  for (const word of args) {
    [...word.text].forEach((c, at) => {
      if (!isMark(c)) return;
      const fits =
        (word === urlWord && inUrlPath(word.text, at)) ||
        (queryGiven && word === queryGiven.word && at >= queryGiven.offset && inLiteral(queryGiven.value, at - queryGiven.offset));
      if (!fits) add(C.placeholderMessage, { placeholder: marks[c.charCodeAt(0) - MARK] });
    });
  }

  // A word that writes, as a part of any word: DELETE, updateOne and drop_table all count.
  for (const word of args) {
    for (const part of wordParts(word.text)) {
      if (C.writeWords.includes(part.toLowerCase())) add(C.writeWordMessage, { word: part, words: list(C.writeWords.map((w) => w.toUpperCase()), 'or') });
    }
  }
  return problems;
}
