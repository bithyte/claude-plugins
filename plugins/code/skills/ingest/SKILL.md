---
name: ingest
description: Use when the user says /ingest, "I changed X by hand", "review my changes", "finish this", or the working tree or recent commits hold edits the agent did not make in this session.
---

# Ingest manual changes

Hand edits must meet the same bar as agent edits: the repo's own rules, plus the work around them (tests, edge
cases, wiring, docs). Treat each hand edit as a *sketch*: find its direction, then do the remaining 20% the author
skipped (bug fixes, tests, cleanup) without changing that direction.

## 1. Gather

```bash
git status --short
git diff HEAD --stat && git diff HEAD               # staged + unstaged
git ls-files --others --exclude-standard            # untracked: read each one
git log -10 --stat --format='%h %ad %s' --date=short
```

- **Recent commits:** any of the last 10 that deletes many lines from `CHANGELOG.md`, `README.md`, `CLAUDE.md`,
  `AGENTS.md` or another doc is a finding. Review a commit the user names, or one that looks hand-made, like a
  working-tree change (`git show <sha>`).
- **Your own edits** from earlier in this session are not the user's: list them separately, never ask their intent.
- Nothing changed and no finding in recent commits: say so and stop.

## 2. Learn the bar

Before judging, read what defines the repo's bar:

- `CLAUDE.md` / `AGENTS.md` at the root and nearest each changed file, `CONTRIBUTING.md`, the README of the touched
  area.
- Lint, format and test setup (`package.json` scripts, `Makefile`, `pyproject.toml`, `Cargo.toml`, CI workflows).
  Note the exact lint and test commands; step 5 runs them.
- A neighbouring test file, to learn the test style and helpers.

Then read the sketch's intent from commit messages, branch name, linked issue, and the names in the code.

## 3. Review

Check every point against every changed file; report only real hits.

**Rules**
- Every rule the repo docs from step 2 state.

**Docs**
- README and docs describe the new behaviour; old text edited rather than contradicted; no section removed.
- `CHANGELOG.md`, if the repo keeps one, has an entry in its format and lost no old lines.
- `CLAUDE.md` / `AGENTS.md` still true.

**Security**
- No secrets in new lines or untracked files (passwords, tokens, keys, hashes). Not committed yet: dropping the line
  keeps it out of history. Never echo the value (report, questions, grep patterns): name the variable instead.
- Network binds are loopback or a named interface, unless the code says why it listens on `0.0.0.0`.
- Dependencies and images pinned as precisely as the repo already pins them; no `latest`, no `curl | sh`.
- External input validated; queries and shell commands built with parameters, not string concatenation.

**Conventions**
- Names, layout and style match the repo's rules and the neighbouring code.
- Scripts: shebang, strict mode (`set -euo pipefail`), executable bit, header comment, `shellcheck` clean.
- Stray files stay uncommitted: `*.orig`, `*.bak`, `*~`, swap files, copies, local env files.

**Ripple**
- Removed or renamed symbol, file, config key, route, flag or env var: `git grep -n <old name>` and list stale
  mentions.
- Changed signature, type or schema: every caller and implementation updated.

**Unfinished** (the sketch's missing 20%)
- Markers: `TODO`/`FIXME`/`XXX`/`HACK`, stubs, "not implemented", placeholder returns, swallowed errors, debug prints,
  commented-out code, skipped or focused (`.only`) tests.
- Untested: new or changed behaviour with no test, or tests covering only the happy path.
- Edges: empty or missing input, error paths, bounds, encoding, concurrency and retries where they apply.
- Half-wired: added but never called, parsed but never used, a setting nothing reads, a feature reachable from one
  entry point but not its siblings.
- Bugs by reading: wrong condition, off-by-one, leaked resource, unawaited promise, mutated shared state.
- User-visible change with no doc or CHANGELOG update.

## 4. Report and ask

Report in this shape, nothing else:

```
/ingest: <N> modified, <M> untracked[; commits <sha>: <problem>][; my edits this session: <paths>]
Intent: <what the sketch is building, or "unclear: <why>">
<path>: <what changed>
- <problem> -> <proposed fix>
Finish:
- <missing piece> -> <what I'll do>
Checks: <lint and test commands step 5 will run>
```

Then one `AskUserQuestion` batch (max 4, recommended option first):
- One question per change whose fix depends on intent ("intended or accident?", "which version?", "should this
  also cover X?"). When the sketch's direction is ambiguous, ask: finishing the wrong feature costs more than
  leaving it unfinished.
- One multi-select "Also do" for work that doesn't depend on intent (drop a secret line, delete a stray file,
  restore wiped lines, write missing tests, fix a bug found by reading), all recommended.
- Work beyond what the sketch points to (a redesign, a new capability) goes in as its own option, never inside
  "Also do".

Doc and CHANGELOG wording comes from the code and the answers; when a reason for a change is unknown, ask for it.

## 5. Finish

1. Do the approved work. Build on the user's edits and keep their approach; rewrite only what they approved. New
   tests follow the repo's framework and style; each bug fix gets a test that fails without it.
2. Re-check: `git diff HEAD`, the repo's lint and format check and its tests scoped to the changed files (the full
   suite when the runner can't scope), `shellcheck` on changed scripts, `git grep` that a dropped secret is gone.
   Fix failures this work caused; report failures already present on `HEAD` with their output and leave them.
3. Show the commit message(s) and file lists; commit only after an explicit OK. Stage named paths
   (`git add <paths>`), never `git add -A` or `.`. One commit per logical change, in the repo's style
   (`git log --oneline`).
