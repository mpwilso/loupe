# Set up Loupe in Claude

This is for the product manager setting Loupe up for a team. It takes about 15 minutes.

Skills only run with code execution turned on. Each teammate must turn on "Code execution and file creation" in Claude's settings, or the skill can't run its checker.

Two things make Loupe work:
- **The project** holds what your team knows: the context files and any team templates. You set it up once and share it. Everyone who opens it sees the same files.
- **The skill** is what writes and checks the stories. Skills on claude.ai belong to one person. Each teammate uploads the skill zip once, to their own account.

An organization owner can instead add the skill for everyone, from the organization settings. It then shows up for every member, who can switch it on or off. See [Using Skills in Claude](https://support.claude.com/en/articles/12512180-using-skills-in-claude).

## 1. Get the skill zip

Ask whoever looks after Loupe for `loupe-skill.zip`. They build it with `scripts/build-skill.sh`. Don't unzip it.

## 2. Upload the skill (every teammate, once)

1. In Claude, open **Customize**, then **Skills**.
2. Click **+**, then **Create skill**, then **Upload a skill**.
3. Choose `loupe-skill.zip`.
4. Check that "loupe" appears in the list and is switched on.

## 3. Create the project (you, once)

1. Open **Projects** in the left sidebar, or go to claude.ai/projects.
2. Click **+ New Project**. Name it after your team, for example "Subscriptions stories".
3. Click **Set project instructions**, paste the text below, and click **Save instructions**.

```
Use the loupe skill for everything in this project.

When I paste notes, a transcript, a ticket or an email, write a story with the loupe skill. If the input doesn't have enough to build from, write a "Not ready yet" response instead.

Use the context files and team templates in this project's knowledge. Every Known line must name its source. Never invent a fact. Only show me a story that passes the loupe checker.

When I say "set up the team", run the loupe skill's team setup and give me the context files it writes.
```

## 4. Add the context files (you, then whenever they change)

1. In the new project, start a chat and type "set up the team". Answer Claude's questions and share any documents, slides or transcripts it asks for.
2. Download the context files Claude gives you. They are short files like `applications.md` and `priorities.md`.
3. In the project, click **+** next to the project knowledge and upload every context file.
4. If your team has its own story template, upload that file too.

When a fact changes, fix the file, delete the old copy from the project knowledge and upload the new one.

## 5. Share the project (Team and Enterprise plans)

1. Open the project and click **Share project**, next to its name.
2. Add your teammates by name or email.
3. Choose **Can view** for people who only write stories, and **Can edit** for people who keep the context files up to date.

Remind each teammate to upload the skill (step 2). Without it, the project has the context files but nothing to write the stories.

## Using it

Open a new chat in the project and paste your input. Claude checks whether there is enough to build from. If there is, you get a story. If not, you get a short list of questions to answer first.

Loupe doesn't learn from your corrections yet. If you correct a story and the fix is something everyone should know, update the context file yourself.
