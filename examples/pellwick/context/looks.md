---
title: Looks
updated: 2026-09-30
sources:
  - Sam Okafor, engineering lead, setup interview, 2026-09-30
---
Each look below reads the staging copy of a system and never changes it. Loupe runs a look only as it is written here, shows it first, and cites what it saw with the time.

- A subscriber's next box on staging: its ship date, its status and whether it was skipped.
  environment: staging
  run: curl -s http://localhost:8765/subscribers/{subscriber}/next-box
  source: Sam Okafor, setup interview, 2026-09-30
- A subscriber's recent boxes on staging, newest first, with the date each shipped.
  environment: staging
  run: curl -s http://localhost:8765/subscribers/{subscriber}/boxes
  source: Sam Okafor, setup interview, 2026-09-30
