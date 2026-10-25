# What each folder holds

- `skill/`: the skill's instructions and writing rules.
- `spec/`: the story shape, the readiness bar, the plain-language rules and the context-file format, as data.
- `src/`: the checkers.
- `examples/pellwick/`: an invented team used for trials, from its raw documents to the expected stories.
- `docs/`: the guides, such as [claude-code.md](claude-code.md) for Claude Code and [live-context.md](live-context.md) for the tracker.
- `docs/trials/`: what each trial found.
- `mock/`: an invented tracker for trying the tracker features.
- `brand/`: the mark, lockups and palette. `node scripts/brand.ts` draws them, and the diagram; see [brand/](../brand/README.md).
- `scripts/`: the test runner, the skill builder, the brand drawing and the trial 9 scripts.

The story shape is data in `spec/*.json`. The checker in `src/` enforces it, and the skill loops until the story passes. Run the tests with `scripts/test.sh`.
