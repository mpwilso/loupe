# Security

If you find a security problem in Loupe, please report it privately, not in a public issue. On GitHub, open the repository's **Security** tab and choose **Report a vulnerability**. GitHub keeps the report between you and the maintainer.

Please say what you found, how to reproduce it, and what it affects. You'll get a reply, and a fix if one is needed.

## What this covers

- The checkers in `src/`, which read story, context and template files and run no commands.
- The mock tracker in `mock/tracker/`, used in trials with invented issues and never with real data.
- The skill in `skill/`: the instructions Claude follows, including its rules on tracker writes and customer data.
- The release zip, `loupe-skill.zip`, and its build provenance attestation.

Each release's `loupe-skill.zip` carries a build provenance attestation from GitHub Actions. To check that a zip came from this repository's release workflow, run `gh attestation verify loupe-skill.zip --repo mpwilso/loupe`.

This is a personal project. There is no bug bounty.
