---
name: wrap
description: Use when the user is ending a session, usually because the context window is large, and wants a handoff doc a fresh session can start from
disable-model-invocation: true
argument-hint: "[optional focus, e.g. the auth bug]"
---

# Wrap

Write a handoff doc to `docs/sessions/` that lets a fresh agent, with no memory of this session, continue the work. Don't ask the user questions; write from what you know. If arguments were given, treat them as what the doc should focus on: $ARGUMENTS

## 1. Check real state

If the project is a git repo, run:

```bash
git branch --show-current
git status --short
git log --oneline -10
git rev-parse --abbrev-ref @{upstream} && git log --oneline @{upstream}..HEAD
```

Use these results, not your memory, for the State section. If the upstream command fails, the branch has no upstream: say so. Anything you can't confirm (tests, deploys, pushes), mark as unverified.

## 2. Pick the file

`docs/sessions/YYYY-MM-DD-<slug>.md`

- Date from `date +%F`.
- Slug: lowercase kebab-case, names the main topic of this session.
- Whole filename at most 100 characters.
- If the file exists, append `-2`, `-3`, ... before `.md`.
- Create `docs/sessions/` if missing.

## 3. Write the doc

Sections in this order. Drop a section that would be empty. Include `Previous:` only if this session started from a `docs/sessions/` file.

```markdown
# <Title>

YYYY-MM-DD. Branch `<branch>`. Previous: docs/sessions/<file>.md

## Goal
What we're trying to achieve, one or two lines.

## Done
What changed and why: file paths, function names, decisions with their reason.
Constraints and preferences the user stated, in their words.

## State
Commits on the branch, unpushed commits, uncommitted files, last test result.
What's half-finished and exactly where it stops.

## Dead ends
What was tried, what happened, whether it was reverted.

## Next
Ordered, concrete steps. Each one startable without the old session.

## Notes
Suggestions, open questions, risks, anything else the next session needs.
```

Write for an agent reader: dense, specific (paths, commands, error text, numbers), no filler, no recap of things the code or git log already says plainly.

## 4. Finish

Don't stage or commit the doc. End with the final path (including any `-2` suffix) and a line the user can paste into the new session:

````
Wrote docs/sessions/<file>.md

Start the next session with:
```
Read docs/sessions/<file>.md and continue from Next.
```
````
