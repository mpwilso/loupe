# Slack thread, #support-escalations, 2026-10-02

**Dana (support lead), 09:12:** Two subscribers this week say the date on their account page is not the date in their "your box is on its way soon" email. One has the page saying the 9th and the email saying the 12th.

**Sam (engineering lead), 09:20:** The email takes its date from the web app's own copy of the schedule. The account page asks Stockroom. If Stockroom moved the box, the web app's copy can be behind until the nightly sync.

**Dana, 09:24:** So which one is right? Agents don't know what to tell people.

**Sam, 09:31:** Stockroom. It is the one that ships. We should make the email ask Stockroom too, or at least show the same date as the page.

**Priya (product manager), 09:40:** Let's do it. Page and email show the same date, from Stockroom. Dana, can you give me the two accounts so we can check them on staging? Keep it to this; changing when the email goes out is a separate conversation.

**Dana, 09:44:** Will do. Test subscriber 1042 on staging shows the same split, if that helps.
