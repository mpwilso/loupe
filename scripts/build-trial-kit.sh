#!/usr/bin/env bash
# Builds the trial kit folder CI uploads: the Pellwick team files and inputs, and the current trial plan, all at its root.
# The current plan is the one with the highest number in docs/trials, so trial-10-plan.md comes after trial-9-plan.md.
# It leaves out the expected stories, so a trial stays blind.
# Usage: scripts/build-trial-kit.sh [out-folder]   (default: build/pellwick-trial-kit)
set -euo pipefail
cd "$(dirname "$0")/.."

out="${1:-build/pellwick-trial-kit}"
plan="$(ls docs/trials/trial-*-plan.md | sort -t- -k2,2n | tail -n 1)"
rm -rf "$out"
mkdir -p "$out"
cp -R examples/pellwick/context examples/pellwick/templates examples/pellwick/inputs examples/pellwick/raw "$out/"
cp "$plan" "$out/"
echo "built $out, with $(basename "$plan")"
