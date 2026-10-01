# Live context from a tracker

Use this when tracker tools are available, such as an issue tracker's search and read tools. If none are, skip this file and don't mention a tracker.

## Before writing a story

1. Search the tracker for related and duplicate issues, using the input's key terms: who is affected, what they want, and which system. Read at most 5 issues in full.
2. Use what is relevant as Known lines with a live source: the tracker, the record and when it was read, like "(Jira SUBS-142, read 2026-10-02 14:05)". Use the read time the tool returned for that call. The checker rejects a live source with no read time.
3. If an open issue looks like the same request, say so in the First question: "SUBS-142 looks like the same request. Should this be a new story or an update to it?" Write the story anyway.
4. The input still decides the readiness call. An issue adds facts; it doesn't replace the input.

## Never write to the tracker

Use only tools that read. Never create, change, comment on, close or move an issue, and never ask to. If the user asks you to change an issue, say in one line: "Loupe can't change the tracker yet."

## Customer data stays out

Issues can hold customer data: customers' names, emails, phone numbers and addresses. Never put any of it in a story or a reply, even if it's in an issue you cite. Quote only what the story needs. The checker runs the same detector over the story as over the context files, and it rejects emails and secrets; names, phone numbers and addresses are yours to catch.

## Live facts stay live

Never copy a fact read from the tracker into the context files or learned.md: tracker data changes, so it goes stale there. Read it again for the next story.
