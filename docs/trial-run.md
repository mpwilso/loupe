# Trial run

Run the skill by hand in claude.ai on four Pellwick inputs, and record the results in the tables below. These numbers become the README's proof strip, so fill the tables in exactly as described.

Three inputs should give a story. One, `export-notes.md`, should not: success there means no story, only a "Not ready yet" response that asks the right questions.

## Before you start

- [ ] Build the zip: `scripts/build-skill.sh`. Note the commit id: `git rev-parse --short HEAD`.
- [ ] Upload `dist/loupe-skill.zip` as described in [claude-project.md](claude-project.md), step 2. Remove any older copy first.
- [ ] Create a project named "Pellwick trial" with the instructions from claude-project.md, step 3.
- [ ] Upload the five files in `examples/pellwick/context/` and `examples/pellwick/templates/change-request.md` as project knowledge.

## For each input

- [ ] Open a new chat in the project. Use one chat per input.
- [ ] Start a timer and paste the whole input file.
- [ ] Note the Node version the skill reports, and whether it says the checker ran.
- [ ] Read what Claude gives you as if you were the team's product manager. Ask for changes until you would hand it to a developer.
- [ ] Stop the timer when you accept it.
- [ ] Count the edits. One edit is one change you asked Claude to make, or one line you changed yourself. Asking Claude a question that changes nothing is not an edit.
- [ ] Check every Known line against the source it cites. Count the lines the source doesn't actually say.
- [ ] Read the result as the developer who has to build it. Write down every question you would still ask. For `export-notes.md`, write down every question the response should have asked finance but didn't.

## Results

One row per input. Keep the rows in this order and the columns as they are.

- **Node**: the version the skill reported, like `v22.18.0`, or `none` if it found no Node.
- **Checker ran**: `yes` or `no`.
- **Passed checker**: `yes` if the skill said the checker passed before it showed you the result, otherwise `no`.
- **Time**: minutes and seconds from pasting the input to accepting the result, as `m:ss`, for example `6:40`.
- **Edits**: a whole number. `0` if you accepted it as it came.
- **Unsupported facts**: a whole number, the Known lines whose source doesn't say them. `0` for a "Not ready yet" response.
- **Dev questions**: a whole number. List each one under "Developer questions" below.
- **Right call**: `yes` if it wrote a story where one was expected, or refused where a refusal was expected. Otherwise `no`.

Date: YYYY-MM-DD
Commit: 
Model: 

| Input | Expected | Node | Checker ran | Passed checker | Time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | v0.0.0 | yes | yes | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | v0.0.0 | yes | yes | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | v0.0.0 | yes | yes | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | v0.0.0 | yes | yes | m:ss | 0 | 0 | 0 | yes |

## Developer questions

Write each question under its input. Write "None." if there were none.

### skip-a-box-meeting.md
- 

### helpline-ticket-48213.md
- 

### holiday-cutoff-email.md
- 

### export-notes.md
- 

## Baseline

The same four inputs and the same context files, with the skill turned off, to show what Loupe adds. Run it on a different day from the Loupe pass, so one doesn't shape your edits on the other.

- [ ] Skills belong to your account, not a project, so turn "loupe" off in **Customize**, then **Skills**. Turn it back on when you finish.
- [ ] Create a separate project named "Pellwick baseline". Leave its instructions empty.
- [ ] Upload the same six files as project knowledge.
- [ ] For each input, open a new chat, start the timer and send exactly this, with the input file attached:

```
Write a user story with acceptance criteria for this. Use the attached team files.
```

- [ ] Accept, count and check the result the same way as in the Loupe pass. Treat any line that states a fact as a Known line. For `export-notes.md`, a story counts as the wrong call.

Fill in the same table. Write `n/a` for Node, Checker ran and Passed checker.

| Input | Expected | Node | Checker ran | Passed checker | Time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | n/a | n/a | n/a | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | n/a | n/a | n/a | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | n/a | n/a | n/a | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | n/a | n/a | n/a | m:ss | 0 | 0 | 0 | yes |

List the baseline's developer questions the same way, under "Baseline developer questions".

### Baseline developer questions

#### skip-a-box-meeting.md
- 

#### helpline-ticket-48213.md
- 

#### holiday-cutoff-email.md
- 

#### export-notes.md
- 

## Comparison

Add up each column over the four inputs. Time is the total, as `m:ss`. Correct refusals is the number of right calls out of four, as `n/4`, since refusing everything would not be a win.

| Measure | Loupe | Baseline |
|---|---|---|
| Time to accepted story | m:ss | m:ss |
| Edits | 0 | 0 |
| Unsupported facts | 0 | 0 |
| Correct refusals | 0/4 | 0/4 |
| Questions a developer would still ask | 0 | 0 |

## Notes

Anything that went wrong or surprised you, one line each. For example: the skill didn't start, the checker didn't run, or a fact was invented.
