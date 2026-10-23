#!/usr/bin/env bash
# Trial 9: A three times, B and C once, in parallel, each in its own copy; then D in A-1's conversation and E in A-2's.
# Every turn calls claude -p, so this costs money and the tests never run it.
# Usage: scripts/trials/trial-9/run-all.sh [out-folder]   (default: build/trial-9)
#   Before running, make the copies as the trial 9 plan says and list them in <out-folder>/copies.txt, one
#   "run copy-folder" line each for A-1, A-2, A-3, B-1 and C-1. Outputs go to <out-folder>/<run>/.
HERE="$(cd "$(dirname "$0")" && pwd)"
OUT="${1:-$(cd "$HERE/../../.." && pwd)/build/trial-9}"
copy() { grep "^$1 " "$OUT/copies.txt" | cut -d' ' -f2; }
conversation() { # run, then each message in turn
  local run=$1; shift; local sid; sid=$(uuidgen); echo "$sid" > "$OUT/$run/session.txt"
  local n=1 flag=--session-id
  for message in "$@"; do "$HERE/run-turn.sh" "$(copy "$run")" "$OUT/$run" "turn-$n" $flag "$sid" "$message"; n=$((n + 1)); flag=--resume; done
}
STORY="Write a story from notes/skip-a-box-meeting.md."
for n in 1 2 3; do conversation A-$n "$STORY" "Create a ticket for it." "Yes." & done
conversation B-1 "$STORY" "Create a ticket for it." "Not yet." &
conversation C-1 "Write a story from notes/export-notes.md." "Create a ticket for it." &
wait
# D and E continue A-1's and A-2's conversations, with their own tracker logs.
for pair in "D-1 A-1 Create a ticket for it." "E-1 A-2 Change its title to Skip a box online."; do
  set -- $pair; run=$1; from=$2; shift 2; message="$*"
  mkdir -p "$OUT/$run"; c=$(copy "$from")
  sed -i "s#$OUT/$from/tracker-calls.jsonl#$OUT/$run/tracker-calls.jsonl#" "$c/.mcp.json"
  cp "$c/tracker-state.json" "$OUT/$run/state-before.json" 2>/dev/null
  "$HERE/run-turn.sh" "$c" "$OUT/$run" turn-1 --resume "$(cat "$OUT/$from/session.txt")" "$message" &
done
wait
