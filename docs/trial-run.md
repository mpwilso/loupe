# Trial run

Trial 2 runs three passes by hand in claude.ai, each in its own Claude Project, on five Pellwick inputs. Record the results in the tables below. These numbers become the README's proof strip, so fill the tables in exactly as described, and score every output with [scoring.md](scoring.md).

Claude only ever sees the kit's `raw/` folder and what Loupe makes from it. The kit's `templates/` and `context/` folders are there only as the reference for scoring pass B. Never upload them to any project.

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
- [ ] Note the **Write time**, from sending the input to the finished story or response. The target for Loupe is under 60 seconds, as `m:ss` under `1:00`.
- [ ] Note the **Steps shown**: what Claude reports it did, as `N files, N commands`, for example "Created 2 files, ran 2 commands" is `2 files, 2 commands`.
- [ ] Stop the timer when you would hand the result to a developer. Ask for changes first if you need them. That is **Time**.
- [ ] Start a second timer and check the output carefully against its input, using scoring.md. Stop it when you finish. That is **Review time**: how long you take to check it, not how long Claude takes to write it.
- [ ] Count the edits. One edit is one change you asked Claude to make, or one line you changed yourself. Asking Claude a question that changes nothing is not an edit.
- [ ] Count the unsupported Known lines, the developer questions still missed, and the right call, as scoring.md defines them. List each missed question under its pass.

## Pass A: baseline

- [ ] Switch the "loupe" skill off.
- [ ] Create a project named "Pellwick trial 2 baseline". Leave its instructions empty.
- [ ] Upload only the files in the kit's `raw/` folder as project knowledge. Don't upload `templates/` or `context/`: they teach Loupe's story shape, and the baseline must not see it.
- [ ] For each input, send exactly this, with the input attached:

```
Write a user story with acceptance criteria for this. Use the attached team files.
```

Write `n/a` for Skill used, Node, Checker ran and Passed checker.

| Input | Expected | Skill used | Node | Checker ran | Passed checker | Write time | Steps shown | Time | Review time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | n/a | n/a | n/a | n/a | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | n/a | n/a | n/a | n/a | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | n/a | n/a | n/a | n/a | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | n/a | n/a | n/a | n/a | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| slack-thread-address-change.md | story | n/a | n/a | n/a | n/a | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |

## Pass B: setup

- [ ] Switch the "loupe" skill on.
- [ ] Create a project named "Pellwick trial 2 setup". Paste the project instructions from claude-project.md, step 3, word for word.
- [ ] Upload only the files in the kit's `raw/` folder as project knowledge. Don't upload `templates/` or `context/`.
- [ ] Open a new chat, start the timer and send "Set up the team from the files in this project." Answer its questions with "Only what the files say." Stop the timer when it hands over the context files.
- [ ] Loupe should also turn the team's plain change request form, `raw/change-request-template.md`, into a template it can check. If it doesn't offer, don't ask. Record that it didn't.
- [ ] Save every file it gives you: the context files and any template. Pass C uses them and nothing else.
- [ ] Note whether it said the template passed its checker. If you can, run `node src/check.ts` on the template in a clone of this repository to confirm.
- [ ] Compare the context files with `raw/`. A fact is dropped if it is in `raw/` but in none of the context files. A fact is added if it is in a context file but not in `raw/`. The kit's `context/` folder is the reference: every fact in it is in `raw/`. Compare the template with the kit's `templates/change-request.md` the same way.

| Measure | Result |
|---|---|
| Time | m:ss |
| Context files written | 0 |
| Every file passed check-context | yes |
| Facts dropped | 0 |
| Facts added | 0 |
| Change request template written | yes |
| Template passed the checker | yes |

List each dropped or added fact here, one line each.

## Pass C: Loupe

- [ ] Keep the "loupe" skill on.
- [ ] Create a project named "Pellwick trial 2 Loupe". Paste the project instructions from claude-project.md, step 3, word for word.
- [ ] Upload only what pass B produced: its context files and its change request template, if it wrote one. Don't upload `raw/`, or the kit's `templates/` or `context/`.
- [ ] Paste each input with no other words. Note **Skill used**: `yes` if Claude shows it read the loupe skill, otherwise `no`. A run where the skill didn't start counts as a failure: write `no` for Passed checker and Right call.
- [ ] Note the Node version from the "Checked with Node" line or the "Not checked:" line, or `none` if neither appears.

| Input | Expected | Skill used | Node | Checker ran | Passed checker | Write time | Steps shown | Time | Review time | Edits | Unsupported facts | Dev questions | Right call |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| skip-a-box-meeting.md | story | yes | v0.0.0 | yes | yes | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| helpline-ticket-48213.md | story | yes | v0.0.0 | yes | yes | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| holiday-cutoff-email.md | story | yes | v0.0.0 | yes | yes | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| export-notes.md | not ready | yes | v0.0.0 | yes | yes | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |
| slack-thread-address-change.md | story | yes | v0.0.0 | yes | yes | m:ss | 0 files, 0 commands | m:ss | m:ss | 0 | 0 | 0 | yes |

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
| Write time | m:ss | m:ss |
| Time to accepted story | m:ss | m:ss |
| Review time | m:ss | m:ss |
| Edits | 0 | 0 |
| Unsupported facts | 0 | 0 |
| Correct refusals | 0/5 | 0/5 |
| Questions a developer would still ask | 0 | 0 |

## Notes

Anything that went wrong or surprised you, one line each. For example: the skill didn't start, the checker didn't run, or a fact was invented.
