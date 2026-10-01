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

## Story format

New user stories, job stories and bugs use story format v2, built for developers and testers: Background, an Example from the input, numbered Requirements, Notes and Test scenarios, each scenario with a happy path and at least one unhappy path. Stories saved in v1, with acceptance criteria, still pass the checker. Spikes and team templates keep their own sections.

## What to commit

Commit `loupe/context/`, `loupe/learned.md` and `loupe/templates/`, so everyone gets the same context and changes go through review. Whether to commit `loupe/stories/` is your team's choice.

## Recommended permissions

The skill's own rule keeps Loupe inside `loupe/`: it writes only there, and runs only its checker and `git diff` or `git status`. These permissions make Claude Code enforce it. Put them in `.claude/settings.json` in your repository:

```json
{
  "permissions": {
    "allow": [
      "Edit(/loupe/**)",
      "Bash(node .claude/skills/loupe/src/run.js *)",
      "Bash(node */.claude/skills/loupe/src/run.js *)",
      "Bash(git diff *)",
      "Bash(git status *)"
    ]
  }
}
```

Loupe can then edit inside `loupe/` and run its checker without asking, and Claude Code asks you before anything else. The first `node` rule covers a project install, run from the repository's root; the second covers a checker named by its full path, as with a personal install. If Claude still asks before running the checker, `Bash(node */src/run.js *)` works too, but it also lets Claude run any Node script whose arguments include `/src/run.js`. Allow nothing broader. Claude Code checks file writes against `Edit` rules; a `Write` rule is accepted but never used.

Keep the leading slash in `Edit(/loupe/**)`. In a settings file, it anchors the rule at your repository's root, so it still matches after Claude changes directory. Without it, `loupe/**` is relative to the current directory: after a `cd` into `loupe/`, it points at `loupe/loupe/`, and every save asks you first. Earlier versions of this guide had that rule.

Claude Code ignores allow rules in a repository's `.claude/settings.json` until you trust that folder: start Claude Code there once and accept its trust prompt. Until then, it asks before every edit. To use these rules only for yourself, put the same block in `.claude/settings.local.json` instead: it needs no trust prompt as long as git doesn't track it.

## If you also use Loupe in claude.ai

Claude Code also loads the skills on your claude.ai account, so your claude.ai copy of Loupe loads alongside this one, as `anthropic-skills:loupe`. To use only the one you installed here, turn the other off in your settings:

```json
{ "skillOverrides": { "anthropic-skills:loupe": "off" } }
```

If Loupe is installed both for you and for a project, a personal install beats a project install, so run the installer the same way everywhere.

## Good to know

- The terminal CLI is tested. The VS Code extension runs its own copy of the same CLI, but hasn't been tested with Loupe yet. Type `/` or `/skills` in its chat panel to check Loupe is there.
- SKILL.md is a common format that other agents, such as Codex, can read, but only Claude Code has been tested.
