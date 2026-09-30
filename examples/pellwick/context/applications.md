---
title: Applications
updated: 2026-09-14
sources:
  - Architecture overview slides, August 2026
  - Interview with Sam Okafor, engineering lead, 2026-09-10
---
Pellwick sells refillable home cleaning supplies by subscription. About 80,000 active subscribers. Three systems matter to this team.

## Customer web app
Where subscribers sign up, change what is in their box, update payment details and see past and upcoming orders. Built and run by this team. Changes ship through GitHub pull requests.

## Stockroom (internal admin tool)
Staff use it to look up subscribers, issue refunds, change delivery dates and see warehouse status. Support agents and the warehouse team are its main users. Any change a customer makes in the web app shows up here within a minute.

## Helpline (support queue)
Where customer emails and chat messages land as tickets. Support agents tag each ticket with a reason, such as "skip request" or "billing". Monthly reason counts are the best signal of customer pain.

## How they connect
The web app and Stockroom share one subscriptions database. Helpline links to a subscriber's Stockroom page but does not change data.
