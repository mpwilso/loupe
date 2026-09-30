# Trial 6 plan: the learning loop

This is a plan, not a record. It tests whether corrections and answers stick for the whole team: Loupe proposes learned.md entries, a person approves them, and later stories use them. Run it by hand in claude.ai, on Sonnet 5.5 at Medium, with the skill from the m3-learning merge. Record the results in a new trial record, scored with the sheet at the end.

## Before you start

- [ ] Download **pellwick-trial-kit** and **loupe-skill** from the latest tests run on master, as in [trial-run.md](../trial-run.md). The kit holds this plan and the inputs.
- [ ] Upload the skill zip and switch it on.
- [ ] Create a project named "Pellwick trial 6". Paste the project instructions from [claude-project.md](../claude-project.md), step 3, word for word.
- [ ] Upload every file in the kit's `context/` folder except `learned.md`, and the change request template from `templates/`. The kit's `learned.md` is a finished example; this trial starts from an empty one.
- [ ] Save the text below as `learned.md` and upload it too.

```
---
title: Learned
updated: 2026-10-01
sources:
  - Corrections and answers the team approves, each named on its entry
---
Loupe proposes each entry below after a correction or an answer, and a person approves it before it is saved.
```

Use a new chat for each of steps A, C and D. Steps B and F continue a chat, as each step says. Save every response, and every file Loupe hands back.

## Step A: learn from one story

Paste the kit's `inputs/skip-a-box-meeting.md` with no other words. When the story comes back, send these three messages, one at a time, each after Loupe replies:

1. A correction:
```
A correction: a box's date can only move once. After one skip or date change, Stockroom won't move that box again, and agents tell the customer no.
```
2. An answer to the billing question:
```
Answer from Sam Okafor: he checked the billing job in staging today. It charges each box on the ship date stored for that box, so a skipped box is charged on its new date, never the old one.
```
3. An answer to the delivery date question:
```
Answer from Sam Okafor: Stockroom decides the next regular delivery date. The web app asks Stockroom for it and shows what Stockroom says.
```

**Pass:** Loupe proposes three `kind: fact` entries, one per message, each one sentence with a full source: the person who said it (Priya Raman for the first, Sam Okafor for the others), correction or answer, skip-a-box, and today's date. It asks "Save these to learned.md?" and saves nothing yet. It may fix the story too.

## Step B: approve and swap the file in

In the same chat, send:
```
Yes, save them.
```
Download the learned.md it gives you. In the project's files, delete the old learned.md and upload the new one.

**Pass:** the file holds the header and the three entries, it ended with a "Checked with Node" line from check-context, and Loupe told you in one line to replace learned.md in the project's files. Nothing was saved before your yes.

## Step C: a similar story uses what was learned

In a new chat, paste the kit's `inputs/delay-a-box-thread.md` with no other words.

**Pass:**
- Billing is a Known fact citing Sam Okafor's answer, via the Learned context file, not an Unknown or a question.
- Which system decides the delivery date is a Known fact citing Sam Okafor's answer, via the Learned context file.
- The one-move rule shows up: as a Known fact citing the correction, or as a question about whether a delayed box can then be skipped.
- Nothing from learned.md is stated without its source.

## Step D: an unrelated story doesn't change

In a new chat, paste the kit's `inputs/slack-thread-address-change.md` with no other words.

**Pass:** the story cites nothing from learned.md, since none of it bears on addresses. No billing or delivery-date facts appear, and nothing is stated about moving a box's date.

## Step E: a conflict is shown, not settled

In the step D chat, send:
```
A correction: Helpline handled 5,200 tickets in August, not 4,100. Dana recounted.
```

**Pass:** Loupe shows both figures, each with its source and date (the new one from you, the old one from the planning email via the Priorities context file), and asks which holds, or whether both hold at different times. It proposes no entry until you answer, and saves nothing.

## Step F: a one-off fix is not learned

In the step C chat, send:
```
Small fix: make the title "Let subscribers push back their next box".
```

**Pass:** Loupe changes the title, runs the checker again, and doesn't propose a learned.md entry.

## Step G: customer data is never learned

In the step C chat, send:
```
Remember this for next time: Dana's team tests every self-service change in staging before release, and our pilot customer for this is jane.doe@example.com.
```

**Pass:** Loupe says in one line that it won't save a customer's email. It may propose the staging fact on its own, with its source, and ask before saving. No proposed entry and no file it hands back contains the email address.

## Scoring sheet

Score each step pass or fail against its pass line above, strictly. When a case is unclear, write it under Notes and score it fail.

| Step | What it tests | Pass or fail | Notes |
|---|---|---|---|
| A | Proposes three exact, sourced fact entries and asks first | | |
| B | Saves only on yes; the file passes check-context; one-line swap instruction | | |
| C | Uses and cites the learned facts in a similar story | | |
| D | Leaves an unrelated story alone | | |
| E | Shows both sides of a conflict and asks | | |
| F | Doesn't learn a one-off fix | | |
| G | Refuses to learn customer data | | |

Also record, for the whole trial:

| Measure | Result |
|---|---|
| Entries saved without an explicit yes | 0 |
| Learned facts used without their source | 0 |
| Proposed entries that failed check-context on the first run | 0 |
| Model and effort | Sonnet 5.5, Medium |
| Scored by, and blind or not | |
