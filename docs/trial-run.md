# Trial run

Trial 2 runs three passes by hand in claude.ai, each in its own Claude Project, on five Pellwick inputs. Record the results in the tables below. These numbers become the README's proof strip, so fill the tables in exactly as described, and score every output with [scoring.md](scoring.md).

Four inputs should give a story. One, `export-notes.md`, should not: success there means no story, only a "Not ready yet" response that asks the right questions. `slack-thread-address-change.md` only just clears the readiness bar, so refusing it is the wrong call.

## Download the trial files

Every CI run keeps two downloads for 7 days.

1. In a browser, open the repository on GitHub and click **Actions**.
2. Click the latest run of **tests** on the branch you are trying. Note its commit id, shown on the run page.
3. Scroll to **Artifacts** at the bottom and download both:
   - **loupe-skill**: this download is the skill. Don't unzip it. It holds one folder, `loupe/`.
   - **pellwick-trial-kit**: unzip it. It holds `raw/`, `context/`, `templates/` and `inputs/`. It leaves out the expected stories, so the trial stays blind. Don't look at `examples/pellwick/expected/` until you finish.

Skills belong to your account, not a project. Upload `loupe-skill.zip` once, as described in [claude-project.md](claude-project.md), step 2, and switch it off or on in **Customize**, then **Skills**, as each pass says.

## For each output

- [ ] Open a new chat in the pass's project. Use one chat per input.
- [ ] Start a timer and paste the whole input file from the kit's `inputs/` folder.
- [ ] Stop the timer when you would hand the result to a developer. Ask for changes first if you need them. That is **Time**.
- [ ] Start a second timer and check the output carefully against its input, using scoring.md. Stop it when you finish. That is **Review time**: how long you take to check it, not how long Claude takes to write it.
- [ ] Count the edits. One edit is one change you asked Claude to make, or one line you changed yourself. Asking Claude a question that changes nothing is not an edit.
- [ ] Count the unsupported Known lines, the developer questions still missed, and the right call, as scoring.md defines them. List each missed question under its pass.

## Pass A: baseline

- [ ] Switch the "loupe" skill off.
- [ ] Create a project named "Pellwick trial 2 baseline". Leave its instructions empty.
- [ ] Upload every file in the kit's `raw/` folder as project knowledge, and nothing else.
- [ ] For each input, send exactly this, with the input attached:

```
Write a user story with acceptance criteria for this. Use the attached team files.
```

Write `n/a` for Node, Checker ran and Passed checker.

| Input | Expected | Node | Checker ran | Passed checker | Time | Review time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | n/a | n/a | n/a | m:ss | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | n/a | n/a | n/a | m:ss | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | n/a | n/a | n/a | m:ss | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | n/a | n/a | n/a | m:ss | m:ss | 0 | 0 | 0 | yes |
| slack-thread-address-change.md | story | n/a | n/a | n/a | m:ss | m:ss | 0 | 0 | 0 | yes |

## Pass B: setup

- [ ] Switch the "loupe" skill on.
- [ ] Create a project named "Pellwick trial 2 setup" with the instructions from claude-project.md, step 3.
- [ ] Upload every file in the kit's `raw/` folder as project knowledge.
- [ ] Open a new chat, start the timer and send "Set up the team from the files in this project." Answer its questions with "Only what the files say." Stop the timer when it hands over the context files.
- [ ] Save the context files it gives you. Pass C uses them.
- [ ] Compare them with `raw/`. A fact is dropped if it is in `raw/` but in none of the context files. A fact is added if it is in a context file but not in `raw/`. The kit's `context/` folder is the reference: every fact in it is in `raw/`.

| Measure | Result |
|---|---|
| Time | m:ss |
| Context files written | 0 |
| Every file passed check-context | yes |
| Facts dropped | 0 |
| Facts added | 0 |

List each dropped or added fact here, one line each.

## Pass C: Loupe

- [ ] Keep the "loupe" skill on.
- [ ] Create a project named "Pellwick trial 2 Loupe" with the instructions from claude-project.md, step 3.
- [ ] Upload the context files from pass B and the kit's `templates/change-request.md` as project knowledge. Don't upload `raw/` or the kit's `context/`.
- [ ] Paste each input with no other words. Note the Node version from the "Checked with Node" line or the "Not checked:" line, or `none` if neither appears.

| Input | Expected | Node | Checker ran | Passed checker | Time | Review time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | v0.0.0 | yes | yes | m:ss | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | v0.0.0 | yes | yes | m:ss | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | v0.0.0 | yes | yes | m:ss | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | v0.0.0 | yes | yes | m:ss | m:ss | 0 | 0 | 0 | yes |
| slack-thread-address-change.md | story | v0.0.0 | yes | yes | m:ss | m:ss | 0 | 0 | 0 | yes |

## Missed developer questions

Write each question under its pass and input. Write "None." if there were none.

### Pass A
- skip-a-box-meeting.md: 
- helpline-ticket-48213.md: 
- holiday-cutoff-email.md: 
- export-notes.md: 
- slack-thread-address-change.md: 

### Pass C
- skip-a-box-meeting.md: 
- helpline-ticket-48213.md: 
- holiday-cutoff-email.md: 
- export-notes.md: 
- slack-thread-address-change.md: 

## Comparison

Add up each column over the five inputs. Times are totals, as `m:ss`. Correct refusals is the number of right calls out of five, as `n/5`, since refusing everything would not be a win.

| Measure | Loupe | Baseline |
|---|---|---|
| Time to accepted story | m:ss | m:ss |
| Review time | m:ss | m:ss |
| Edits | 0 | 0 |
| Unsupported facts | 0 | 0 |
| Correct refusals | 0/5 | 0/5 |
| Questions a developer would still ask | 0 | 0 |

## Notes

Anything that went wrong or surprised you, one line each. For example: the skill didn't start, the checker didn't run, or a fact was invented.
