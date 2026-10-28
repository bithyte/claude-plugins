import { HIDDEN_ATTRIBUTION, UNCHANGED } from "./constants.ts";
import type { HideOutcome, SettingsObject } from "./types.ts";

/** Pure edits to parsed settings. */
export class SettingsEditor {
  private constructor() {}

  /**
   * Sets `attribution.commit` and `attribution.pr` to `""` and `attribution.sessionUrl` to
   * `false`, keeping every other key. Never throws.
   */
  public static hideAttribution(raw: unknown): HideOutcome {
    if (!SettingsEditor.isSettingsObject(raw)) {
      return { kind: "invalid", reason: "root is not a json object" };
    }
    const current = raw["attribution"];
    const attribution = SettingsEditor.isSettingsObject(current) ? current : {};
    const changedKeys = Object.entries(HIDDEN_ATTRIBUTION)
      .filter(([key, value]) => attribution[key] !== value)
      .map(([key]) => `attribution.${key}`);
    if (changedKeys.length === 0) {
      return UNCHANGED;
    }
    return {
      kind: "changed",
      settings: { ...raw, attribution: { ...attribution, ...HIDDEN_ATTRIBUTION } },
      changedKeys,
    };
  }

  private static isSettingsObject(value: unknown): value is SettingsObject {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }
}
