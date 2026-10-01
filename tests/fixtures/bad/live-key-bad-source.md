Call: Story written
Confidence: Medium, the holiday cutoff may change.
First question: SUBS-142 looks like the same request. Should this be a new story or an update to it? (Jira SUBS-142, read 2026-10-02 14:05)

# Show the next delivery date on the orders page

## The story
As a subscriber, I want to see my next delivery date, so that I know when to expect it.

## Acceptance criteria
- Given I have an active subscription, when I open my orders page, then I see the next delivery date.
- Given the holiday cutoff from SUBS-152 applies, when I open my orders page, then I see the holiday date. (Jira SUBS-152, read 2026-10-02 14:05)

## Not included
None.

## Known
- The delivery date is stored with each order. (Sam, meeting 2026-09-01)
- SUBS-134 shows the orders page already loads the order. (Jira SUBS-134, read 2026-10-02 14:05)

## Unknown
- Whether SUBS-152 moves the cutoff for every box. (Jira SUBS-152, read 2026-10-02 14:05)

## Assumed
- The date uses the same format as the rest of the site.

## Confidence
Medium
Why: The data exists, but the holiday cutoff may change.
How to raise it: Theo confirms the holiday cutoff.

## Estimate
2 to 4 hours
Basis: A similar field was added to this page last month.

## Questions before building
- SUBS-142 looks like the same request. Should this be a new story or an update to it? (Jira SUBS-142, read 2026-10-02 14:05)
- Is the holiday cutoff change in SUBS-152 still planned? (open, Jira, read 2026-09-30 21:09)

Before release: None.
