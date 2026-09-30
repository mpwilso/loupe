#!/usr/bin/env bash
# The single test entry point, for local runs and CI alike.
set -uo pipefail
cd "$(dirname "$0")/.."

failed=0

echo "== Type check: tsc --noEmit"
if node_modules/.bin/tsc --noEmit -p .; then echo "type check: passed"; else echo "type check: FAILED"; failed=1; fi

echo
echo "== Unit tests: node --test"
node --test --test-reporter=spec 'tests/**/*.test.ts' || failed=1

echo
echo "== Checkers over examples/ and templates/"
pass=0
fail=0
run() {
  if output=$(node "$@" 2>&1); then pass=$((pass + 1)); else fail=$((fail + 1)); echo "FAIL ${*: -1}"; fi
  output=$(echo "$output" | grep -v '^Checked with Node ')
  [ -n "$output" ] && echo "$output" | sed 's/^/  /'
  return 0
}
for f in templates/*.md; do [ "$f" = templates/definition-of-ready.md ] || run src/check.ts "$f"; done
# The checker finds each team's templates folder on its own.
for f in examples/*/templates/*.md examples/*/expected/*.md; do [ -e "$f" ] && run src/check.ts "$f"; done
for f in examples/*/context/*.md; do run src/check-context.ts "$f"; done
echo "checked files: $((pass + fail)), passed: $pass, failed: $fail"
[ "$fail" -eq 0 ] || failed=1

echo
if [ "$failed" -eq 0 ]; then echo "ALL PASSED"; else echo "SOME CHECKS FAILED"; fi
exit "$failed"
