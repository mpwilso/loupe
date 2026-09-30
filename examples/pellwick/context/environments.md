---
title: Environments
updated: 2026-09-14
sources:
  - Team wiki page "Where things run", checked 2026-09-12, with gaps filled by Sam Okafor, engineering lead, 2026-09-10
---
## Development
- Each developer runs the web app and Stockroom locally with sample data. No real customer data. ("Where things run" wiki page)

## Staging
- A shared copy of all three systems with made-up subscribers. Rebuilt every Monday. ("Where things run" wiki page)
- Payment calls go to the payment provider's test mode. ("Where things run" wiki page)
- This is where testers check stories before release. ("Where things run" wiki page)

## Production
- The live systems. ("Where things run" wiki page)

## Releases
- The web app releases on Tuesdays and Thursdays. Stockroom releases once a week, on Wednesdays. ("Where things run" wiki page)
- Urgent fixes can go out any day with the engineering lead's approval. ("Where things run" wiki page)
