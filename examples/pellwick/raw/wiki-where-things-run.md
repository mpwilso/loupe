# Where things run

Checked 2026-09-12. Sam Okafor, engineering lead, filled in the gaps on 2026-09-10.

**Dev:** everyone runs the web app and Stockroom on their own machine with sample data. There's no real customer data in dev.

**Staging:** a shared copy of all three systems, filled with made-up subscribers. It gets rebuilt every Monday. Payments go to the payment provider's test mode. Testers check stories here before release.

**Production:** the live systems. Loupe never reads from or writes to production.

**Releases:** the web app goes out Tuesdays and Thursdays. Stockroom goes out once a week, on Wednesdays. Urgent fixes can go any day if the engineering lead approves.
