---
title: Looks
updated: 2026-09-29
sources:
  - Sam Okafor, engineering lead, setup interview, 2026-09-29
---
Each look below reads a lower environment and never changes it.

- A subscriber's next box on staging, with its ship date and status.
  environment: production
  run: curl -s http://localhost:8765/subscribers/{subscriber}/next-box
  source: Sam Okafor, setup interview, 2026-09-29
- The count of orders on the test database, by status.
  environment: test database
  run: psql postgresql://localhost/pellwick_test -c "SELECT status, count(*) FROM orders GROUP BY status"
  source: Sam Okafor, setup interview, 2026-09-29
