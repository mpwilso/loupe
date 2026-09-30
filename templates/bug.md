---
name: bug
patterns:
  - ^Steps:$
  - ^Expected: \S
  - ^Actual: \S
  - ^Environment: \S
  - ^Impact: \S
---
# [Short title: what is broken, for whom]

## The story
Steps:
1. [First step]
2. [Next step]
Expected: [What should happen.]
Actual: [What happens instead.]
Environment: [Where it happens: application, browser or device, account type.]
Impact: [Who is affected and how many, in plain words.]

## Acceptance criteria
- Given [a starting situation], when [someone does something], then [what they see or get].

## Not included
- [Something this story deliberately leaves out, and who decided. Write "None." if nothing.]

## Known
- [A fact you can point to.] ([Where it came from, for example: Dana, meeting 2026-09-22])

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
