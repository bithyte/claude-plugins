import { homedir } from "node:os";
import { join } from "node:path";
import type { ParseArgsOptionsConfig } from "node:util";
import type { HiddenAttribution, HideOutcome } from "./types.ts";

// `attribution: false` is shorter but older versions reject it and skip the whole settings file.
export const HIDDEN_ATTRIBUTION = {
  commit: "",
  pr: "",
  sessionUrl: false,
} as const satisfies HiddenAttribution;

export const UNCHANGED = { kind: "unchanged" } as const satisfies HideOutcome;

export const SETTINGS_FILE_NAME = "settings.json";

export const PARSE_ARGS_OPTIONS = {
  file: { type: "string" },
} as const satisfies ParseArgsOptionsConfig;

/** Resolves `$CLAUDE_CONFIG_DIR/settings.json`, falling back to `~/.claude/settings.json`. */
export const DEFAULT_SETTINGS_PATH = (environment: NodeJS.ProcessEnv): string =>
  join(environment.CLAUDE_CONFIG_DIR ?? join(homedir(), ".claude"), SETTINGS_FILE_NAME);
