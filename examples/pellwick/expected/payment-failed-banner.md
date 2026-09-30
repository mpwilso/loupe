Call: Story written
Confidence: Low, the cause is not found yet, and the cause decides the fix.
First question: What should the account page show during the wait of up to 10 minutes before the payment status arrives?

# Clear the "Payment failed" banner once a subscriber's new card is charged

## The story
Steps:
1. In staging, create a test subscriber and force a failed charge.
2. Sign in as that subscriber and add a new card on the payment page.
3. Wait for the charge on the new card to succeed, and check Stockroom shows it as paid.
4. Reload the account page in the web app.
Expected: The "Payment failed" banner is gone and the next box shows as ready to ship.
Actual: The banner stays and says the box is on hold, while Stockroom shows the charge as paid.
Environment: Customer web app, account page. Seen in staging and production, in Safari on iPhone and Chrome on a laptop.
Impact: Subscribers who update their card after a failed charge. 24 have written to support in September so far. They are told their box is on hold when it is not.

## Acceptance criteria
- Given a failed charge was followed by a successful charge on a new card, when the subscriber opens their account page, then no "Payment failed" banner shows.
- Given a charge succeeded, when the subscriber views their next box, then its status matches Stockroom.
- Given the charge on the new card also fails, when the subscriber opens their account page, then the banner still shows.
- Given the payment status arrives late, when the subscriber reloads after it arrives, then the banner is gone.
- Given the new card was charged but the payment status has not arrived yet, when the subscriber opens their account page, then what do they see? The product manager must confirm this; the input doesn't say.

## Not included
None.

## Known
- 24 tickets in September so far, starting with ticket 48213. All came after a card update that followed a failed charge. (Maya, Helpline ticket 48213)
- Stockroom shows the charge as paid and the box as ready to ship, not on hold. (Maya, Helpline ticket 48213)
- It reproduces in staging. After a failed charge and a card update, the banner was still there 30 minutes later. (Dana, Helpline ticket 48213)
- Payment status updates can arrive up to 10 minutes after a charge. (planning email, Priya Raman, 2026-09-18, via the Priorities context file)

## Unknown
- Why the web app keeps the old status. It may be a saved value that never refreshes, or a status update it misses.
- Whether the banner clears only when the next box ships. Dana thinks so, but no one has confirmed it.
- How many subscribers saw the banner but never contacted support.

## Assumed
- Only what the account page shows is wrong. No charges or shipments are affected.
- The fix is in the web app only, since Stockroom already shows the right status.

## Confidence
Low
Why: Dana reproduced the bug in staging, but the cause is not found yet, and the cause decides what the fix is.
How to raise it: A developer finds where the account page reads payment status and confirms the cause.

## Estimate
4 to 16 hours
Basis: No one has sized it, so the range is wide. It covers a display fix in the web app and tracing late status updates. Stockroom 50% not included, since the fix is assumed to be in the web app only.

## Questions before building
- What should the account page show during the wait of up to 10 minutes before the payment status arrives?
- When the payment status arrives, should the banner clear without a reload?
- Once the fix ships, do accounts already stuck with the banner clear on their own, or do they need a one-time repair?
- If the payment status takes longer than 10 minutes to arrive, what should the account page show then?
- Support must be told about any change they will see. Who tells agents the banner now clears once the new card is charged? (Conventions context file)

Before release: Tell support the banner now clears once the new card is charged.
