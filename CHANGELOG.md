# Changelog

Each release is on GitHub with its full notes and the skill zip: [releases](https://github.com/mpwilso/loupe/releases).

## Unreleased

- README cut to about half and restructured to the order the author's other tools use: lockup, CI badge, tagline, what Loupe is, status, then the example.
- Template patterns are guarded against a hang: a length cap, and no repeat nested in a repeat. A choice inside a repeated group is still allowed.
- The release workflow attests the zip and runs setup-node without its cache. Dependabot covers npm as well as GitHub Actions.
- Smaller fixes from the review sweep: an honest skill description, the data rule, a plain error for a missing file, SECURITY.md says what it covers, and trial 9's measurement scripts are tracked under scripts/trials.

## [v0.7.0](https://github.com/mpwilso/loupe/releases/tag/v0.7.0), 2026-10-11

- Loupe installs as a Claude Code plugin from this repository; the marketplace entry installs the release zip. CI runs the Agent Skills reference validator on the built skill folder.
- Fixes: the context checker no longer reads a password rule as a password, the ticket checker takes a finished story's call from the story shape spec, the trial kit copies the current trial plan, SKILL.md has a license field and the zip packs LICENSE.
- README: a quick start under the status line and one list of trial results. The README tests check links, images, the checker command and the claims, not the layout.

## [v0.6.1](https://github.com/mpwilso/loupe/releases/tag/v0.6.1), 2026-10-11

- Checker fixes: a trailing space closes front matter and no longer hides a live source, team templates are found above the working folder, the team folder search stops at the repository root, titles aren't sentences, and standard names like UTF-8 are not tracker keys.
- The writer sees the checker's hard limits. The Claude Code guide lists the reads and saves its allow list had missed.
- CI runs once per change, with the trial kit on master or on demand, and Dependabot is on. The release stops when the tag doesn't match package.json's version, whose license field now says MIT, as LICENSE does.

## [v0.6.0](https://github.com/mpwilso/loupe/releases/tag/v0.6.0), 2026-10-01

- A new default story format for developers and QA: a one-line story, then Background, an Example, numbered Requirements, Notes and Test scenarios, followed by Known, Unknown, Assumed, Confidence, Estimate and Questions before building.
- Every test scenario has a happy path and at least one unhappy path, as WHEN, AND and THEN lines; the checker enforces it. The Example comes from the input with its source, or says "None given". Bugs keep their own fields.
- Stories in the old format still pass `check` and `check-folder`. In trial 10, two stories invented a detail and three stated behaviors the input never mentioned; after fixes, 10c passed 4 of 4.

## [v0.5.0](https://github.com/mpwilso/loupe/releases/tag/v0.5.0), 2026-10-01

- In Claude Code, Loupe can create a tracker ticket from a finished, checked story. It shows the project, type, title, labels and the whole description, and creates nothing without a clear yes; Claude Code's own permission prompt asks again.
- It never changes an existing ticket and never creates a second ticket for the same story; each ticket is listed in `loupe/tickets.md`, which the folder check verifies. The mock tracker has a create mode.
- In trial 9 the safety bar held in all 7 runs, and every created ticket matched its saved story byte for byte. The trial stood in for Claude Code's permission prompt, so that second lock wasn't exercised.

## [v0.4.0](https://github.com/mpwilso/loupe/releases/tag/v0.4.0), 2026-10-01

- In Claude Code, Loupe searches the team's tracker for related and duplicate issues before it writes, with whatever tracker tools Claude Code has. It cites any ticket it uses with the time it was read, flags a likely duplicate in the story's first question, and never changes the tracker.
- A mock tracker with invented issues and three read tools, for trying it out. The `Edit(loupe/**)` rule became `Edit(/loupe/**)`, anchored at the repository root.
- Every tracker call in trials 8 to 8e was a read, 77 in all, and customer data surfaced 0 times. Where Loupe cites tracker facts still varied from run to run.

## [v0.3.0](https://github.com/mpwilso/loupe/releases/tag/v0.3.0), 2026-09-30

- Loupe works in Claude Code, with the same stories, checker and learning. The team's context lives in a `loupe/` folder in the repository, stories are saved in `loupe/stories/`, and learning edits learned.md in place after a yes.
- `node src/run.js check-folder loupe` checks the context files, learned.md, the templates and every story in one run. An installer, `scripts/install-claude-code.ts`, installs the skill for every project or one.
- Tested headless in the terminal on one invented team, in trial 7 and its rerun.

## [v0.2.0](https://github.com/mpwilso/loupe/releases/tag/v0.2.0), 2026-09-30

- Loupe learns from corrections and answers: it proposes exact entries for learned.md, each naming who said it, on which story and when. Nothing is saved without a yes, and it never learns secrets or customer data.
- In claude.ai the updated learned.md is swapped in by hand, since a skill can't edit the project's files. Tested in trial 6 and its rerun, 6b.

## [v0.1.0](https://github.com/mpwilso/loupe/releases/tag/v0.1.0), 2026-09-30

- Initial public version: a Claude skill for product managers that turns meeting notes, tickets and emails into stories a developer can build. The zip holds the skill's instructions and writing rules, the checker, the story shape and rules as data, the templates and examples. It needs code execution, since the checker runs on every response.
- Tested on one invented team across five trials, in docs/trials.
