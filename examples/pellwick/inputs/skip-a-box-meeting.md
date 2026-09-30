# Meeting transcript: skipping a box
Date: 2026-09-22. Present: Priya Raman (product manager), Sam Okafor (engineering lead), Dana Ruiz (support lead), Theo Park (warehouse operations).

Priya: Thanks for coming. Dana, you asked for this one.

Dana: Right. Skip requests are our biggest ticket reason. 610 in August, out of 4,100 tickets. Customers go on holiday, or they still have plenty of refills, and they want to skip the next box. The only way today is to email us or open a chat.

Priya: And an agent does it in Stockroom?

Dana: Yes. They open the subscriber, change the next delivery date to the one after, and add a note. About three minutes each. Customers get annoyed waiting, especially on weekends when we reply slower.

Sam: Could customers just cancel and come back?

Dana: Some do. That's worse. We lose them about half the time.

Priya: So the goal is subscribers skip the next box themselves, in the web app, without contacting us.

Theo: One hard rule from my side. Once we're inside 72 hours of the ship date, the box is picked and packed. A skip after that can't happen. Today agents know that and tell the customer no.

Sam: The cutoff is already stored per box. The web app shows it on the "change my box" page. So we'd reuse that.

Priya: Only the next box, or any upcoming box?

Dana: Next box covers nearly every ticket I've read. People aren't planning three months out.

Priya: Let's do next box only for now. Sam, what about Stockroom?

Sam: Stockroom reads the same subscription data, so a skip would show up as a changed date. But agents need to see the customer did it, or they'll think someone on the team made a mistake.

Dana: Yes. A note like "Skipped by customer" in the history would do.

Priya: Can they undo a skip?

Dana: Good question. I'd say yes, until the cutoff.

Sam: That's more work. And what happens to billing? We charge on the ship date, so a skipped box shouldn't be charged. I think that falls out naturally, but I'd want to check the billing job.

Priya: Let's keep this before the December freeze. Sam, rough size?

Sam: If billing behaves, a couple of days. Undo adds a bit.

Priya: I'll write it up.
