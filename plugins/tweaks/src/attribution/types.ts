/** Result of checking a Bash command; `blocked` carries the reason shown to Claude. */
export type CheckOutcome =
  | { readonly kind: "allowed" }
  | { readonly kind: "blocked"; readonly reason: string };

/** The PreToolUse hook input fields this hook reads; extra fields are kept. */
export type HookInput = {
  readonly cwd: string;
  readonly tool_input: { readonly command: string };
};

/** Claude attribution text the hook looks for, with how to describe it to Claude. */
export type AttributionRule = {
  readonly pattern: RegExp;
  readonly description: string;
};
