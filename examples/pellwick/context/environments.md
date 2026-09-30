---
title: Environments
updated: 2026-09-14
sources:
  - Interview with Sam Okafor, engineering lead, 2026-09-10
  - Team wiki page "Where things run", checked 2026-09-12
---
## Development
Each developer runs the web app and Stockroom locally with sample data. No real customer data.

## Staging
A shared copy of all three systems with made-up subscribers. Rebuilt every Monday. Payment calls go to the payment provider's test mode. This is where testers check stories before release.

## Production
The live systems.

## Releases
The web app releases on Tuesdays and Thursdays. Stockroom releases once a week, on Wednesdays. Urgent fixes can go out any day with the engineering lead's approval.
