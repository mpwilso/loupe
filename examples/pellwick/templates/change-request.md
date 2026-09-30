---
name: change request
patterns:
  - ^Change: \S
  - ^Reason: \S
  - ^Asked for by: \S
  - ^Done when:$
---
# [Short title: what changes, and when]

## The story
Change: [What changes, from what to what, and when.]
Reason: [Why it is needed.]
Asked for by: [Who asked, how and when.]
Done when:
- [Only what the input settles. Anything undecided goes in the acceptance criteria, marked "To confirm".]

## Acceptance criteria
- Given [a starting situation], when [someone does something], then [what they see or get].

## Not included
- [Something this story deliberately leaves out, and who decided. Write "None." if nothing.]

## Known
- [A fact you can point to.] ([Where it came from, for example: Theo, email 2026-09-26])

## Unknown
- [Something nobody knows yet. Write "None." if there is nothing.]

## Assumed
- [Something taken as true but not confirmed.]

## Confidence
[High, Medium or Low]
Why: [What the rating is based on.]
How to raise it: [What would make it higher.]

## Estimate
[N to M hours]
Basis: [What the range is based on, for a developer who knows the system.]

## Questions before building
- [What would a developer ask later? Write "None." if there are none.]

Before release: [Actions specific to this story, such as telling support about a named change, separated by semicolons, or None.]
