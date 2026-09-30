# Let subscribers skip their next box from their account

## The story
As a subscriber, I want to skip my next box from my account, so that I don't pay for refills I don't need yet or wait on support.

## Acceptance criteria
- Given my next box ships in more than 72 hours, when I choose "Skip this box", then it moves to the next regular delivery date and I see that date.
- Given my next box ships within 72 hours, when I open my account, then the skip option is turned off and says why.
- Given I skipped my next box, when its original ship date passes, then I am not charged for it.
- Given a subscriber skipped a box, when an agent opens them in Stockroom, then the history shows "Skipped by customer" with the date and time.

## Known
- Skips were the top Helpline reason in August: 610 of 4,100 tickets.
- An agent spends about three minutes on each skip in Stockroom.
- No box can change within 72 hours of its ship date. The cutoff is stored per box and already shown on the "change my box" page.
- Scope is the next box only, agreed in the meeting on 2026-09-22.
- Subscribers are charged on the ship date.

## Unknown
- Whether the billing job leaves out a box whose date moved. Sam has not checked yet.
- How many subscribers who cancel to avoid a box would skip instead.

## Assumed
- A skip moves the box to the next regular delivery date, the same as agents do today.
- The web app can write the "Skipped by customer" note, so Stockroom needs no code change.

## Confidence
Medium
Why: Who, what, where and the cutoff are clear, but billing for a moved box is untested.
How to raise it: Sam skips a box in staging and confirms the billing job does not charge it.

## Estimate
16 to 24 hours
Basis: Sam's estimate of two days if billing needs no change. Add half again if Stockroom needs a change, and more if undo is in scope.

## Questions before building
- Can a subscriber undo a skip before the cutoff? Dana wants it, Sam says it adds work, and no one decided.
- If billing does charge a skipped box, is fixing that part of this story or a separate one?
- Should the subscriber get an email confirming the skip, or is the on-screen message enough?
- Where does "Skip this box" go: the account home page, the "change my box" page, or both?
- Does support need a saved reply for customers who still email to skip?
