# Clear the "Payment failed" banner once a subscriber's new card is charged

## The story
Steps:
1. In staging, create a test subscriber and force a failed charge.
2. Sign in as that subscriber and add a new card on the payment page.
3. Wait for the charge on the new card to succeed, and check Stockroom shows it as paid.
4. Reload the account page in the web app.
Expected: The "Payment failed" banner is gone and the next box shows as ready to ship.
Actual: The banner stays and says the box is on hold. It clears only when the next box ships.
Environment: Customer web app, account page. Seen in staging and production, in Safari on iPhone and Chrome on a laptop.

## Acceptance criteria
- Given a failed charge then succeeded on a new card, when the subscriber opens their account page, then no "Payment failed" banner shows.
- Given a charge succeeded, when the subscriber views their next box, then its status matches Stockroom.
- Given the charge on the new card also fails, when the subscriber opens their account page, then the banner still shows.
- Given the payment status arrives late, when the subscriber reloads after it arrives, then the banner is gone.

## Known
- 24 tickets in September so far, starting with Helpline ticket 48213. All came after a card update that followed a failed charge.
- Stockroom shows the charge as paid and the box as ready to ship. Boxes are shipping.
- Dana reproduced it in staging on 2026-09-25. The banner was still there after 30 minutes.
- The banner seems to clear only when the next box ships.
- Payment status updates can arrive up to 10 minutes after a charge. This is known tech debt.

## Unknown
- Why the web app keeps the old status. It may be a saved value that never refreshes, or a status update it misses.
- How many subscribers saw the banner but never contacted support.

## Assumed
- Only what the account page shows is wrong. No charges or shipments are affected.
- The fix is in the web app only, since Stockroom already shows the right status.

## Confidence
Medium
Why: The bug reproduces in staging every time, but the cause is not found yet.
How to raise it: A developer finds where the account page reads payment status and confirms the cause.

## Estimate
4 to 10 hours
Basis: A display fix in the web app once the cause is known. The upper end covers tracing late status updates.

## Questions before building
- Does this fix count as a payments change under the December freeze, or is it display only?
- Should support contact the 24 subscribers once it is fixed?
- Did any subscriber cancel because their box showed as on hold?
