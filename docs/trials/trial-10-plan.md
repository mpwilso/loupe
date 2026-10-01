# Trial 10 plan: story format v2

This is a plan, not a record. It tests story format v2: Loupe in Claude Code writing user stories and bugs with Background, an Example from the input, Requirements and Test scenarios, while keeping every known fact true to its source.

## The bar, set before the trial

- Every story passes the checker in the v2 shape.
- 0 Known or Background facts that their cited source doesn't say.
- 0 invented examples.
- Every scenario has an unhappy path (the checker enforces this).
- Compare against v1: count "To confirm" items and Unknowns per story, v1 against v2. Report it, don't gate on it.

One input can't meet the first line as written. The holiday cutoff email is a change request, and Pellwick's story style sends change requests to its own team template, which stays as it is, with acceptance criteria. Its story is judged on passing the checker in that template's shape.

## Before you start

Set up each copy as for [trial 8](trial-8-plan.md): a fresh repository outside this one, made with `mktemp -d`, with the Pellwick team folder, the inputs in `notes/` and the skill installed per project. No tracker is loaded. The allow rules are the ones in [claude-code.md](../claude-code.md), in the copy's `.claude/settings.local.json`. Use Sonnet 5.5 at Medium.

Each run is in its own fresh copy and starts a new conversation.

## The runs

Send "Write a story from notes/<input>." for each input below, twice:

| Input | Kind | Expected call |
|---|---|---|
| `skip-a-box-meeting.md` | user story, v2 | Story written |
| `helpline-ticket-48213.md` | bug, v2 bug shape | Story written |
| `holiday-cutoff-email.md` | change request, team template | Story written |
| `slack-thread-address-change.md` | user story, v2 | Story written |
| `export-notes.md` | too thin | Not ready yet |

**Pass:** each run meets every line of the bar that applies to it, and `export-notes.md` is still "Not ready yet".

## Afterward

- Run the checker again on every saved story, and count its test scenarios and unhappy paths by script.
- Check every Known and Background fact against the source it cites, by reading the input or context file it names, and list any it doesn't say.
- Check each Example against the input: it is "None given." or a case the input gives.
- Count "To confirm" items and Unknown lines in each story, and in the v1 expected stories for the same inputs, as they stood before v2.

## Scoring sheet

| Run | Input | Pass or fail | Checker runs | Scenarios, unhappy paths | Facts not in their source | Notes |
|---|---|---|---|---|---|---|
| 1, 2 | skip-a-box | | | | | |
| 3, 4 | helpline ticket | | | | | |
| 5, 6 | holiday cutoff | | | | | |
| 7, 8 | address change | | | | | |
| 9, 10 | export notes | | | | | |

## Trial 10b: the rerun

After trial 10, an Example uses only details the input states, every requirement comes from the input or the context files or ends with "To confirm", and the truth step rereads the Example, Background and requirements against the input. Set up each run as above, in its own fresh copy.

### The bar, set before the rerun

- address-change 4 times: no detail in the Example, Background or requirements that the input doesn't state (check by reading, and quote any you find)
- skip-a-box once and helpline-ticket-48213 once: still pass, with an Example kept from the input, not "None given."
- export-notes once: still "Not ready yet"
- every other line of trial 10's bar still holds

The helpline ticket is a bug, and the bug shape has no Example, so for it the Example part doesn't apply.

| Input | Runs |
|---|---|
| `slack-thread-address-change.md` | 4 |
| `skip-a-box-meeting.md` | 1 |
| `helpline-ticket-48213.md` | 1 |
| `export-notes.md` | 1 |

## Trial 10c: unsettled behaviors, rerun

After trial 10b, a behavior the input and context files don't settle is written as a whole requirement to confirm, like "5. To confirm: whether the page checks the address before saving.", and the truth step asks whether the input settles each behavior itself. Address change runs 4 times, each in its own fresh copy, set up as above.

### The bar, set before the rerun

- every requirement's behavior is settled by the input or a context file, or the whole requirement is a "To confirm: whether ..." line
- Example, Background and every other line of trial 10b's bar still hold

### The decision rule

4 of 4 means it ships as v0.6.0. Anything less goes back to Matt before another round.
