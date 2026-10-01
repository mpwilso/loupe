Call: Story written
Confidence: Medium, who, what, where and the cutoff are clear, but billing for a moved box is untested.
First question: Does skipping count as a payments change under the December freeze, since it affects charging?

# Let subscribers skip their next box from their account

## The story
As a subscriber, I want to skip my next box from my account, so that I don't pay for refills I don't need yet or wait on support.

## Background
Skips were the top Helpline reason in August: 610 of 4,100 tickets, about three minutes of agent time each. (Dana, meeting 2026-09-22)
Customers who cancel to avoid a box are lost about half the time. (Dana, meeting 2026-09-22)

## Example
Customers going on holiday, or with plenty of refills left, want to skip the next box, and today they have to email support or open a chat. (Dana, meeting 2026-09-22)

## Requirements
1. A subscriber can skip their next box from their account until the box's cutoff, 72 hours before the ship date today.
2. A skipped box moves to the next regular delivery date. To confirm: whether and how the page shows the new date.
3. After the cutoff, the subscriber can't skip the box. To confirm: what the page shows instead.
4. A skipped box isn't charged on its original ship date.
5. Stockroom's history shows a note that the customer skipped the box. To confirm: the exact wording (Dana suggested "Skipped by customer") and whether it shows the date and time.

## Not included
- Skipping any box other than the next one. Priya decided on the next box only for now. (meeting 2026-09-22)

## Notes
- The cutoff is already stored per box and shown on the "change my box" page, so skipping can reuse it. (Theo and Sam, meeting 2026-09-22)

## Test scenarios
TEST SCENARIO: Skip the next box from my account
HAPPY PATH: Before the cutoff
WHEN my next box's cutoff has not passed
AND I skip it from my account
THEN it moves to the next regular delivery date. To confirm: whether and how the page shows the new date.
UNHAPPY PATH: After the cutoff
WHEN my next box's cutoff has passed
AND I open my account
THEN I can't skip it. To confirm: what the page shows instead.

TEST SCENARIO: Billing for a skipped box
HAPPY PATH: Skipped box
WHEN I skip my next box
AND its original ship date passes
THEN I am not charged for it
UNHAPPY PATH: Box not skipped
WHEN I don't skip my next box
AND its ship date comes
THEN I am charged on the ship date

TEST SCENARIO: Stockroom shows the customer's skip
HAPPY PATH: Skipped by the customer
WHEN a subscriber skips a box
AND an agent opens them in Stockroom
THEN the history shows a note that the customer skipped it. To confirm: the exact wording (Dana suggested "Skipped by customer") and whether it shows the date and time.
UNHAPPY PATH: Skip refused after the cutoff
WHEN the box's cutoff has passed, so the subscriber can't skip it
AND an agent opens them in Stockroom
THEN the box keeps its date and no skip note shows

## Known
- Skips were the top Helpline reason in August: 610 of 4,100 tickets, about three minutes of agent time each. Customers who cancel to avoid a box are lost about half the time. (Dana, meeting 2026-09-22)
- No box can change within 72 hours of its ship date. The cutoff is stored per box and already shown on the "change my box" page. (Theo and Sam, meeting 2026-09-22)
- Scope is the next box only. A skip moves it to the next regular delivery date, the same as agents do today. (Priya and Dana, meeting 2026-09-22)
- Subscribers are charged on the ship date. (Sam, meeting 2026-09-22)
- This must ship before the December freeze: no risky changes to checkout or payments from 1 December to 5 January. (Priya, meeting 2026-09-22; dates from the planning email, Priya Raman, 2026-09-18, via the Priorities context file)

## Unknown
- Whether the billing job leaves out a box whose date moved. Sam has not checked yet.
- What happens if the box's cutoff passes while the subscriber has the page open.
- Whether a subscriber can also skip the box after one they already skipped.
- Where skipping sits: the account home page, the "change my box" page, or both.
- Whether a subscriber can skip a box whose payment has already failed.

## Assumed
- The web app can write the "Skipped by customer" note, so Stockroom needs no code change.

## Confidence
Medium
Why: Who, what, where and the cutoff are clear, but billing for a moved box is untested.
How to raise it: Sam skips a box in staging and confirms the billing job does not charge it.

## Estimate
12 to 20 hours
Basis: Sam said "a couple of days if billing behaves" in the meeting on 2026-09-22, read here as two working days. It assumes billing needs no change, and it does not include undo. Stockroom 50% not included, since Stockroom is assumed unchanged.

## Questions before building
- Does skipping count as a payments change under the December freeze, since it affects charging?
- Can a subscriber undo a skip before the cutoff? Dana wants it, Sam says it adds work, and no one decided.
- If billing does charge a skipped box, is fixing that part of this story or a separate one?
- Which system decides the "next regular delivery date"? The web app and Stockroom sometimes disagree. (Priorities context file)
- Is any change to the box's cutoff, 72 hours today, planned while skipping is live?
More open questions than fit here. Consider a spike first.

Before release: Tell support that subscribers can skip online and how skips show in Stockroom.
