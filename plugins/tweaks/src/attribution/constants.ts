import type { AttributionRule, CheckOutcome } from "./types.ts";

// Allows global options between `git` and `commit`, such as `git -C dir commit`.
export const GIT_COMMIT_PATTERN = /\bgit(?:\s+-\S+(?:\s+[^\s-]\S*)?)*\s+commit\b/;

export const GH_PR_PATTERN = /\bgh\s+pr\s+(?:create|edit)\b/;

// Only Claude co-authors; human `Co-Authored-By` lines pass.
export const CO_AUTHOR_PATTERN = /co-authored-by:[^\n]*(?:\bclaude\b|noreply@anthropic\.com)/i;

export const PR_FOOTER_PATTERN = /generated with \[?claude code\]?/i;

export const ATTRIBUTION_RULES = [
  { pattern: CO_AUTHOR_PATTERN, description: "a Co-Authored-By line naming Claude" },
  { pattern: PR_FOOTER_PATTERN, description: 'the "Generated with Claude Code" footer' },
] as const satisfies readonly AttributionRule[];

// `git commit -F`/`--file` and `gh pr -F`/`--body-file` read the message from a file.
export const MESSAGE_FILE_FLAGS = ["-F", "--file", "--body-file"] as const;

export const STDIN_PATH = "-";

export const WHITESPACE_PATTERN = /\s/;

export const ALLOWED = { kind: "allowed" } as const satisfies CheckOutcome;
