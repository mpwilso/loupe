#!/usr/bin/env bash
# Builds the trial kit folder CI uploads: the Pellwick team files and inputs, and the current trial plan, all at its root.
# It leaves out the expected stories, so a trial stays blind.
# Usage: scripts/build-trial-kit.sh [out-folder]   (default: build/pellwick-trial-kit)
set -euo pipefail
cd "$(dirname "$0")/.."

out="${1:-build/pellwick-trial-kit}"
rm -rf "$out"
mkdir -p "$out"
cp -R examples/pellwick/context examples/pellwick/templates examples/pellwick/inputs examples/pellwick/raw "$out/"
cp docs/trials/trial-6-plan.md "$out/"
echo "built $out"
