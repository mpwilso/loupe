#!/usr/bin/env bash
# Builds the skill folder and zip from the repo's own files, so skill/ holds only SKILL.md and nothing is copied by hand.
# The folder is left next to the zip (dist/loupe/ by default), and CI uploads that folder as the skill.
# Usage: scripts/build-skill.sh [out.zip]   (default: dist/loupe-skill.zip)
set -euo pipefail
cd "$(dirname "$0")/.."

out="${1:-dist/loupe-skill.zip}"
mkdir -p "$(dirname "$out")"
out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"

# The folder name must match the skill's name.
dir="$(dirname "$out")/loupe"
rm -rf "$dir"
mkdir -p "$dir/src" "$dir/spec" "$dir/templates" "$dir/examples"

cp skill/SKILL.md skill/writing-rules.md skill/learning.md "$dir/"
cp src/run.js src/node-version.js src/check.ts src/check-context.ts src/spec.ts "$dir/src/"
cp spec/*.json "$dir/spec/"
cp templates/*.md "$dir/templates/"
cp examples/pellwick/expected/skip-a-box.md "$dir/examples/story.md"
cp examples/pellwick/expected/export-notes.md "$dir/examples/not-ready.md"
cp examples/pellwick/context/applications.md "$dir/examples/context-file.md"
# Tells Node the checkers are modules. They need nothing else.
printf '{ "type": "module", "private": true }\n' > "$dir/package.json"

rm -f "$out"
node scripts/zip.ts "$out" "$dir"
echo "built $out"
