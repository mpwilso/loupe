# Trial run

Run the skill by hand in claude.ai on three Pellwick inputs, and record the results in the table below. These numbers become the README's proof strip, so fill the table in exactly as described.

## Before you start

- [ ] Build the zip: `scripts/build-skill.sh`. Note the commit id: `git rev-parse --short HEAD`.
- [ ] Upload `dist/loupe-skill.zip` as described in [claude-project.md](claude-project.md), step 2. Remove any older copy first.
- [ ] Create a project named "Pellwick trial" with the instructions from claude-project.md, step 3.
- [ ] Upload the five files in `examples/pellwick/context/` and `examples/pellwick/templates/change-request.md` as project knowledge.

## For each input

- [ ] Open a new chat in the project. Use one chat per input.
- [ ] Start a timer and paste the whole input file.
- [ ] Read what Claude gives you as if you were the team's product manager. Ask for changes until you would hand the story to a developer.
- [ ] Stop the timer when you accept the story.
- [ ] Count the edits. One edit is one change you asked Claude to make, or one line you changed yourself. Asking Claude a question that changes nothing is not an edit.
- [ ] Read the accepted story as the developer who has to build it. Write down every question you would still ask before starting. Leave out anything the story already answers.

## Results

Fill in one row per input. Keep the rows in this order and the columns as they are.

- **Time**: minutes and seconds from pasting the input to accepting the story, as `m:ss`, for example `6:40`.
- **Edits**: a whole number. Write `0` if you accepted it as it came.
- **Dev questions**: a whole number, the count of questions a developer would still ask. List each one under "Developer questions" below.
- **Passed checker**: `yes` if Claude said the checker passed before it showed you the story, otherwise `no`.

Date: YYYY-MM-DD
Commit: 
Model: 

| Input | Time | Edits | Dev questions | Passed checker |
|---|---|---|---|---|
| skip-a-box-meeting.md | m:ss | 0 | 0 | yes |
| helpline-ticket-48213.md | m:ss | 0 | 0 | yes |
| holiday-cutoff-email.md | m:ss | 0 | 0 | yes |

## Developer questions

Write each question under its input. Write "None." if there were none.

### skip-a-box-meeting.md
- 

### helpline-ticket-48213.md
- 

### holiday-cutoff-email.md
- 

## Notes

Anything that went wrong or surprised you, one line each. For example: the skill didn't start, the checker didn't run, or a fact was invented.
