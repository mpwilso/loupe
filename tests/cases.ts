// Every input that must fail a checker: the files under fixtures/bad and fixtures/warn, plus a few built here.
import { readdirSync, readFileSync } from 'node:fs';
import { check } from '../src/check.ts';
import { checkContext } from '../src/check-context.ts';
import { fillLook } from '../src/check-look.ts';
import { checkTickets } from '../src/check-tickets.ts';
import type { Problem } from '../src/spec.ts';

const dir = new URL('fixtures/', import.meta.url);
export const fixture = (name: string) => readFileSync(new URL(name, dir), 'utf8');
const files = (folder: string) => readdirSync(new URL(folder, dir)).filter((f) => f.endsWith('.md')).map((f) => `${folder}${f}`);
export const today = new Date('2026-09-30T00:00:00Z');

// Fake secrets are built here while the test runs, so no file ever holds one and push protection never sees one.
const mix = (length: number) => Array.from({ length }, (_, i) => 'Zq7Xk2Lm9Pw4Rt8Vn3Bc6Hd1Jf5Gs0Ya'[(i * 7) % 32]).join('');
export const withLine = (line: string) => `${fixture('good-context.md')}${line} (engineering lead, 2026-09-01)\n`;
export const shortLookalikes = [
  'The ghp_ prefix marks a GitHub token.',
  'Keys start with sk- and are long.',
  'Short ids like ' + 'ghp_' + mix(10) + ' or ' + 'sk-' + mix(10) + ' are fine.',
  'The stock code AKIA' + mix(8).toUpperCase() + ' is too short.',
];
export const secrets: [string, string][] = [
  ['a cloud access key', 'AKIA' + mix(16).toUpperCase()],
  ['an API key', 'sk-' + mix(48)],
  ['an API key', 'sk-proj-' + mix(40)],
  ['an API key', 'AIza' + mix(35)],
  ['a GitHub token', 'ghp_' + mix(36)],
  ['a GitHub token', 'gho_' + mix(36)],
  ['a GitHub token', 'github_pat_' + mix(22) + '_' + mix(59)],
  ['a Slack token', 'xoxb-' + mix(12) + '-' + mix(24)],
];
export const secretLine = (value: string) => `The staging key is ${value} if you need it.`;
// Credentials sent in a header or a link, each on a line of its own.
export const secretLines: [string, string][] = [
  ['an authorization header', 'Send Authorization: Bearer abc123 with each call.'],
  ['an authorization header', 'Use authorization: basic dXNlcjpwYXNz on staging.'],
  ['an API key header', 'Send X-Api-Key: abc123 with each call.'],
  ['an API key header', 'Send Api-Key: abc123 with each call.'],
  ['an API key header', 'Send api-key=abc123 with each call.'],
  ['a secret or token', 'Open the orders page with ?token=abc123 on staging.'],
  ['a token in a link', 'Open the orders page with ?access_token=abc123 on staging.'],
  ['a token in a link', 'Open the orders page with ?ACCESS_TOKEN=abc123 on staging.'],
];

// An em dash can't live in a tracked file, so that fixture is built here too.
export const emDash = () => fixture('good-story.md').replace('Nothing needed.', 'Nothing\u2014needed.');

const story = (text: string) => check(text).errors;
const context = (text: string, date = today) => {
  const { errors, warnings } = checkContext(text, date);
  return [...errors, ...warnings];
};
// learned.md is checked with the team's other context files, which its "replaces:" lines quote.
export const learnedOptions = () => ({ learned: true, others: [fixture('good-context.md')] });
export const learned = (text: string) => {
  const { errors, warnings } = checkContext(text, today, learnedOptions());
  return [...errors, ...warnings];
};

// looks.md and history.md have entries with fields, like learned.md.
export const looks = (text: string) => {
  const { errors, warnings } = checkContext(text, today, { looks: true });
  return [...errors, ...warnings];
};
export const history = (text: string) => {
  const { errors, warnings } = checkContext(text, today, { history: true });
  return [...errors, ...warnings];
};
// A story checked against the team's history, as check-folder checks it: its Calibration line is verified.
export const calibrated = (text: string) => check(text, undefined, { history: fixture('good-history.md') }).errors;
export const lookStory = () => fixture('good-look-story.md');
const calibration = 'Calibration: "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated.';
export const calibrationCases: [string, string][] = [
  ['a Calibration line saying there is no history file, for a team with one', lookStory().replace(calibration, 'Calibration: none, the team has no history file.')],
  ['a Calibration line naming a story that is not in history.md', lookStory().replace('Send a reminder email two days before the cutoff', 'Send a reminder email')],
  ['a Calibration line with other numbers than history.md', lookStory().replace('took 7 hours', 'took 9 hours')],
];
// One command per refusal, each put in place of a clean look's command, and the start of the one message it gets.
export const refusedRuns: [string, string][] = [
  ['curl -s http://localhost:8765/subscribers/{subscriber}/boxes | head -20', 'The command has "|", which a shell reads as more than text.'],
  ['curl -s http://localhost:8765/a && curl -s http://localhost:8765/b', 'The command has "&"'],
  ['curl -s http://localhost:8765/a || curl -s http://localhost:8765/b', 'The command has "|"'],
  ['curl -s "http://localhost:8765/$(whoami)"', 'The command has "$"'],
  ['curl -s "http://localhost:8765/${HOME}"', 'The command has "$"'],
  ['curl -s "http://localhost:8765/`id`"', 'The command has "`"'],
  ["curl -s 'http://localhost:8765/a\\b'", 'The command has "\\"'],
  ['curl -s http://localhost:8765/a > boxes.json', 'The command has ">"'],
  ['psql -c "SELECT 1" <<END', 'The command has "<"'],
  ['curl -s http://localhost:8765/a; rm -rf build', 'The command has ";"'],
  ["curl -s 'http://localhost:8765/a;b'", 'The command has ";"'],
  ['curl -s http://localhost:8765/boxes?ships=2026-10-09', 'The command has "?" outside quotes'],
  ['curl -s http://localhost:8765/{a,b}', 'The command has "{" outside quotes'],
  ["curl -s 'http://localhost:8765/a", 'The command has a quote that never closes.'],
  ['sqlite3 pellwick_test.db "SELECT count(*) FROM orders"', '"sqlite3" is not a look.'],
  ['/usr/bin/curl -s http://localhost:8765/a', '"/usr/bin/curl" is not a look.'],
  ['mongosh --eval "db.orders.updateOne({})"', '"mongosh" is not a look.'],
  ['curl -s -X POST http://localhost:8765/a', 'In a look, "-X" takes GET, not "POST".'],
  ['curl -s --request=PUT http://localhost:8765/a', 'In a look, "--request" takes GET, not "PUT".'],
  ['curl -sX GET http://localhost:8765/a', '"-sX" joins short options that must stand alone.'],
  ['curl -s -dfoo http://localhost:8765/a', '"-d" sends data, and a look never does.'],
  ['curl -s --data skipped=true http://localhost:8765/a', '"--data" sends data'],
  ['curl -s --json x http://localhost:8765/a', '"--json" sends data'],
  ['curl -s -F box=1 http://localhost:8765/a', '"-F" sends a form'],
  ['curl -s -T notes.txt http://localhost:8765/a', '"-T" uploads a file'],
  ['curl -s -o boxes.json http://localhost:8765/a', '"-o" writes a file'],
  ['curl -s -O http://localhost:8765/a', '"-O" writes a file'],
  ['curl -s -K settings.txt http://localhost:8765/a', '"-K" reads its options from a file'],
  ['curl -s -u reader:staging1 http://localhost:8765/a', '"-u" puts a user name or password in the command'],
  ['curl -s --trace out.txt http://localhost:8765/a', 'curl in a look can\'t use "--trace".'],
  ['curl -s http://localhost:8765/a -H', '"-H" needs a value after it.'],
  ['curl -s file:///etc/passwd', 'curl in a look reads a full URL'],
  ['curl -s http://localhost:8765/a http://localhost:8765/b', 'curl in a look reads one URL, and this one has 2.'],
  ['curl -s http://reader:staging1@localhost:8765/a', '"http://reader:staging1@localhost:8765/a" holds a password.'],
  ['curl -s http://api.prod.pellwick.test/subscribers/{subscriber}', '"api.prod.pellwick.test" looks like production.'],
  ['curl -s http://localhost:8765/subscribers/{subscriber}/delete', 'The command has "delete", a word that writes'],
  ['curl -s http://localhost:8765/orders/updateOne', 'The command has "update", a word that writes'],
  ['wget -q http://localhost:8765/a', 'wget in a look needs -O -'],
  ['wget -q -O boxes.json http://localhost:8765/a', 'In a look, "-O" takes -, not "boxes.json".'],
  ['wget -q -O - --post-data a=b http://localhost:8765/a', '"--post-data" sends data'],
  ['wget -q -O - --method=PUT http://localhost:8765/a', '"--method" can send any method'],
  ['http --ignore-stdin POST http://localhost:8765/a', 'http in a look reads with GET or no method, not "POST".'],
  ['http GET http://localhost:8765/a', 'http in a look needs --ignore-stdin'],
  ['http --ignore-stdin -f http://localhost:8765/a', '"-f" sends a form'],
  ['https --ignore-stdin http://localhost:8765/a skipped=true', 'https in a look reads one URL, and this one has 2.'],
  ['psql postgresql://localhost/pellwick_test', 'psql in a look runs one query, given once with -c or --command, and this one has 0.'],
  ['psql -c "SELECT 1" -c "SELECT 2"', 'psql in a look runs one query, given once with -c or --command, and this one has 2.'],
  ['psql -c "SHOW search_path"', 'A look\'s query is one SELECT'],
  ['psql -c "SELECT 1; SELECT 2"', 'A look\'s query is one SELECT'],
  ['psql -c "SELECT updateOne(id) FROM orders"', 'The command has "update", a word that writes'],
  ['psql -c "SELECT * FROM boxes FOR UPDATE"', 'The command has "UPDATE", a word that writes'],
  ['psql -c "SELECT * INTO boxes_backup FROM boxes"', 'The command has "INTO", a word that writes'],
  ['psql -f report.sql', '"-f" runs a file of commands'],
  ['psql -h db-prod1 -c "SELECT 1"', '"db-prod1" looks like production.'],
  ['psql -c "SELECT 1" "host=db dbname=pellwick_test"', 'psql in a look names one database'],
  ['psql postgresql://reader:staging1@localhost/pellwick_test -c "SELECT 1"', '"postgresql://reader:staging1@localhost/pellwick_test" holds a password.'],
  ['psql postgresql://prd.pellwick.test/pellwick -c "SELECT 1"', '"prd.pellwick.test" looks like production.'],
  ['mysql -preader -e "SELECT 1"', '"-p" puts a password in the command'],
  ['mysql -e "SELECT 1" --execute="SELECT 2"', 'mysql in a look runs one query, given once with -e or --execute, and this one has 2.'],
  ['mysql -h PROD2 -e "SELECT 1"', '"PROD2" looks like production.'],
  ['kubectl exec pod/orders --context staging', 'kubectl in a look runs get, describe or logs, and "exec" is none of them.'],
  ['kubectl get secrets --context staging', 'A look never reads Kubernetes secrets.'],
  ['kubectl get pods', 'kubectl in a look needs --context'],
  ['kubectl get pods --context prod_us', '"prod_us" looks like production.'],
  ['kubectl get pods --context staging -o jsonpath=x', 'In a look, "-o" takes json, yaml, wide or name, not "jsonpath=x".'],
  ['kubectl logs deploy/orders --context staging -f', '"-f" keeps running and never stops'],
  ["curl -s -H 'X-Box: {box}' http://localhost:8765/a", 'The placeholder {box} is not inside'],
  ['curl -s http://{host}:8765/a', 'The placeholder {host} is not inside'],
  ["curl -s 'http://localhost:8765/a?{name}=1'", 'The placeholder {name} is not inside'],
  ['psql -c "SELECT * FROM {table}"', 'The placeholder {table} is not inside'],
  ['curl -s http://localhost:8765/a/{email:text}', '"text" is not a placeholder shape.'],
];
export const withRun = (run: string) => fixture('good-looks.md').replace('run: curl -s http://localhost:8765/subscribers/{subscriber}/next-box', `run: ${run}`);

// check-look: a look number and its values, each with the one message it gets.
const sqlLooks = () => withRun(`psql -c "SELECT ships FROM boxes WHERE box = '{box}'"`);
const dateLooks = () => withRun("curl -s 'http://localhost:8765/boxes?ships={day:date}'");
export const fillCases: { name: string; text: () => string; number: string; args: string[]; message: string }[] = [
  { name: 'a looks.md that fails check-context', text: () => fixture('bad/looks/no-header.md'), number: '1', args: ['subscriber=1042'], message: "looks.md doesn't pass check-context, so no look runs. Fix this first: line 7: Start looks.md with a short line saying each look reads a lower environment and never changes it." },
  { name: 'a look number past the end', text: () => fixture('good-looks.md'), number: '3', args: [], message: 'looks.md has no look number 3. Count the looks from 1, in the order looks.md lists them.' },
  { name: 'a value not written name=value', text: () => fixture('good-looks.md'), number: '1', args: ['subscriber=1042', 'oops'], message: '"oops" is not name=value, like subscriber=1042.' },
  { name: 'a name the look has no placeholder for', text: () => fixture('good-looks.md'), number: '1', args: ['subscriber=1042', 'box=7'], message: 'This look has no placeholder named "box". Its placeholders are: subscriber.' },
  { name: 'a name given twice', text: () => fixture('good-looks.md'), number: '1', args: ['subscriber=1042', 'subscriber=1043'], message: '"subscriber" is given twice. Give each placeholder one value.' },
  { name: 'a placeholder with no value', text: sqlLooks, number: '1', args: [], message: 'This look needs a value for "box", like box=1042.' },
  { name: 'a value that is not an id', text: () => fixture('good-looks.md'), number: '1', args: ['subscriber=10.42'], message: '"10.42" is not an id: 1 to 64 letters, digits, _ or -.' },
  { name: 'a value that is not a real date', text: dateLooks, number: '1', args: ['day=2026-02-30'], message: '"2026-02-30" is not a real date like 2026-10-02.' },
  { name: 'a value that makes the filled command write', text: () => fixture('good-looks.md'), number: '1', args: ['subscriber=delete'], message: 'The command has "delete", a word that writes, like INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, COPY, CREATE, CALL, DO, MERGE or INTO. A look never writes.' },
];
export const filled = (c: (typeof fillCases)[number]) => fillLook(c.text(), c.number, c.args, today).problems.map((text) => ({ text }));

// tickets.md is checked against the stories in the folder: two finished stories and one "Not ready yet".
export const ticketStories = () =>
  new Map([
    ['2026-10-02-skip-next-box.md', fixture('good-story.md')],
    ['2026-10-02-orders-date.md', fixture('good-live-story.md')],
    ['2026-10-02-export-notes.md', fixture('good-not-ready.md')],
  ]);
export const tickets = (text: string) => checkTickets(text, ticketStories()).errors;

export const badCases: { name: string; problems: () => Problem[] }[] = [
  ...files('bad/').map((name) => ({ name, problems: () => story(fixture(name)) })),
  ...files('bad/context/').map((name) => ({ name, problems: () => context(fixture(name)) })),
  ...files('bad/learned/').map((name) => ({ name, problems: () => learned(fixture(name)) })),
  ...files('bad/tickets/').map((name) => ({ name, problems: () => tickets(fixture(name)) })),
  ...files('bad/v2/').map((name) => ({ name, problems: () => story(fixture(name)) })),
  ...files('bad/looks/').map((name) => ({ name, problems: () => looks(fixture(name)) })),
  ...files('bad/history/').map((name) => ({ name, problems: () => history(fixture(name)) })),
  ...refusedRuns.map(([run]) => ({ name: `a look refused: ${run}`, problems: () => looks(withRun(run)) })),
  ...fillCases.map((c) => ({ name: `check-look: ${c.name}`, problems: () => filled(c) })),
  { name: 'a look source at an environment looks.md does not list', problems: () => check(lookStory().replace('(staging, looked', '(uat, looked'), undefined, { looks: fixture('good-looks.md') }).errors },
  ...calibrationCases.map(([name, text]) => ({ name, problems: () => calibrated(text) })),
  { name: 'warn/many-scenarios.md', problems: () => check(fixture('warn/many-scenarios.md')).warnings },
  { name: 'warn/stale.md', problems: () => context(fixture('warn/stale.md'), new Date('2027-01-01T00:00:00Z')) },
  { name: 'warn/future.md', problems: () => context(fixture('warn/future.md')) },
  { name: 'a story with an em dash', problems: () => story(emDash()) },
  ...secrets.map(([what, value]) => ({ name: `${what} (${value.slice(0, 4)}...)`, problems: () => context(withLine(secretLine(value))) })),
  ...secretLines.map(([what, line]) => ({ name: `${what}: ${line}`, problems: () => context(withLine(line)) })),
];
