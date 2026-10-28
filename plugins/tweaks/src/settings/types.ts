/** A JSON object as parsed from a settings file. */
export type SettingsObject = { readonly [key: string]: unknown };

/** Result of hiding attribution; `invalid` means the settings root isn't a JSON object. */
export type HideOutcome =
  | {
      readonly kind: "changed";
      readonly settings: SettingsObject;
      readonly changedKeys: readonly string[];
    }
  | { readonly kind: "unchanged" }
  | { readonly kind: "invalid"; readonly reason: string };

/** Result of reading a settings file; a missing file is a normal state. */
export type LoadOutcome =
  | { readonly kind: "missing" }
  | { readonly kind: "loaded"; readonly value: unknown };

/** The attribution values that hide all attribution on every Claude Code version. */
export type HiddenAttribution = {
  readonly commit: "";
  readonly pr: "";
  readonly sessionUrl: false;
};
