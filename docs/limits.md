# Limits

What Loupe has and hasn't been tested on, as of the ten trials in [docs/trials](trials/README.md).

- Tested on one invented company. Loupe took about one to three minutes from a request to a checked story. The people who built Loupe ran the trials, and Claude scored every trial but trial 3: a separate Claude chat, with Matt Wilson checking its scores, or the Claude Code session that ran the trial.
- Skills on claude.ai belong to one person, so each teammate uploads it once.
- In claude.ai, you swap the updated learned.md into the project's files by hand; in Claude Code, Loupe edits it in place. Learning has been tested on the invented team and no other.
- The customer-data detector catches emails and secrets, but not names, phone numbers or street addresses.
- Looks at lower environments and calibrated estimates have been tried on the mock environment and the example history, in no trial. A look must be one read command from a short list, and code refuses anything else. That checks names and forms, not proof: a SELECT can still call a function that changes data, and a host named staging can point at production. A person reads every look, and Claude Code asks before each one runs.
- A calibrated estimate is checked against history.md where the checker can find it: in a team folder, or next to a story's context folder. In claude.ai the checker sees the story alone, so it checks the line's form and takes its names on trust.
- Reading a tracker and creating tickets were tested on an invented mock tracker, never a real one. In trial 9, a setting let the create tool run without Claude Code's permission prompt, so that prompt, the second lock, wasn't tested.
- Where Loupe cites tracker facts still varies from run to run: in trial 8e, 2 of 3 stories listed a fact from a ticket under Known, and the third left it as a question.
- The Claude Code plugin is untested in trials. The terminal is tested; the VS Code extension isn't yet.
- [docs/trials](trials/README.md) says who scored each trial, and which were blind.
