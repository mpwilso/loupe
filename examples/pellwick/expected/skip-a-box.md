# Let subscribers skip their next box from their account

## The story
As a subscriber, I want to skip my next box from my account, so that I don't pay for refills I don't need yet or wait on support.

## Acceptance criteria
- Given my next box ships in more than 72 hours, when I choose "Skip this box", then it moves to the next regular delivery date and I see that date.
- Given my next box ships within 72 hours, when I open my account, then the skip option is turned off and says why.
- Given I skipped my next box, when its original ship date passes, then I am not charged for it.
- Given a subscriber skipped a box, when an agent opens them in Stockroom, then the history shows "Skipped by customer" with the date and time.

## Not included
- Skipping any box other than the next one. Priya decided on the next box only for now. (meeting 2026-09-22)
- Undoing a skip. Dana wants it and Sam says it adds work, but no one decided, so it waits. (meeting 2026-09-22)
- Fixing billing if it charges a skipped box. Sam's size assumes billing behaves. (meeting 2026-09-22)

## Known
- Skips were the top Helpline reason in August: 610 of 4,100 tickets, about three minutes of agent time each. Customers who cancel to avoid a box are lost about half the time. (Dana, meeting 2026-09-22)
- No box can change within 72 hours of its ship date. The cutoff is stored per box and already shown on the "change my box" page. (Theo and Sam, meeting 2026-09-22)
- Scope is the next box only. A skip moves it to the next regular delivery date, the same as agents do today. (Priya and Dana, meeting 2026-09-22)
- Subscribers are charged on the ship date. (Sam, meeting 2026-09-22)
- This must ship before the December freeze: no risky changes to checkout or payments from 1 December to 5 January. (Priya, meeting 2026-09-22; dates from the Priorities context file)

## Unknown
- Whether the billing job leaves out a box whose date moved. Sam has not checked yet.
- How many subscribers who cancel to avoid a box would skip instead.

## Assumed
- The web app can write the "Skipped by customer" note, so Stockroom needs no code change.

## Confidence
Medium
Why: Who, what, where and the cutoff are clear, but billing for a moved box is untested.
How to raise it: Sam skips a box in staging and confirms the billing job does not charge it.

## Estimate
12 to 20 hours
Basis: Sam said "a couple of days if billing behaves" in the meeting on 2026-09-22, read here as two working days. Nothing under Not included is covered.

## Questions before building
- Does skipping count as a payments change under the December freeze, since it affects charging?
- Which system decides the "next regular delivery date"? The web app and Stockroom sometimes disagree. (Priorities context file)
- After a skip, the following box becomes the next box. Can the subscriber skip that one too?
- Where does "Skip this box" go: the account home page, the "change my box" page, or both?
- Can a subscriber skip a box whose payment has already failed?
More open questions than fit here. Consider a spike first.
