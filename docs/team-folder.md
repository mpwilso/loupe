# The team folder

In Claude Code, Loupe reads what it knows about your team from a folder named `loupe/` at the root of your repository. Everyone who works in the repository gets the same context, and changes to it go through your usual reviews.

```
loupe/
  context/      the context files: applications.md, environments.md, priorities.md, conventions.md, story-style.md
  learned.md    what Loupe has learned from corrections and answers
  templates/    your team's own story templates, if it has any
  stories/      the stories Loupe writes, one file each
```

- **context/** holds the same context files as in claude.ai, in the same format: dated, with a source on every fact. Loupe writes them when you set up the team, after you say yes.
- **learned.md** is the file Loupe keeps from corrections and answers. In Claude Code, Loupe edits it in place after you say yes, and shows you the change.
- **templates/** holds team templates, such as a change request form, in the format of the built-in templates.
- **stories/** holds each finished story as `<yyyy-mm-dd>-<short-slug>.md`, for example `2026-10-02-skip-next-box.md`.

Loupe reads and writes only inside `loupe/`. It never changes any other file in your repository.

## Check it

Run the checker on the whole folder, from the repository's root:

```
node path/to/loupe-skill/src/run.js check-folder loupe
```

It checks the context files, learned.md, the templates and every story, and ends with `Checked with Node` and the version when everything passes.

## Try it with the example team

`node scripts/build-team-folder.ts <folder>` builds a team folder for Pellwick, the invented team the trials use, at `<folder>/loupe`. Its stories folder starts empty.
