Call: Story written
Confidence: High, based on the checks above.
First question: None.

# Show the next delivery date on the orders page

## The story
As a subscriber, I want to see my next delivery date, so that I know when to expect it.

## Background
Subscribers ask support when their next box arrives. (Dana, meeting 2026-09-01)
The delivery date is stored with each order. (Sam, meeting 2026-09-01)

## Example
None given.
A subscriber emailed to ask whether their box would come before a trip. (Dana, meeting 2026-09-01)

## Requirements
1. The orders page shows the next delivery date for an active subscription.
2. A paused subscription shows no date. To confirm: what the page shows instead.

## Not included
None.

## Notes
None.

## Test scenarios
TEST SCENARIO: The orders page shows the next delivery date
HAPPY PATH: Active subscription
WHEN I open my orders page
THEN I see my next delivery date
UNHAPPY PATH: Paused subscription
WHEN my subscription is paused
AND I open my orders page
THEN I see no delivery date. To confirm: what the page shows instead.

## Known
- The delivery date is stored with each order. (Sam, meeting 2026-09-01)

## Unknown
None.

## Assumed
- The date uses the same format as the rest of the site.

## Confidence
High
Why: The data exists and the page already loads the order.
How to raise it: Nothing needed.

## Estimate
2 to 4 hours
Basis: A similar field was added to this page last month.

## Questions before building
None.

Before release: None.
