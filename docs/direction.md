# Loupe: direction

Loupe turns what a team knows into stories a developer can build without a second meeting. Every story says what it knows, what it doesn't, what it's assuming and how sure it is. It won't write a story it can't stand behind.

## Why Loupe
- It refuses: below the readiness bar, it writes no story, and the trial measures how often it makes that call correctly.
- Every known fact shows where it came from.
- It is honest about its own checks. If the checker can't run, the draft says so and can't pass.
- Its rules are proven. Every rule in the spec has a failing case, and a test fails if one doesn't.

## Who it's for
Product owners and product managers write with it. Developers, testers and anyone else who reads a story are its audience. A non-technical PM uses it inside Claude. A PM or developer can also use it in Claude Code, in a terminal or VS Code. Checking facts against real systems is planned.

## What it does
1. Learns the team. A short interview plus whatever a new team member would need: documents, slides, transcripts, past stories. It distills them into short context files (applications, environments, priorities, known tech debt, conventions, the team's story style), each dated and showing where it came from. It flags files that look stale.
2. Takes the input: meeting transcripts, notes, incidents, requirement sessions.
3. Checks readiness. It needs: who's affected, the problem, the desired outcome, which system or application, and known constraints. Below that bar it writes no story; it asks the few specific questions that get the user over it.
4. Writes the story in the team's template, every time in the same shape.
5. Says what it knows, what it doesn't and what it's assuming, one line each. Every known fact shows its source.
6. Rates its confidence: high, medium or low, with why, and what would raise it.
7. Estimates the work in hours, as a range for a developer who knows the system, with its basis. Calibrating against the team's history is planned (M5).
8. Asks now the questions a developer would ask later. Questions that would stop the build come first, and if more than five would, it says so, suggests a spike first and won't rate its confidence High.
9. Learns. When the user corrects a story or answers one of its questions, it proposes exact entries for learned.md, a context file it owns, each with its source, and saves nothing without a yes. In claude.ai a skill can't edit the project's files, so it hands back the updated learned.md, and the PM replaces learned.md in the project's files. In Claude Code it edits `loupe/learned.md` in place and shows the change. Every later story reads it, so nobody repeats themselves.

## The story, always in this shape
Title
The story (the team's template): one sentence for a user or job story; a bug keeps its own fields
Background: why it came up, one sentence per line, each with its source
Example: one real case from the input, with its source, or "None given."
Requirements: a numbered list of what must be true when it's done
Not included: what this story deliberately leaves out
Notes: technical notes, or "None."
Test scenarios: each with one happy path and at least one unhappy path, in WHEN, AND, THEN lines. Five is the usual; more than ten fails, and a spike is suggested
Known / Unknown / Assumed
Confidence: level, why, how to raise it
Estimate: hours range, basis
Questions before building
Before release: only the actions specific to this story, such as telling support about a named change, or "None."
At most five items in any list. Plain words an intern and an executive both understand in 30 seconds. No jargon without a plain explanation, no filler, no em dashes. It should read like the team's best PM wrote it. A checker rejects any story that doesn't fit this shape. This is version 2, the default for user stories, job stories and bugs. A bug skips Background, Example, Requirements and Notes. Stories saved in version 1, with Given / When / Then acceptance criteria in place of the sections from Background to Test scenarios, still pass, and spikes and team templates keep that shape.

## One core, two ways in
The core: the story shape, templates, readiness bar, checker and context-file format. Built once, shared by both.
- In Claude: a skill plus a project template. The skill interviews the user, builds the context files, then writes stories in that project. A PM builds it once and shares it with the team.
- In Claude Code (M4a): the same core, reading the team's context from a `loupe/` folder in the repository and writing only there. It is tested in the terminal; the VS Code extension is untested.
- Planned for Claude Code (M4b): read-only access to lower environments to check facts against real systems, and a Jira integration (others later) that writes only when the user approves.

## Never
- Touch production. Lower environments only, read-only, enforced by code.
- Write to a tracker without the user's approval.
- Fill a gap with an invented fact. An unknown stays unknown and says so.
- Keep secrets, credentials or customer data in context files. Warn, and leave them out.

## Works with Parallax
Planned: a finished story exports as a Parallax intent, so a story can go straight into governed development.

## How we'll know it works
- Time to write a story: about one to three minutes, fully checked.
- Time from input to accepted story. Target: under 10 minutes.
- Share of stories accepted without edits.
- Questions raised later, in development, testing or acceptance, that the story should have caught. The goal is zero.

## Not in version 1
Its own chat app, automatic tracker writes, any production access, percentage confidence.

## Milestones
M1 Core: story shape, templates, checker, context-file format, one example team.
M2 The Claude skill and project template, the README and brand.
M3 The learning loop.
M4a Claude Code: the same skill, with the team's context in a `loupe/` folder in the repository.
M4b Live context: read-only checks against lower environments, and Jira, with approval.
M5 Estimates calibrated against team history.
