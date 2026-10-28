import { mkdir, open, readFile, rename, rm } from "node:fs/promises";
import { dirname } from "node:path";
import type { LoadOutcome, SettingsObject } from "./types.ts";

/** Reads and atomically writes settings files. */
export class SettingsStore {
  private constructor() {}

  /** Parses the file; throws when it exists but can't be read or isn't valid JSON. */
  public static async load(path: string): Promise<LoadOutcome> {
    let text: string;
    try {
      text = await readFile(path, "utf8");
    } catch (error) {
      if (SettingsStore.isMissingFileError(error)) {
        return { kind: "missing" };
      }
      throw error;
    }
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`settings file ${JSON.stringify(path)} is not valid json: ${message}`);
    }
    return { kind: "loaded", value };
  }

  /** Writes through a synced temp file and a rename, so readers never see a partial file. */
  public static async save(path: string, settings: SettingsObject): Promise<void> {
    await mkdir(dirname(path), { recursive: true });
    const temporaryPath = `${path}.${process.pid}.tmp`;
    try {
      const handle = await open(temporaryPath, "w");
      try {
        await handle.writeFile(`${JSON.stringify(settings, null, 2)}\n`, "utf8");
        await handle.sync();
      } finally {
        await handle.close();
      }
      await rename(temporaryPath, path);
    } catch (error) {
      // Best-effort cleanup; the write error is the one worth reporting.
      await rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }

  private static isMissingFileError(error: unknown): boolean {
    return error instanceof Error && "code" in error && error.code === "ENOENT";
  }
}
