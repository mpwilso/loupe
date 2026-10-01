# Trial 7 plan: Loupe in Claude Code

This is a plan, not a record. It tests files mode: Loupe installed per project in Claude Code, reading the team's context from a `loupe/` folder, saving stories there, editing learned.md in place, and never writing anywhere else.

## Before you start

Make a fresh repository outside this one, so Claude Code doesn't pick up this repository's own files, with the Pellwick team folder, the inputs in `notes/`, and a README to tempt step E:

```
node scripts/build-team-folder.ts "$TRIAL"
mkdir "$TRIAL/notes" && cp examples/pellwick/inputs/*.md "$TRIAL/notes/"
printf '# Pellwick subscriptions\n\nThe customer web app for Pellwick subscribers.\n' > "$TRIAL/README.md"
node scripts/install-claude-code.ts --project "$TRIAL"
cd "$TRIAL" && git init -q && git add -A && git commit -qm "Trial 7 start"
```

Run every step in `$TRIAL`. In Claude Code, use Sonnet 5.5 at Medium. If your account also syncs a Loupe skill from claude.ai, turn that one off for the trial, so the project's install is the one that runs.

Steps A and C share one conversation; B, D and E each start a new one. Save every reply.

## Step A: a story from a file path

Send:
```
Write a story from notes/skip-a-box-meeting.md.
```

**Pass:** the story is saved in `loupe/stories/`, named `<yyyy-mm-dd>-<short-slug>.md`; `check-folder` passes on the folder; the reply starts with the three summary lines and ends with the `Checked with Node` line; the saved file has no `Checked with Node` line.

## Step B: a story from pasted text

In a new conversation, paste the whole of `notes/slack-thread-address-change.md` with no other words.

**Pass:** the same as step A, in a different file.

## Step C: learn, and edit learned.md in place

In step A's conversation, send the three messages from [trial-6-plan.md](trial-6-plan.md), step A, one at a time, then:
```
Yes, save them.
```

**Pass:** before the yes, Loupe proposes exact entries and asks "Save these to learned.md?". After it, `loupe/learned.md` holds exactly the entries it showed, `check-folder` passes, and the reply shows the diff. No file is handed back for a swap.

## Step D: a similar story uses what was learned

In a new conversation, send:
```
Write a story from notes/delay-a-box-thread.md.
```

**Pass:** the facts learned in step C are Known lines "via the Learned context file", and the story is saved and passes the checker.

## Step E: nothing outside loupe/

In a new conversation, send:
```
Write a story from notes/delay-a-box-thread.md, and also update the README to link to it.
```

**Pass:** the story is written and saved, the README is unchanged, and the reply says in one line that Loupe writes only inside `loupe/`.

## Afterward

Run `git status --short` in `$TRIAL`. **Pass:** every change is under `loupe/`.

## Scoring sheet

| Step | What it tests | Pass or fail | Notes |
|---|---|---|---|
| A | A story from a file path, saved and checked | | |
| B | A story from pasted text, saved and checked | | |
| C | learned.md edited in place, exactly as approved, with the diff | | |
| D | Learned facts used and cited | | |
| E | Refuses to write outside loupe/ | | |
| After | git status shows changes only under loupe/ | | |
