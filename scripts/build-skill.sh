#!/usr/bin/env bash
# Builds the skill folder and zip from the repo's own files, so skill/ holds only SKILL.md and nothing is copied by hand.
# The folder is left next to the zip (dist/loupe/ by default), and CI uploads that folder as the skill.
# Usage: scripts/build-skill.sh [out.zip]   (default: dist/loupe-skill.zip)
set -euo pipefail
cd "$(dirname "$0")/.."

out="${1:-dist/loupe-skill.zip}"
mkdir -p "$(dirname "$out")"
out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"

# The folder name must match the skill's name. scripts/skill-folder.ts holds the list of what goes in it.
dir="$(dirname "$out")/loupe"
node scripts/skill-folder.ts "$dir"

rm -f "$out"
node scripts/zip.ts "$out" "$dir"
echo "built $out"
