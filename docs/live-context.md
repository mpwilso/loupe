# Live context from a tracker

In Claude Code, Loupe can read your team's tracker before it writes a story: it looks for related and duplicate issues, cites what it uses with the issue and the time it read it, and flags an open issue that looks like the same request. It never writes to the tracker. Creating issues is not part of Loupe yet.

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
