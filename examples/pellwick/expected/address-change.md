Call: Story written
Confidence: Low, no one has said whether a new address needs checking, and that could change what gets built.
First question: Does a new address need any check before it is saved?

# Let subscribers change their delivery address from their account

## The story
As a subscriber, I want to change my delivery address from my account, so that I don't have to email support to do it.

## Background
Address changes are the second-biggest Helpline reason, after skips. (Dana, Slack 2026-09-29)
Subscribers can't change their address in the web app today, so they email support and an agent updates it in Stockroom. (Dana, Slack 2026-09-29)

## Example
None given.

## Requirements
1. A subscriber can save a new delivery address from their account.
2. Before the next box's cutoff, 72 hours before the ship date today, the next box goes to the new address.
3. After the cutoff, that box goes to the old address and the one after it to the new.
4. To confirm: whether and how the account page tells a subscriber who saves a new address after the cutoff which box it applies to.
5. An agent sees the new address in Stockroom within a minute.

## Not included
None.

## Notes
None.

## Test scenarios
TEST SCENARIO: Save a new delivery address
HAPPY PATH: Before the cutoff
WHEN my next box's cutoff has not passed
AND I save a new address
THEN my next box goes to the new address
UNHAPPY PATH: After the cutoff
WHEN my next box's cutoff has passed
AND I save a new address
THEN that box goes to the old address
AND the box after it goes to the new address

TEST SCENARIO: Stockroom shows the new address
HAPPY PATH: A minute after saving
WHEN a subscriber saves a new address
AND an agent opens them in Stockroom a minute later
THEN the agent sees the new address
UNHAPPY PATH: Straight after saving
WHEN an agent opens the subscriber in Stockroom straight after the save
THEN the old address can still show for up to a minute

## Known
- Address changes are the second-biggest Helpline reason, after skips. (Dana, Slack 2026-09-29)
- Subscribers can't change their address in the web app today. They email support, and an agent updates it in Stockroom. (Dana, Slack 2026-09-29)
- Inside 72 hours of the ship date a box is packed and labeled, so a new address applies only from the box after. (Theo, Slack 2026-09-29)
- Any change a customer makes in the web app shows up in Stockroom within a minute. ("Our systems" wiki page, via the Applications context file)

## Unknown
- How many tickets are about address changes. Dana gave a rank, not a number.
- Whether a new address needs any check before it is saved.

## Assumed
- The address is kept in the subscriptions database the web app shares with Stockroom, so Stockroom needs no code change.

## Confidence
Low
Why: The rule and the systems are clear, but no one has said whether a new address needs checking, and that could change what gets built.
How to raise it: The engineering lead confirms where the address is kept and whether it needs checking before it is saved.

## Estimate
6 to 20 hours
Basis: No one has sized it, so the range is wide. Stockroom 50% not included, since Stockroom is assumed unchanged. Add it if Stockroom has to change, as the Story style context file says.

## Questions before building
- Does a new address need any check before it is saved?
- What should the account page tell a subscriber who saves a new address after the box's cutoff?
- If the box's cutoff passes while the subscriber has the page open, which box does the new address apply to?
- Should the subscriber get a confirmation after saving a new address?
- Is any change to the box's cutoff, 72 hours today, planned while address changes are live?

Before release: Tell support that subscribers can change their address online.
