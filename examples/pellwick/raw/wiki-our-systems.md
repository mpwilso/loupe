# Our systems

From the architecture overview slides (August 2026) and a chat with Sam Okafor, engineering lead, on 2026-09-10.

Pellwick sells refillable home cleaning supplies by subscription, to about 80,000 active subscribers. Our team cares about three systems.

**Customer web app.** This is ours: we build it and run it. Subscribers use it to sign up, change what's in their box, update their payment details, and see past and upcoming orders. Changes ship through GitHub pull requests.

**Stockroom.** The internal admin tool. Staff look up subscribers, issue refunds, change delivery dates and check warehouse status there. Mostly used by support agents and the warehouse team. When a customer changes something in the web app, it shows up in Stockroom within a minute.

**Helpline.** Our support queue. Customer emails and chats come in as tickets, and agents tag each one with a reason, like "skip request" or "billing". The monthly counts per reason are the best signal we have of where customers are hurting.

How it fits together: the web app and Stockroom share one subscriptions database. Helpline links to a subscriber's page in Stockroom but never changes any data.
