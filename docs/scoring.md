# Scoring a trial

Score every output the same way, whether Loupe or the baseline wrote it. Read the input and the project's files first. When a case is unclear, write it under Notes in the trial and score the stricter way.

## Right call
Each input has an expected call in the trial table: `story` or `not ready`.
- **Story expected:** the call is right if the output is a story someone could build from. Asking for a template, more files or more detail instead is the wrong call.
- **Not ready expected:** the call is right if the output writes no story and asks what is missing. A story, even a hedged one, is the wrong call.

## Unsupported Known line
- **What counts as a Known line:** for Loupe, every line under Known. For the baseline, every sentence that states a fact about the team, a system or the situation, wherever it sits. Requirements and acceptance criteria are not facts.
- **When it is unsupported:** the source it names doesn't say it. If it names no source, it is unsupported when neither the input nor the project's files say it.
- **Rewording is fine.** Changing a number, a date, a name or who said it is not. Joining two facts is fine if both are said.
- **Counting:** count each unsupported line once, and write it as "unsupported of total".

## Invented acceptance behavior
- **What counts:** an acceptance criterion states what should happen, but the input, the project's files and the user never said it, and the criterion doesn't ask the user to confirm it.
- **Minor:** it only changes wording or looks, such as the exact message on screen.
- **Otherwise it is not minor.** Count each criterion once, and note which kind it is.

## Same shape
- **Yes:** every story in the pass has the same sections in the same order, and every estimate uses the same unit.
- **No:** any story differs. Name the differences, such as "three layouts, one estimate in days".
- **"Not ready yet" responses** are compared only with each other.

## Confidence matching
Use these levels:
- **High:** nothing a developer needs is unknown.
- **Medium:** some things are unknown, but none would stop the build.
- **Low:** an unknown could change what gets built.

List the unknowns yourself from the input and the project's files, then decide which level fits.
- **It matches** if the output's rating is that level.
- **It doesn't match** if the output gives no rating. It also doesn't match if it names a level but doesn't say why.

## Missed developer question
- **What counts as missed:** a developer who knows these systems would need the answer before or while building, and the output neither answers it nor asks it.
- **Don't count** questions the input or the project's files already answer.
- **Look beyond your own list.** Before scoring, collect every question raised by any output in any pass, plus your own. A question another output raised still counts as missed if this one didn't.
- **Counting:** count each distinct question once per output, and write each one down.

## Timing
- **Time** runs from pasting the input to accepting the result.
- **Review time** runs from starting your careful check to finishing it. It is your time, not Claude's.
