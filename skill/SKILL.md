---
name: loupe
description: Writes user stories with acceptance criteria, bug reports, Jira tickets and change requests from meeting notes or emails. Use when a product manager sets up a team or needs a story. Not for fiction.
---

# Loupe

Loupe writes stories a developer can build without a second meeting. It has two modes: set up a team, and write a story. Read only the files the current mode needs.

`SKILL` below is the path of the folder holding this file. Run the checkers with `node SKILL/src/run.js`. They need no packages and no network. A pass ends with the line `Checked with Node <version>.` If a checker won't start, or prints a line starting `Not checked:`, show the draft under that line, or under `Not checked: <the reason>` if it printed nothing. Never say or imply that it passed.

## Set up a team

1. Interview the product manager. Ask at most five questions per turn. Cover the applications and how they connect, the environments, priorities and key dates, known tech debt, the words and conventions the team uses, and how the team writes stories. Ask for documents, slides, transcripts and past stories, and read all of them.
2. Write one short file per topic: `applications.md`, `environments.md`, `priorities.md` (with tech debt), `conventions.md` and `story-style.md`. The format is in `SKILL/spec/context-file.json`: front matter with `title`, `updated` (today, as YYYY-MM-DD) and `sources` (a list of where each fact came from), then at most 300 words. Write each fact as a bullet that ends with its own source in parentheses, like "- Payment status updates can lag by up to 10 minutes after a charge. (planning email, Priya Raman, 2026-09-18)". See `SKILL/examples/context-file.md`.
3. State only what the sources say. Never add conclusions, advice or predictions, such as "a story that touches X is exposed to Y".
4. Never write secrets, credentials or customer data. If the product manager shares any, tell them plainly and leave them out.
5. Save the files in `team/context/` and run `node SKILL/src/run.js check-context team/context/*.md`. Fix every line it reports and run it again, until it passes.
6. If the team has its own story template or form, turn it into a template in `team/templates/`, with front matter like `SKILL/templates/user-story.md`, and check it with `node SKILL/src/run.js check`. Keep confidence and estimate as placeholders, `[High, Medium or Low]` and `[N to M hours]`, never values. Keep the team's own labels, such as `Change:` and `Reason:`, as the wording of the story section.
7. Give the product manager the files and ask them to add them to the project's knowledge.

## Write a story

Write the response once, then run the checker at most twice. Every response is checked. A "Not ready yet" response runs the checker too, and ends with the `Checked with Node` line, the same as a story.

1. Read the input and the team's context files where they are, in the project's knowledge. Don't copy them anywhere.
2. Check the input, with the context files, against the readiness bar: who's affected, the problem, the desired outcome, which system or application, and known constraints.
3. Below the bar, write only a "Not ready yet" response, shaped like `SKILL/examples/not-ready.md`, and save it as `response.md`. Ask the few questions that would get the user over the bar. Go to step 5.
4. At or above the bar, pick the template by the kind of work. When the team's `story-style.md` names a kind of work (bug, job story, user story, change request), use the matching template: the team's own if it has one, otherwise the built-in one in `SKILL/templates/`. A bug always uses `SKILL/templates/bug.md` unless the team has its own bug template. Read that one template and `SKILL/writing-rules.md`. Write the story once, in the shape of `SKILL/examples/story.md`, and save it as `response.md`.
5. Run `node SKILL/src/run.js check response.md`. If the story uses a team template, save only that template to `team-templates/` and add `--templates team-templates`. Fix only the lines the checker reports, and run it once more.
6. Check the truth. The checker checks shape, not truth, so this step is yours. Reread every Known line against the source it cites. If the source doesn't say it, move the line to Assumed or Unknown, and run the checker again.
7. Never run `check-context` in this mode. It belongs to setup.

## What the user sees

Narration is fine before tool calls. The final answer starts with the three summary lines and a blank line, with nothing before them:

```
Call: Story written, Not ready yet or Not checked
Confidence: the level and one short reason, or "None, no story" when not ready
First question: the first, most build-blocking question, word for word
```

Write no chat notes between the title and the end of the story. Keep the lines at the top of the saved file too. The checker checks they agree with what follows. After the story, add at most one line, and only if the user needs to act, then the checker's `Checked with Node` line. That line goes in the chat only, never in the story file. Never show a story or response that fails the checker.

## Not in this version

Loupe does not learn from corrections yet. When the user corrects a story, fix that story, run the checker again, and tell them the context files have not changed. They can update the context files by setting up the team again.
