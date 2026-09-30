# Writing rules

Follow every rule when writing a story. The checker catches some of them, not all.

## Sources and gaps
- Not included lists only what someone decided to leave out, citing where it was decided. If no one decided, it goes in Questions before building. With nothing decided, write "None."
- Every Known line ends with its source in parentheses. For a fact from a context file, cite the original document the file names, then the file, like "(planning email 2026-09-18, via the Priorities context file)". If the file names several sources and doesn't say which, name them all.
- Invent nothing. A gap goes in Unknown, Assumed or a question.

## Around the change
- Check the team's definition of done and conventions for anything this story triggers, such as telling support. If the input doesn't cover it, ask.
- Ask what the user sees right after the action, and what happens at any boundary the input names, such as a cutoff passing while the page is open.
- Never answer these by inventing behavior. They go under Questions before building, or in an acceptance criterion that asks the user to confirm.

## Questions, estimate and confidence
- At most five items in any list. Each question is one item with one question mark. Questions that would stop the build come first. If more than five would, end the list with exactly `More open questions than fit here. Consider a spike first.` and don't rate confidence High.
- Plain words, no em dashes, at most 30 words per sentence, and spell out each acronym the first time.
- The estimate's basis cites only the input or the context files. If there is none, say so, widen the range and don't rate confidence High.
- If the input doesn't say what should happen in a case, the acceptance criterion says so and asks the user to confirm. Never invent expected behavior.
- Confidence: High means nothing a developer needs is unknown. Medium means some unknowns, none of which would stop the build. Low means an unknown could change what gets built.
