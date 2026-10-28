---
name: no-attributions
description: Use when the user wants Claude Code to stop adding Co-Authored-By trailers, PR footers, and session links to commits and pull requests
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/src/settings/cli.ts)
---

# No attributions

Run:

```bash
node ${CLAUDE_PLUGIN_ROOT}/src/settings/cli.ts
```

It sets `attribution.commit` and `attribution.pr` to `""` and `attribution.sessionUrl` to `false` in `~/.claude/settings.json` (or `$CLAUDE_CONFIG_DIR/settings.json`), keeping every other key.

Report its output to the user in one line. If it fails, show the error and don't edit the file by hand.
