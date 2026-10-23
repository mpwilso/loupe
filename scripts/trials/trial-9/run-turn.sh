#!/usr/bin/env bash
# One trial 9 turn, headless, in its copy. Usage: run-turn.sh <copy> <out> <name> <session-flag> <session-id> <prompt>
set -uo pipefail
T=$1; OUT=$2; name=$3; flag=$4; sid=$5; prompt=$6
SETTINGS="$(cd "$(dirname "$0")" && pwd)/settings-flag.json"
mkdir -p "$OUT"; cd "$T"
timeout 900 claude -p "$prompt" $flag "$sid" \
  --model sonnet --effort medium \
  --permission-mode manual --permission-prompts none \
  --settings "$(cat $SETTINGS)" \
  --mcp-config "$T/.mcp.json" --strict-mcp-config \
  --output-format stream-json --verbose < /dev/null > "$OUT/$name.jsonl" 2> "$OUT/$name.stderr"
echo "exit $? for $OUT/$name"
python3 - "$OUT/$name.jsonl" "$OUT/$name.md" <<'PY'
import json, sys
src, dst = sys.argv[1], sys.argv[2]
out = []
for line in open(src):
    try: e = json.loads(line)
    except: continue
    if e.get('type') == 'system' and e.get('subtype') == 'init':
        out.append(f"[init] mcp: {e.get('mcp_servers')} | tracker tools: {[t for t in e.get('tools', []) if t.startswith('mcp__')]}")
    if e.get('type') == 'assistant':
        for c in e['message'].get('content', []):
            if c.get('type') == 'tool_use':
                out.append(f"[tool] {c['name']}: {json.dumps(c.get('input'))[:300]}")
    if e.get('type') == 'user':
        for c in e['message'].get('content', []) if isinstance(e['message'].get('content'), list) else []:
            if c.get('type') == 'tool_result':
                t = c.get('content'); t = t if isinstance(t, str) else json.dumps(t)
                out.append(f"[result] {t[:400]}")
    if e.get('type') == 'result':
        out.append('\n=== FINAL REPLY ===\n' + str(e.get('result')))
        out.append(f"\n[cost ${e.get('total_cost_usd')}, turns {e.get('num_turns')}, denials {e.get('permission_denials')}]")
open(dst, 'w').write('\n'.join(out))
PY
