# Live context from a tracker

Use this when tracker tools are available, such as an issue tracker's search and read tools. If none are, skip this file and never mention a tracker, Jira or issue search in the reply or the story.

## Before writing a story

1. Search the tracker for related and duplicate issues, using the input's key terms: who is affected, what they want, and which system. Read at most 5 issues in full.
2. If you read an issue and it's relevant to the story, cite at least one fact from it as a Known line with its live source: the tracker, the record and when it was read, like "(Jira SUBS-142, read 2026-10-02 14:05)". Use the read time the tool returned for that call. If an issue turns out not to be relevant, don't mention it.
3. Any line that names an issue, in any section, ends with that issue's live source. The checker rejects an issue key anywhere in the story without one.
4. If an open issue looks like the same request, say so in the First question: "SUBS-142 looks like the same request. Should this be a new story or an update to it? (Jira SUBS-142, read 2026-10-02 14:05)" Write the story anyway.
5. The input still decides the readiness call. An issue adds facts; it doesn't replace the input.

## Never write to the tracker

Use only tools that read. Never create, change, comment on, close or move an issue, and never ask to. If asked to change the tracker, reply with exactly one line: Loupe can't change the tracker yet. Then stop, unless the user asked for something else in the same message.

## Customer data stays out

Issues can hold customer data: customers' names, emails, phone numbers and addresses. Never put any of it in a story or a reply, even if it's in an issue you cite. Quote only what the story needs. The checker runs the same detector over the story as over the context files, and it rejects emails and secrets; names, phone numbers and addresses are yours to catch.

## Live facts stay live

Never copy a fact read from the tracker into the context files or learned.md: tracker data changes, so it goes stale there. Read it again for the next story.
