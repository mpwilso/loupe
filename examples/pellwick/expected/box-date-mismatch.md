Call: Story written
Confidence: Medium, the source of the date is settled, but how the email will reach Stockroom is not.
First question: Does the email service have a way to ask Stockroom at send time, or does it only read the web app's copy?

# Show the same next box date on the account page and in the email

## The story
As a subscriber, I want my account page and my email to show the same date for my next box, so that I know when it ships.

## Background
Two subscribers this week saw one date on their account page and another in their email. (Dana, Slack thread 2026-10-02)
The email reads the web app's own copy of the schedule, and the account page asks Stockroom. (Sam, Slack thread 2026-10-02)
The web app's copy can be behind Stockroom until the nightly sync. (Sam, Slack thread 2026-10-02)

## Example
One subscriber's page says the 9th and their email says the 12th. (Dana, Slack thread 2026-10-02)

## Requirements
1. The "on its way soon" email shows the next box's ship date from Stockroom.
2. The account page and the email show the same date for the same box.
3. To confirm: what the email shows when Stockroom cannot be reached at send time.

## Not included
- Changing when the email is sent. Priya kept that for a separate conversation. (Priya, Slack thread 2026-10-02)

## Notes
- Stockroom decides the date, and the web app shows what Stockroom says. (Sam Okafor, answer on skip-a-box, 2026-09-30, via the Learned context file)

## Test scenarios
TEST SCENARIO: The email and the page agree
HAPPY PATH: Box moved in Stockroom
WHEN Stockroom moves my next box to a new date
AND the "on its way soon" email is sent before the nightly sync
THEN the email shows the new date
AND my account page shows the same date
UNHAPPY PATH: Stockroom not reachable
WHEN the email is about to be sent
AND Stockroom cannot be reached
THEN the email does not show a date from the web app's copy. To confirm: what it shows instead.

## Known
- On staging, subscriber 1042's next box, B-7731, ships on 2026-10-09 with the status "scheduled" and was not skipped. (staging, looked 2026-10-02 14:05)
- Stockroom is the system that ships the box, so its date is the right one. (Sam, Slack thread 2026-10-02)
- The web app's copy of the schedule is refreshed by a nightly sync. (Sam, Slack thread 2026-10-02)

## Unknown
- Which dates subscriber 1042's page and email showed on staging. The look reads Stockroom's date, not the email's.
- How many subscribers got an email with the wrong date.

## Assumed
- The email service can ask Stockroom at send time, as the web app does.

## Confidence
Medium
Why: Which date is right is settled, and the look on staging shows the Stockroom date, but the email's path to Stockroom is not known.
How to raise it: Sam confirms how the email service can read the date from Stockroom.

## Estimate
8 to 16 hours
Basis: No one has sized it. Two past stories that read a date from Stockroom took 7 and 11 hours, and this one also changes the email. Stockroom 50% not included, since Stockroom is assumed unchanged.
Calibration: "Show the next delivery date on the orders page" took 11 hours against 4 to 8 estimated. "Send a reminder email two days before the cutoff" took 7 hours against 6 to 10 estimated.

## Questions before building
- Does the email service have a way to ask Stockroom at send time, or does it only read the web app's copy?
- What should the email show when Stockroom cannot be reached at send time?
- Should subscribers who already got an email with the wrong date get a corrected one?
- Support must be told about any change they will see. Who tells agents the email now shows Stockroom's date? (Conventions context file)

Before release: Tell support the email and the page now show the same date, from Stockroom.
