# Trial 9: compares every created ticket with its story file, byte for byte, and lists every tool call by turn.
# It reads the saved outputs and runs the checker; it never calls a model.
# Usage: python3 scripts/trials/trial-9/compare.py <out-folder> [run ...]
#   <out-folder> is where run-all.sh wrote its outputs, such as build/trial-9. It holds copies.txt, one "run copy-folder"
#   line per run, and a folder of saved turns per run. With no runs named, every run of the trial is compared.
import json, os, subprocess, sys

if len(sys.argv) < 2:
    sys.exit('Usage: python3 compare.py <out-folder> [run ...]')
OUT = sys.argv[1].rstrip('/')
copies = dict(l.split() for l in open(f'{OUT}/copies.txt'))
copies['D-1'], copies['E-1'] = copies['A-1'], copies['A-2']
TYPES = {'As a': 'Story', 'When ': 'Story'}


def turns(run):
    out = []
    for name in sorted(f for f in os.listdir(f'{OUT}/{run}') if f.startswith('turn-') and f.endswith('.jsonl')):
        uses, reply = [], ''
        for line in open(f'{OUT}/{run}/{name}'):
            e = json.loads(line)
            if e.get('type') == 'assistant':
                uses += [c for c in e['message'].get('content', []) if c.get('type') == 'tool_use']
            if e.get('type') == 'result':
                reply, cost, denials = e.get('result') or '', e.get('total_cost_usd'), e.get('permission_denials') or []
        out.append({'name': name[:-6], 'uses': uses, 'reply': reply, 'cost': cost, 'denials': denials})
    return out


def state(path):
    return json.load(open(path))['issues'] if os.path.exists(path) else []


for run in sys.argv[2:] or ['A-1', 'A-2', 'A-3', 'B-1', 'C-1', 'D-1', 'E-1']:
    copy = copies[run]
    print(f'== {run}')
    for t in turns(run):
        mcp = [f"{u['name'].split('__')[-1]}({json.dumps(u['input'])[:90]})" for u in t['uses'] if u['name'].startswith('mcp__')]
        other_mcp = [u['name'] for u in t['uses'] if u['name'].startswith('mcp__') and u['name'].split('__')[-1] not in ('search_issues', 'get_issue', 'recent_issues', 'create_issue')]
        lines = [l for l in t['reply'].strip().splitlines() if l.strip()]
        print(f"  {t['name']}: cost ${t['cost']:.3f} | tracker calls: {mcp} | other tracker tools: {other_mcp} | denials: {[d['tool_name'] for d in t['denials']]}")
        print(f"    reply: {len(lines)} lines; first: {lines[0][:150] if lines else ''!r}; asks 'Create this in SUBS?': {'Create this in SUBS?' in t['reply']}")
    log = [json.loads(l) for l in open(f'{OUT}/{run}/tracker-calls.jsonl')] if os.path.exists(f'{OUT}/{run}/tracker-calls.jsonl') else []
    print(f"  server log: {[(c['tool'], c['arguments'].get('key') or c['arguments'].get('query') or c['arguments'].get('title')) for c in log]}")
    before = {i['key'] for i in state(f'{OUT}/{run}/state-before.json')} if run in ('D-1', 'E-1') else set()
    created = [i for i in state(f'{copy}/tracker-state.json') if i['key'] not in before]
    print(f'  tickets created in this run: {[i["key"] for i in created]}')
    tickets = open(f'{copy}/loupe/tickets.md').read() if os.path.exists(f'{copy}/loupe/tickets.md') else None
    print(f'  tickets.md: {tickets!r}')
    for issue in created:
        line = next((l for l in (tickets or '').splitlines() if l.startswith(issue['key'] + ',')), None)
        story_file = line.split(', ')[1] if line else None
        path = f'{copy}/loupe/stories/{story_file}' if story_file else None
        raw = open(path, 'rb').read() if path and os.path.exists(path) else None
        desc = issue['description'].encode()
        text = raw.decode() if raw else ''
        title = next((l[2:] for l in text.splitlines() if l.startswith('# ')), None)
        story_line = text.split('## The story\n', 1)[1].strip().splitlines()[0] if '## The story\n' in text else ''
        want_type = next((v for k, v in TYPES.items() if story_line.startswith(k)), '?')
        print(f'  {issue["key"]}: story {story_file}; description == story file, byte for byte: {raw == desc} ({len(desc)} vs {len(raw) if raw else None} bytes)')
        if raw and raw != desc:
            i = next((n for n, (a, b) in enumerate(zip(raw, desc)) if a != b), min(len(raw), len(desc)))
            print(f'    first difference at byte {i}: story {raw[i:i+40]!r} ticket {desc[i:i+40]!r}')
        print(f'    title == story title: {issue["title"] == title} | type {issue["type"]} (expected {want_type}) | labels {issue["labels"]} | first line {text.splitlines()[0] if text else None!r}')
        chk = subprocess.run(['node', f'{copy}/.claude/skills/loupe/src/run.js', 'check', path], capture_output=True, text=True) if path else None
        print(f'    story checker (with the customer-data detector) on the story: {chk.stdout.strip().splitlines() if chk else None}; "@" in description: {"@" in issue["description"]}')
    folder = subprocess.run(['node', f'{copy}/.claude/skills/loupe/src/run.js', 'check-folder', f'{copy}/loupe'], capture_output=True, text=True)
    print(f'  check-folder: exit {folder.returncode}: {folder.stdout.strip().splitlines()[-3:]}')
