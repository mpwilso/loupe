import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

// The raw files hold the same facts as the context files, written the way a real team keeps them.
// Each key fact says where it sits in a context file, and how it may be worded in raw/.
const dir = (folder: string) => new URL(`../examples/pellwick/${folder}/`, import.meta.url);
const read = (folder: string, file: string) => readFileSync(new URL(file, dir(folder)), 'utf8').replace(/\s+/g, ' ');
const raw = readdirSync(dir('raw')).map((file) => read('raw', file)).join('\n');

const facts: [file: string, context: RegExp, raw: RegExp][] = [
  ['applications', /refillable home cleaning supplies by subscription/, /refillable home cleaning supplies by subscription/],
  ['applications', /About 80,000 active subscribers/, /about 80,000 active subscribers/],
  ['applications', /Three systems matter/, /three systems/],
  ['applications', /sign up, change what is in their box, update payment details and see past and upcoming orders/, /sign up, change what's in their box, update their payment details, and see past and upcoming orders/],
  ['applications', /Built and run by this team/, /we build it and run it/],
  ['applications', /Changes ship through GitHub pull requests/, /Changes ship through GitHub pull requests/],
  ['applications', /look up subscribers, issue refunds, change delivery dates and see warehouse status/, /look up subscribers, issue refunds, change delivery dates and check warehouse status/],
  ['applications', /Support agents and the warehouse team are its main users/, /used by support agents and the warehouse team/],
  ['applications', /shows up here within a minute/, /shows up in Stockroom within a minute/],
  ['applications', /emails and chat messages land as tickets/, /emails and chats come in as tickets/],
  ['applications', /tag each ticket with a reason, such as "skip request" or "billing"/, /tag each one with a reason, like "skip request" or "billing"/],
  ['applications', /Monthly reason counts are the best signal of customer pain/, /monthly counts per reason are the best signal/],
  ['applications', /share one subscriptions database/, /share one subscriptions database/],
  ['applications', /links to a subscriber's Stockroom page but does not change data/, /links to a subscriber's page in Stockroom but never changes any data/],
  ['conventions', /Jira, project "Subscriptions"/, /Jira, in the "Subscriptions" project/],
  ['conventions', /GitHub Issues in the stockroom repository, owned by the internal tools team/, /GitHub Issues in the stockroom repository, which the internal tools team owns/],
  ['conventions', /one Jira story and a linked GitHub issue/, /one Jira story plus a linked GitHub issue/],
  ['conventions', /Subscriber: a customer with an active subscription/, /Subscriber: a customer with an active subscription/],
  ['conventions', /Box: one delivery of refills/, /Box: one delivery of refills/],
  ['conventions', /Skip: leave out one box without cancelling/, /Skip: leaving out one box without cancelling/],
  ['conventions', /the last moment a box can change before the warehouse picks it/, /the last moment a box can change before the warehouse picks it/],
  ['conventions', /72 hours before the ship date/, /72 hours before the ship date/],
  ['conventions', /Tested in staging/, /Tested in staging/],
  ['conventions', /acceptance criteria checked by a tester/, /Acceptance criteria checked by a tester/],
  ['conventions', /support told about any change they will see/, /Support told about any change they will see/],
  ['environments', /runs the web app and Stockroom locally with sample data/, /runs the web app and Stockroom on their own machine with sample data/],
  ['environments', /No real customer data/, /no real customer data/],
  ['environments', /A shared copy of all three systems with made-up subscribers/, /a shared copy of all three systems, filled with made-up subscribers/],
  ['environments', /Rebuilt every Monday/, /rebuilt every Monday/],
  ['environments', /Payment calls go to the payment provider's test mode/, /Payments go to the payment provider's test mode/],
  ['environments', /where testers check stories before release/, /Testers check stories here before release/],
  ['environments', /The live systems/, /the live systems/],
  ['environments', /The web app releases on Tuesdays and Thursdays/, /the web app goes out Tuesdays and Thursdays/],
  ['environments', /Stockroom releases once a week, on Wednesdays/, /Stockroom goes out once a week, on Wednesdays/],
  ['environments', /Urgent fixes can go out any day with the engineering lead's approval/, /Urgent fixes can go any day if the engineering lead approves/],
  ['priorities', /October to December 2026/, /October to December/],
  ['priorities', /Cut support contacts/, /Cut support contacts/],
  ['priorities', /4,100 tickets in August/, /4,100 tickets in August/],
  ['priorities', /3,000 a month by December/, /3,000 a month by December/],
  ['priorities', /Anything that lets customers help themselves ranks high/, /Anything that lets customers sort things out themselves goes near the top/],
  ['priorities', /Cancellations run at 3.1% a month/, /3.1% a month to cancellations/],
  ['priorities', /under 2.5%/, /under 2.5%/],
  ['priorities', /No risky changes to checkout or payments from 1 December to 5 January/, /From 1 December to 5 January, nothing risky goes into checkout or payments/],
  ['priorities', /delivery schedule logic lives in both the web app and Stockroom/, /delivery schedule logic is in both the web app and Stockroom/],
  ['priorities', /They sometimes disagree/, /they don't always agree/],
  ['priorities', /up to 10 minutes after a charge/, /up to 10 minutes after a charge/],
  ['story-style', /User stories for anything a subscriber sees/, /If a subscriber will see it, write a user story/],
  ['story-style', /Job stories for staff tools/, /For staff tools, write a job story/],
  ['story-style', /Bugs use the bug template/, /Bugs go in the bug template/],
  ['story-style', /when another team asks to change a rule or setting, use the team template in templates\/change-request.md/, /When another team asks us to change a rule or a setting, use our change request form \(change-request-template.md\)/],
  ['story-style', /Titles start with a verb and name who benefits/, /Start the title with a verb and say who gets the benefit/],
  ['story-style', /cover the cutoff and what support sees in Stockroom/, /always cover the cutoff and what support will see in Stockroom/],
  ['story-style', /a developer who knows the web app. Add 50% when Stockroom changes too/, /a developer who knows the web app is doing it, and add 50% if Stockroom has to change as well/],
  ['story-style', /quotes Helpline reason counts, it gives the month/, /quote Helpline reason counts, put the numbers in with the month/],
];

test('every key fact in the context files is also in raw/, however it is worded', () => {
  const missing = facts.filter(([file, context, found]) => !context.test(read('context', `${file}.md`)) || !found.test(raw));
  assert.deepEqual(missing.map(([file, context]) => `${file}: ${context.source}`), []);
});

// Every body line of a context file that states a fact needs at least one key fact above.
test('every fact line in the context files has a key fact', () => {
  const uncovered: string[] = [];
  for (const file of readdirSync(dir('context'))) {
    const lines = readFileSync(new URL(file, dir('context')), 'utf8').split('\n');
    const body = lines.slice(lines.indexOf('---', 1) + 1).filter((line) => line.trim() && !line.startsWith('#'));
    const mine = facts.filter(([name]) => `${name}.md` === file).map(([, context]) => context);
    for (const line of body) if (!mine.some((re) => re.test(line))) uncovered.push(`${file}: ${line}`);
  }
  assert.deepEqual(uncovered, []);
});

// Raw files are the team's own words. A real team's wiki doesn't know Loupe exists, or use its sections.
// "Acceptance criteria" is left out: ordinary teams use it too.
const sections = ['The story', 'Not included', 'Known', 'Unknown', 'Assumed', 'Confidence', 'Estimate', 'Questions before building'];
const loupeLine = new RegExp(`^(#+ *)?(${sections.join('|')}):?$|^(Call|Confidence|First question): `);

test('no file in raw/ mentions Loupe or uses a Loupe section heading', () => {
  const found = readdirSync(dir('raw')).flatMap((file) => {
    const text = readFileSync(new URL(file, dir('raw')), 'utf8');
    return [...(/loupe/i.test(text) ? [`${file}: mentions Loupe`] : []), ...text.split('\n').filter((line) => loupeLine.test(line.trim())).map((line) => `${file}: ${line}`)];
  });
  assert.deepEqual(found, []);
});
