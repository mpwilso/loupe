Call: Story written
Confidence: Medium, the cause is known but the repair is not.
First question: Do the boxes already affected fix themselves once this ships?

# Show the right banner after a failed payment

## The story
Steps:
1. A subscriber's payment fails.
2. They open their account.
Expected: A banner says the payment failed and how to fix it.
Actual: No banner shows. (Maya, Helpline ticket 48213)
Environment: The web app, any browser.
Impact: Subscribers miss the failed payment and their box is held.

## Test scenarios
TEST SCENARIO: The failed payment banner
HAPPY PATH: Payment failed
WHEN my payment fails
AND I open my account
THEN I see a banner saying the payment failed. To confirm: the banner's wording.
UNHAPPY PATH: Payment fixed
WHEN I update my card
AND the payment goes through
THEN the banner no longer shows

## Not included
None.

## Known
- The banner reads the payment status from the subscriptions database. (Sam, meeting 2026-09-01)

## Unknown
- Whether boxes already held are released on their own.

## Assumed
- The banner uses the site's usual warning style.

## Confidence
Medium
Why: The cause is known, but the repair for held boxes is not.
How to raise it: Sam confirms whether held boxes are released on their own.

## Estimate
4 to 8 hours
Basis: A similar banner fix took a day last month.

## Questions before building
- Do the boxes already affected fix themselves once this ships?

Before release: None.
