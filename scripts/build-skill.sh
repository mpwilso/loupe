#!/usr/bin/env bash
# Builds the skill zip from the repo's own files, so skill/ holds only SKILL.md and nothing is copied by hand.
# Usage: scripts/build-skill.sh [out.zip]   (default: dist/loupe-skill.zip)
set -euo pipefail
cd "$(dirname "$0")/.."

out="${1:-dist/loupe-skill.zip}"
mkdir -p "$(dirname "$out")"
out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
# The folder name must match the skill's name.
dir="$stage/loupe"
mkdir -p "$dir/src" "$dir/spec" "$dir/templates" "$dir/examples"

cp skill/SKILL.md "$dir/"
cp src/check.ts src/check-context.ts src/spec.ts "$dir/src/"
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
