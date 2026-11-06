# Limits

What Loupe has and hasn't been tested on, as of the ten trials in [docs/trials](trials/README.md).

- Tested on one invented company, at about one to three minutes per story.
- Skills on claude.ai belong to one person, so each teammate uploads it once.
- In claude.ai, you swap the updated learned.md into the project's files by hand; in Claude Code, Loupe edits it in place. Learning has been tested on the invented team and no other.
- The customer-data detector catches emails and secrets, but not names, phone numbers or street addresses.
- Looks at lower environments and calibrated estimates have been tried on the mock environment and the example history, in no trial. The checker refuses a look with any sign of a write, and some reads carry one, such as a `-d` database flag; a command can also write without any sign, so a person reads every look before it runs, and Claude Code asks before it runs.
- A calibrated estimate is checked against history.md where the checker can find it: in a team folder, or next to a story's context folder. In claude.ai the checker sees the story alone, so it checks the line's form and takes its names on trust.
- Reading a tracker and creating tickets were tested on an invented mock tracker, never a real one, with Claude Code's own permission prompt stood in for in trial 9.
- Where Loupe cites tracker facts still varies from run to run: in trial 8e, 2 of 3 stories listed a fact from a ticket under Known, and the third left it as a question.
- The Claude Code plugin is untested in trials. The terminal is tested; the VS Code extension isn't yet.
- The trials were run by the people who built Loupe. [docs/trials](trials/README.md) says who scored each trial, and which were blind.
