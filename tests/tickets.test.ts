import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture, tickets } from './cases.ts';
import { format } from '../src/spec.ts';

// M4c: loupe/tickets.md lists each ticket Loupe created, with the story it came from and when.
const problems = (name: string) => tickets(fixture(name)).map(format);

test('a tickets.md line names a key, a finished story in the folder, and a real time', () => {
  assert.deepEqual(problems('good-tickets.md'), []);
  assert.deepEqual(tickets(''), [], 'an empty file has no tickets yet');
});

const BAD: Record<string, string> = {
  'bad-line': 'line 1: Each line in tickets.md must read "<key>, <story file>, created <YYYY-MM-DD HH:MM>", like "SUBS-156, 2026-10-02-skip-next-box.md, created 2026-10-02 14:05".',
  'bad-time': 'line 1: The created time must be a real date and time, like "created 2026-10-02 14:05".',
  'no-story': 'line 1: There is no story 2026-10-02-no-such-story.md in stories/.',
  'not-written': 'line 1: 2026-10-02-export-notes.md isn\'t a finished story: its first line isn\'t "Call: Story written", so it can\'t have a ticket.',
  'duplicate-key': 'line 2: SUBS-156 is listed more than once.',
  'duplicate-story': 'line 2: 2026-10-02-skip-next-box.md already has a ticket, SUBS-156. A story gets one ticket.',
};
for (const [name, message] of Object.entries(BAD)) {
  test(`bad/tickets/${name}.md fails with one plain message`, () => assert.deepEqual(problems(`bad/tickets/${name}.md`), [message]));
}
