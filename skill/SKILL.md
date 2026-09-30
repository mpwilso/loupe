---
name: loupe
description: Writes user stories, bug reports and tickets from meeting notes, tickets or emails. Use when a product manager sets up their team or needs a story. Not for fiction or creative writing.
---

# Loupe

Loupe writes stories a developer can build without a second meeting. It has two modes: set up a team, and write a story. The checkers in this folder decide what is good enough. Nothing reaches the user until it passes.

In the commands below, `SKILL` is the path of the folder holding this file. The checkers need Node 22.18 or newer (`node --version`), no packages and no network.

## Set up a team

Copy this checklist and tick it off:

```
- [ ] Interview the product manager
- [ ] Read what they share
- [ ] Write the context files
- [ ] Check each file until it passes
- [ ] Hand the files over
```

1. Interview the product manager. Ask at most five questions per turn. Cover the applications and how they connect, the environments, priorities and key dates, known tech debt, the words and conventions the team uses, and how the team writes stories. Ask for documents, slides, transcripts and past stories, and read all of them.
2. Write one short file per topic: `applications.md`, `environments.md`, `priorities.md` (with tech debt), `conventions.md` and `story-style.md`. The format is in `SKILL/spec/context-file.json`: front matter with `title`, `updated` (today, as YYYY-MM-DD) and `sources` (a list of where each fact came from), then at most 300 words. See `SKILL/examples/context-file.md`.
3. Never write secrets, credentials or customer data. If the product manager shares any, tell them plainly and leave them out.
4. Save the files in `team/context/` and run `node SKILL/src/check-context.ts team/context/*.md`. Fix every line it reports and run it again, until it prints nothing and exits with 0.
5. If the team has its own story template, save it in `team/templates/` with front matter like `SKILL/templates/user-story.md`, and check it the same way with `node SKILL/src/check.ts`.
6. Give the product manager the files and ask them to add them to the project's knowledge.

## Write a story

```
- [ ] Gather the input, context files and team templates
- [ ] Check the input against the readiness bar
- [ ] Write the story, or a "Not ready yet" response
- [ ] Run the checker, fix, rerun until it passes
- [ ] Show the user
```

1. Save the team's context files in `team/context/` and any team templates in `team/templates/`, exactly as they appear in the project's knowledge.
2. Check the input, with the context files, against the readiness bar in `SKILL/templates/definition-of-ready.md`: who's affected, the problem, the desired outcome, which system or application, and known constraints.
3. Below the bar, write only a "Not ready yet" response, shaped like `SKILL/examples/not-ready.md`. Ask the few questions that would get the user over the bar.
4. At or above the bar, write the story in the team's template, chosen by the team's `story-style.md`. The built-in templates are in `SKILL/templates/`. Follow the shape of `SKILL/examples/story.md`:
   - Every Known line ends with its source in parentheses: the input or a context file.
   - Invent nothing. A gap goes in Unknown, Assumed or a question.
   - At most five items in any list. Each question is one item with one question mark. Questions that would stop the build come first. If more than five would, end the list with exactly `More open questions than fit here. Consider a spike first.` and don't rate confidence High.
   - Plain words, no em dashes, at most 30 words per sentence, and spell out each acronym the first time.
5. Save it as `team/stories/<short-name>.md` and run `node SKILL/src/check.ts team/stories/<short-name>.md`. The checker finds `team/templates/` by itself. Fix every line it reports and run it again, until it prints nothing and exits with 0.
6. Show the user the story only after it passes. Never show a story or response that fails the checker.

## Not in this version

Loupe does not learn from corrections yet. When the user corrects a story, fix that story, run the checker again, and tell them the context files have not changed. They can update the context files by setting up the team again.
