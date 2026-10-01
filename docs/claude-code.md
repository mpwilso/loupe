# Use Loupe in Claude Code

Loupe works in Claude Code, in a terminal or in the VS Code extension, the same way it works in claude.ai: the same story shape, the same checker, the same learning loop. The differences: your team's context lives in a `loupe/` folder in your repository, each story is saved as a file, and learned.md is edited in place, so there is no file to swap.

You need Claude Code and Node 22.18 or newer.

## 1. Install the skill (once)

Clone this repository, then run the installer from it:

```
git clone https://github.com/mpwilso/loupe.git
cd loupe
node scripts/install-claude-code.ts
```

That installs Loupe for you, in `~/.claude/skills/loupe`, for every project. To install it for one repository instead, so everyone who clones that repository gets it, run:

```
node scripts/install-claude-code.ts --project path/to/your/repo
```

That puts it in `.claude/skills/loupe` in that repository; commit that folder. Run the installer again to update Loupe. It refuses to overwrite a different skill that is also named loupe, and says what to do.

## 2. Create the team folder

Start Claude Code at the root of your repository, then either:
- type "set up the team", point Loupe at your team's documents, and say yes to the context files it shows; or
- copy a `loupe/` folder from another repository of your team's.

To try it first with Pellwick, the invented team the trials use, run `node scripts/build-team-folder.ts path/to/your/repo` from this repository. [team-folder.md](team-folder.md) describes what goes in the folder.

## 3. Write a story

Paste notes, a transcript, a ticket or an email, or name a file: "write a story from notes/meeting.md". Loupe checks the input, writes the story, runs the checker until it passes, saves the story in `loupe/stories/`, and ends its reply with `Checked with Node` and the version.

To check the whole folder yourself:

```
node ~/.claude/skills/loupe/src/run.js check-folder loupe
```

For a per-project install, use `.claude/skills/loupe/src/run.js` in place of the path above.

## 4. Correct it, and Loupe learns

Correct a story, answer one of its questions, or ask Loupe to remember something about the team. It proposes the exact learned.md entries, each with its source, and asks "Save these to learned.md?" On a yes, it edits `loupe/learned.md`, checks the folder, and shows you the change. The next story uses it.

## What to commit

Commit `loupe/context/`, `loupe/learned.md` and `loupe/templates/`, so everyone gets the same context and changes go through review. Whether to commit `loupe/stories/` is your team's choice.

## Keep Loupe inside its folder

Loupe writes only inside `loupe/` and never changes any other file in your repository. Claude Code can back that up: with this rule in `.claude/settings.json`, it lets Loupe edit inside `loupe/` without asking, and still asks you before any other edit.

```
{ "permissions": { "allow": ["Edit(/loupe/**)"] } }
```

Claude Code checks file writes against `Edit` rules; a `Write` rule is accepted but never used.

## Good to know

- In VS Code, the extension shows a subset of Claude Code's skills. Type `/` or `/skills` in the chat panel to check Loupe is there.
- SKILL.md is a common format that other agents, such as Codex, can read, but only Claude Code has been tested.
