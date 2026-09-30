# Writing rules

Follow every rule when writing a story. The checker catches some of them, not all.

## Sources and gaps
- Not included lists only what someone decided to leave out, citing where it was decided. If no one decided, it goes in Questions before building. With nothing decided, write "None."
- Every Known line ends with its source in parentheses. For a fact from a context file, cite the original document the file names, then the file, like "(planning email 2026-09-18, via the Priorities context file)". If the file names several sources and doesn't say which, name them all.
- Invent nothing. A gap goes in Unknown, Assumed or a question.
- No contradictions inside a story. If the team's template has its own done section, such as `Done when:`, fill it only with what the input settles. Anything undecided goes in the acceptance criteria marked "To confirm", never stated as settled in the done section.
  - Bad: `Done when: every box, old or new, uses the 96-hour cutoff from 1 December.` The input says no one knows about boxes that already exist.
  - Good: `Done when: boxes created from 1 December get the 96-hour cutoff.` Old boxes go in a criterion ending "To confirm: whether boxes created before 1 December keep 72 hours."

## Around the change
- Check the team's definition of done and conventions for anything this story triggers, such as telling support. If the input doesn't cover it, ask.
- Ask what the user sees right after the action, and what happens at any boundary the input names, such as a cutoff passing while the page is open.
- For a bug, always ask whether records already affected fix themselves once the fix ships, or need a one-time repair.
- Never answer these by inventing behavior. They go under Questions before building, or in an acceptance criterion that asks the user to confirm.

## Questions, estimate and confidence
- End the story with one line, `Before release:`, then only the actions specific to this story, such as telling support about a named change, at most three, separated by semicolons. Leave out items that apply to every story, like testing in staging. If nothing specific applies, write `None.`
- At most five items in any list. Each question is one item with one question mark. Questions that would stop the build come first. If more than five would, end the list with exactly `More open questions than fit here. Consider a spike first.`, put each build-blocking question that didn't fit under Unknown, one line each, and don't rate confidence High. Never use that line as a default.
- Plain words, no em dashes, at most 30 words per sentence, and spell out each acronym the first time.
- The estimate's basis cites only the input or the context files. If there is none, say so, widen the range and don't rate confidence High.
- The Basis line always says whether each team estimating rule is included, in one short phrase, such as "Stockroom 50% not included, since Stockroom is assumed unchanged."
- If the input doesn't say what should happen in a case, the acceptance criterion says so and asks the user to confirm. Never invent expected behavior.
- The same goes for screen details: any wording, message, note or display detail the input doesn't state. End the criterion with "To confirm:" and the detail.
  - Bad: `Given my box ships within 72 hours, when I open my account, then the skip button is grey and says "Too late to skip".`
  - Good: `Given my box ships within 72 hours, when I open my account, then I can't skip it. To confirm: what the page shows instead.`
- Confidence: High means nothing a developer needs is unknown. Medium means some unknowns, none of which would stop the build. Low means an unknown could change what gets built.
