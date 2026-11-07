# Live context from a tracker

In Claude Code, Loupe can read your team's tracker before it writes a story: it looks for related and duplicate issues, cites what it uses with the issue and the time it read it, and flags an open issue that looks like the same request. It can also create a ticket from a finished story, only after you say yes: see [Creating tickets](#creating-tickets). It never changes an existing issue.

Loupe uses whatever tracker tools Claude Code has. You add a tracker as an MCP server, then allow only its tools that read.

## Try it with the mock tracker

This repository has a mock tracker, with invented Pellwick issues, for trying Loupe safely. It has three tools, all of which read: `search_issues`, `get_issue` and `recent_issues`. It has no tool that writes.

Register it in your team repository's `.mcp.json`, using the full path to your copy of this repository:

```
{
  "mcpServers": {
    "pellwick-tracker": {
      "command": "node",
      "args": ["/path/to/loupe/mock/tracker/server.ts", "/path/to/loupe/examples/pellwick/tracker/issues.json"]
    }
  }
}
```

Claude Code asks before it uses a server from a repository's `.mcp.json` for the first time. In this repository, `examples/pellwick/tracker/mcp.json` has the same config with paths relative to this repository's root.

## Allow only the tools that read

Claude Code names each MCP tool `mcp__<server>__<tool>`. Add the three read tools to the allow list in `.claude/settings.json`, next to Loupe's other rules from [claude-code.md](claude-code.md):

```json
{
  "permissions": {
    "allow": [
      "mcp__pellwick-tracker__search_issues",
      "mcp__pellwick-tracker__get_issue",
      "mcp__pellwick-tracker__recent_issues"
    ]
  }
}
```

Allow nothing else on a tracker. Any other tool, if a server has one, should be denied or left to ask, so it never runs without your say-so.

## A real Jira server

This is not tested with Loupe, and Loupe's trials never use a real tracker. Try it only on a Jira site you own, never on an employer's systems.

Atlassian's MCP server lists its Jira tools in groups on its [supported tools page](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/), checked on 2026-09-30. If you register it under the name `atlassian`, allow only the tools Loupe needs to read, and deny every tool that writes or deletes:

```json
{
  "permissions": {
    "allow": [
      "mcp__atlassian__searchJiraIssuesUsingJql",
      "mcp__atlassian__getJiraIssue"
    ],
    "deny": [
      "mcp__atlassian__createJiraIssue",
      "mcp__atlassian__editJiraIssue",
      "mcp__atlassian__transitionJiraIssue",
      "mcp__atlassian__addOrEditJiraIssueComment",
      "mcp__atlassian__addOrEditJiraIssueWorklog",
      "mcp__atlassian__createJiraIssueLink",
      "mcp__atlassian__manageJiraProjectVersion",
      "mcp__atlassian__manageJiraProjectVersionRelatedWork",
      "mcp__atlassian__manageJiraSprint",
      "mcp__atlassian__createJiraBoard",
      "mcp__atlassian__watchJiraIssue",
      "mcp__atlassian__uploadAttachmentToJiraIssue",
      "mcp__atlassian__editJiraEntityProperty",
      "mcp__atlassian__createJiraIssueRemoteIssueLink",
      "mcp__atlassian__convertJiraIssueHierarchy",
      "mcp__atlassian__deleteJiraIssue",
      "mcp__atlassian__deleteJiraComment",
      "mcp__atlassian__deleteJiraIssueAttachment",
      "mcp__atlassian__createJiraProject",
      "mcp__atlassian__updateJiraProject",
      "mcp__atlassian__updateJiraScreen"
    ]
  }
}
```

The deny list names the tools on that page as of the date above. Tool names change, so check the page again before you rely on it; a tool added later is neither allowed nor denied, so Claude Code asks before it runs.

## Looks at a lower environment

A lower environment is a test or staging copy of a system, never the one customers use. In Claude Code, Loupe can look at one before it writes a story, so a Known line can say what the system does today, with the environment and the time it looked: "(staging, looked 2026-10-02 14:05)". A look is one of the commands your team lists in `loupe/context/looks.md`, with the environment it reads and who gave it.

Code checks every look, twice: `check-context` when looks.md is written, and `check-look` just before the look runs, with its values filled in. A look must be one command, from this short list:
- `curl`, sending GET and nothing else, with no data, form, upload, output file, config file or password;
- `wget`, with `-O -` so it prints what it reads, and no method, data or output file;
- HTTPie (`http` or `https`), with GET or no method, and `--ignore-stdin`;
- `psql` or `mysql`, with one query that is a single SELECT;
- `kubectl get`, `describe` or `logs`, with `--context` naming the cluster, and never a secret.

Anything else is refused, and so is any shell character, such as `|`, `;`, `&&`, `>`, `$(` or a backtick, anywhere in the command. So is a word that writes, such as UPDATE, DELETE or INTO, even as part of a word like `updateOne`. A placeholder, like `{subscriber}` or `{day:date}`, can sit in a URL's path or query value, or inside a single-quoted value in a query, and nowhere else; its value must be an id (letters, digits, `_` or `-`) or a real date. Loupe runs only the command `check-look` prints after `ok: `.

Loupe never looks at production. Both checks refuse an environment, a host or a cluster whose name has prod, prd, production or live as a part, like `prod1`, `PROD_US` or `db.prod.example.test`. They check names, not where a host really points: a host named staging that points at production gets through, so a person reads every look.

Claude Code asks you before every look, because a look is a Bash command. That prompt is the second lock: read the command, and refuse anything that isn't the one `check-look` printed. Never add an allow rule for a look.

### Try it with the mock environment

This repository has a mock lower environment, a small web server with invented Pellwick staging data. It answers GET and nothing else. Start it from your copy of this repository:

```
node /path/to/loupe/mock/environment/server.ts
```

It listens on `http://localhost:8765`. The example team's `examples/pellwick/context/looks.md` lists two looks at it, and `node scripts/build-team-folder.ts` copies that file into the team folder it builds, so a story about subscriber 1042's next box can cite what staging shows. To fill in its first look yourself:

```
node /path/to/loupe/src/run.js check-look loupe/context/looks.md 1 subscriber=1042
```

That prints `ok: curl -s http://localhost:8765/subscribers/1042/next-box`.

### A real lower environment

This is not tested with Loupe. List only reads, on a lower environment that holds made-up data, and never production. The checks are a guard, not proof: a SELECT can call a function that changes data, and an API can change data on a GET. Read every look before you list it, and again when Claude Code asks.

## Creating tickets

When you ask for a ticket from a finished story, Loupe shows exactly what it will create, asks "Create this in SUBS?", and creates it only after a clear yes. It never updates, comments on, moves, assigns, closes or deletes an issue. It keeps a list of the tickets it created in `loupe/tickets.md`, and the folder check makes sure each one names a finished story and no story has two.

There are two locks, and you need both:
1. Loupe asks you first, and creates nothing without a clear yes.
2. Claude Code asks you again before the create tool runs, because the tool is never allowed in your settings.

### Try it with the mock tracker

Start the mock in create mode. It then has one more tool, `create_issue`, and keeps the issues it creates in a state file you name, never in its issues file. Use a path outside your repository:

```
{
  "mcpServers": {
    "pellwick-tracker": {
      "command": "node",
      "args": ["/path/to/loupe/mock/tracker/server.ts", "/path/to/loupe/examples/pellwick/tracker/issues.json", "--allow-create", "--state", "/tmp/pellwick-tracker-state.json"]
    }
  }
}
```

Keep the three read tools allowed, and put the create tool under `ask`, never `allow`:

```json
{
  "permissions": {
    "allow": [
      "mcp__pellwick-tracker__search_issues",
      "mcp__pellwick-tracker__get_issue",
      "mcp__pellwick-tracker__recent_issues"
    ],
    "ask": [
      "mcp__pellwick-tracker__create_issue"
    ]
  }
}
```

Why `ask`: Claude Code checks deny rules first, then ask, then allow. An ask rule makes it prompt you every time, even if a broader allow rule somewhere else would match the tool. That prompt is the second lock. Never add the create tool to an allow list.

If Claude Code's prompt shows a create call with empty or missing fields, deny it. In [trial 9](trials/2026-10-01-trial-9.md), one run sent a create call with no fields, and the mock rejected it.

### A real Jira server

This is not tested with Loupe. Try it only on a Jira site you own, never on an employer's systems.

On Atlassian's MCP server, the tool that creates an issue is `createJiraIssue`, as listed on its [supported tools page](https://support.atlassian.com/atlassian-rovo-mcp-server/docs/supported-tools/), checked on 2026-10-01. To let Loupe create tickets, move it from `deny` to `ask`, and keep every other tool that writes or deletes denied:

```json
{
  "permissions": {
    "allow": [
      "mcp__atlassian__searchJiraIssuesUsingJql",
      "mcp__atlassian__getJiraIssue"
    ],
    "ask": [
      "mcp__atlassian__createJiraIssue"
    ],
    "deny": [
      "mcp__atlassian__editJiraIssue",
      "mcp__atlassian__transitionJiraIssue",
      "mcp__atlassian__addOrEditJiraIssueComment",
      "mcp__atlassian__addOrEditJiraIssueWorklog",
      "mcp__atlassian__createJiraIssueLink",
      "mcp__atlassian__manageJiraProjectVersion",
      "mcp__atlassian__manageJiraProjectVersionRelatedWork",
      "mcp__atlassian__manageJiraSprint",
      "mcp__atlassian__createJiraBoard",
      "mcp__atlassian__watchJiraIssue",
      "mcp__atlassian__uploadAttachmentToJiraIssue",
      "mcp__atlassian__editJiraEntityProperty",
      "mcp__atlassian__createJiraIssueRemoteIssueLink",
      "mcp__atlassian__convertJiraIssueHierarchy",
      "mcp__atlassian__deleteJiraIssue",
      "mcp__atlassian__deleteJiraComment",
      "mcp__atlassian__deleteJiraIssueAttachment",
      "mcp__atlassian__createJiraProject",
      "mcp__atlassian__updateJiraProject",
      "mcp__atlassian__updateJiraScreen"
    ]
  }
}
```

Never auto-allow `createJiraIssue`, or any tool in the deny list above.
