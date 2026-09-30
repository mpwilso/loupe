---
title: Applications
updated: 2026-09-14
sources:
  - Team wiki page "Our systems", from the architecture slides, August 2026, and Sam Okafor, engineering lead, 2026-09-10
---
- Pellwick sells refillable home cleaning supplies by subscription. About 80,000 active subscribers. Three systems matter to this team. ("Our systems" wiki page)

## Customer web app
- Where subscribers sign up, change what is in their box, update payment details and see past and upcoming orders. ("Our systems" wiki page)
- Built and run by this team. Changes ship through GitHub pull requests. ("Our systems" wiki page)

## Stockroom (internal admin tool)
- Staff use it to look up subscribers, issue refunds, change delivery dates and see warehouse status. ("Our systems" wiki page)
- Support agents and the warehouse team are its main users. ("Our systems" wiki page)
- Any change a customer makes in the web app shows up here within a minute. ("Our systems" wiki page)

## Helpline (support queue)
- Where customer emails and chat messages land as tickets. ("Our systems" wiki page)
- Support agents tag each ticket with a reason, such as "skip request" or "billing". ("Our systems" wiki page)
- Monthly reason counts are the best signal of customer pain. ("Our systems" wiki page)

## How they connect
- The web app and Stockroom share one subscriptions database. ("Our systems" wiki page)
- Helpline links to a subscriber's Stockroom page but does not change data. ("Our systems" wiki page)
