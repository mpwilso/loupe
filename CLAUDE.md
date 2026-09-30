# Loupe rules

- This is a personal project. Examples and test data use invented names only.
- No em dashes anywhere: code, docs, comments, commit messages.
- Less is more. No filler, no bloat. Use plain words an intern and an executive both understand.
- The story shape in docs/direction.md is law. Anything that produces a story must pass the checker.
- Tests never call a model.
- scripts/test.sh is the single test entry point, for local runs and CI alike.
- Work on a branch. Never push to master directly.
- Never claim a fix without a reproduction that failed and then passed.
- Every report says which test command ran, the exact counts and skips, and the commit ids.
