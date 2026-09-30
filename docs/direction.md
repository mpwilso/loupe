# Loupe: direction

Loupe turns what a team knows into stories a developer can build without a second meeting. Every story says what it knows, what it doesn't, what it's assuming and how sure it is. It won't write a story it can't stand behind.

## Who it's for
Product owners and product managers write with it. Developers, testers and anyone else who reads a story are its audience. A non-technical PM uses it inside Claude; a technical PM can use the VS Code version to check against real systems.

## What it does
1. Learns the team. A short interview plus whatever a new team member would need: documents, slides, transcripts, past stories. It distills them into short context files (applications, environments, priorities, known tech debt, conventions, the team's story style), each dated and showing where it came from. It flags files that look stale.
2. Takes the input: meeting transcripts, notes, incidents, requirement sessions.
3. Checks readiness. It needs: who's affected, the problem, the desired outcome, which system or application, and known constraints. Below that bar it writes no story; it asks the few specific questions that get the user over it.
4. Writes the story in the team's template, every time in the same shape.
5. Says what it knows, what it doesn't and what it's assuming, one line each. Every known fact shows its source.
6. Rates its confidence: high, medium or low, with why, and what would raise it.
7. Estimates the work in hours, as a range for a developer who knows the system, with its basis. Once the team has history, it calibrates against it.
8. Asks now the questions a developer would ask later. Questions that would stop the build come first, and if more than five would, it says so, suggests a spike first and won't rate its confidence High.
9. Learns. Accepted stories and the user's corrections update the context files, so nobody repeats themselves.

## The story, always in this shape
Title
The story (the team's template)
Acceptance criteria (Given / When / Then)
Not included: what this story deliberately leaves out
Known / Unknown / Assumed
Confidence: level, why, how to raise it
Estimate: hours range, basis
Questions before building
At most five items in any list. Plain words an intern and an executive both understand in 30 seconds. No jargon without a plain explanation, no filler, no em dashes. It should read like the team's best PM wrote it. A checker rejects any story that doesn't fit this shape.

## One core, two ways in
The core: the story shape, templates, readiness bar, checker and context-file format. Built once, shared by both.
- In Claude: a skill plus a project template. The skill interviews the user, builds the context files, then writes stories in that project. A PM builds it once and shares it with the team.
- In VS Code (later): the same core, plus read-only access to lower environments to check facts against real systems, and a Jira integration (others later) that writes only when the user approves.

## Never
- Touch production. Lower environments only, read-only, enforced by code.
- Write to a tracker without the user's approval.
- Fill a gap with an invented fact. An unknown stays unknown and says so.
- Keep secrets, credentials or customer data in context files. Warn, and leave them out.

## Works with Parallax
A finished story exports as a Parallax intent, so a story can go straight into governed development.

## How we'll know it works
- Time from input to accepted story. Target: under 10 minutes.
- Share of stories accepted without edits.
- Questions raised later, in development, testing or acceptance, that the story should have caught. The goal is zero.

## Not in version 1
Its own chat app, automatic tracker writes, any production access, percentage confidence.

## Milestones
M1 Core: story shape, templates, checker, context-file format, one example team.
M2 The Claude skill and project template, the README and brand.
M3 The learning loop.
M4 VS Code: lower-environment read access and Jira, with approval.
M5 Estimates calibrated against team history.
