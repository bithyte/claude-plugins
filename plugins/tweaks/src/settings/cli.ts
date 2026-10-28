import { parseArgs } from "node:util";
import { DEFAULT_SETTINGS_PATH, PARSE_ARGS_OPTIONS } from "./constants.ts";
import { SettingsEditor } from "./editor.ts";
import { SettingsStore } from "./store.ts";

/** Usage: node src/settings/cli.ts [--file <settings.json>] */
class SettingsCli {
  private constructor() {}

  public static async run(args: readonly string[]): Promise<number> {
    try {
      const { values } = parseArgs({ args: [...args], options: PARSE_ARGS_OPTIONS, strict: true });
      const path = values.file ?? DEFAULT_SETTINGS_PATH(process.env);
      const loaded = await SettingsStore.load(path);
      const outcome = SettingsEditor.hideAttribution(loaded.kind === "missing" ? {} : loaded.value);
      switch (outcome.kind) {
        case "invalid":
          throw new Error(`settings file ${JSON.stringify(path)} ${outcome.reason}`);
        case "unchanged":
          process.stdout.write(`attribution already hidden in ${path}\n`);
          return 0;
        case "changed":
          await SettingsStore.save(path, outcome.settings);
          process.stdout.write(`set ${outcome.changedKeys.join(", ")} in ${path}\n`);
          return 0;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`no-attributions: ${message}\n`);
      return 1;
    }
  }
}

process.exitCode = await SettingsCli.run(process.argv.slice(2));
