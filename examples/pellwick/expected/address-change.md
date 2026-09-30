Call: Story written
Confidence: Low, no one has said whether a new address needs checking, and that could change what gets built.
First question: Does a new address need any check before it is saved?

# Let subscribers change their delivery address from their account

## The story
As a subscriber, I want to change my delivery address from my account, so that I don't have to email support to do it.

## Acceptance criteria
- Given my next box ships in more than 72 hours, when I save a new address on my account page, then my next box goes to the new address.
- Given my next box ships within 72 hours, when I save a new address, then that box goes to the old address and the one after to the new.
- Given I saved a new address inside the 72 hours, when I look at my account page, then what do I see? The product manager must confirm this; the input doesn't say.
- Given a subscriber changed their address, when an agent opens them in Stockroom, then the new address shows within a minute.

## Not included
None.

## Known
- Address changes are the second-biggest Helpline reason, after skips. (Dana, Slack 2026-09-29)
- Subscribers can't change their address in the web app today. They email support, and an agent updates it in Stockroom. (Dana, Slack 2026-09-29)
- Inside 72 hours of the ship date a box is packed and labeled, so a new address applies only from the box after. (Theo, Slack 2026-09-29)
- Any change a customer makes in the web app shows up in Stockroom within a minute. (architecture slides August 2026 and Sam interview 2026-09-10, via the Applications context file)

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
- What should the account page tell a subscriber who saves a new address inside 72 hours of the ship date?
- If the 72 hours pass while the subscriber has the page open, which box does the new address apply to?
- Should the subscriber get a confirmation after saving a new address?
- Support must be told about any change they will see. Who tells them before this ships? (Conventions context file)

Before release: test in staging; a tester checks the acceptance criteria; tell support that subscribers can change their address online.
