# claude-plugins

Claude Code plugin marketplace for bithyte.

```
/plugin marketplace add bithyte/claude-plugins
/plugin install jaypost@bithyte
/plugin install session@bithyte
/plugin install tweaks@bithyte
```

## Plugins

| Plugin                                        | What it does                                                                                                                                              |
| --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [jaypost](https://github.com/bithyte/jaypost) | Sends permission prompts and questions to Telegram or Discord                                                                                             |
| [session](plugins/session)                    | `/session:wrap` writes a handoff doc to `docs/sessions/` for a fresh session                                                                              |
| [tweaks](plugins/tweaks)                      | `/tweaks:no-attributions` hides commit and PR attribution in `~/.claude/settings.json`; a hook blocks commits and PRs with a Claude `Co-Authored-By` line |
