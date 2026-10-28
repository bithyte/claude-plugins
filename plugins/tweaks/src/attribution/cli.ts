import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { text } from "node:stream/consumers";
import { AttributionDetector } from "./detector.ts";
import type { HookInput } from "./types.ts";

/** Usage: node src/attribution/cli.ts < hook-input.json (PreToolUse hook for Bash) */
class AttributionCli {
  private constructor() {}

  // Errors exit 1, which Claude Code treats as non-blocking, so a hook bug never blocks Bash.
  public static async run(): Promise<number> {
    try {
      const input: unknown = JSON.parse(await text(process.stdin));
      if (!AttributionCli.isHookInput(input)) {
        return 0;
      }
      const command = input.tool_input.command;
      const paths = AttributionDetector.findMessageFiles(command);
      const messageFileTexts = await AttributionCli.readMessageFiles(input.cwd, paths);
      const outcome = AttributionDetector.check(command, messageFileTexts);
      switch (outcome.kind) {
        case "allowed":
          return 0;
        case "blocked":
          process.stdout.write(`${JSON.stringify(AttributionCli.toDenyOutput(outcome.reason))}\n`);
          return 0;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`tweaks attribution hook: ${message}\n`);
      return 1;
    }
  }

  private static async readMessageFiles(
    cwd: string,
    paths: readonly string[],
  ): Promise<readonly string[]> {
    const texts = await Promise.all(
      paths.map((path) =>
        // An unreadable file, such as a relative path after a `cd`, is skipped: fail open.
        readFile(resolve(cwd, path), "utf8").catch(() => undefined),
      ),
    );
    return texts.filter((fileText) => fileText !== undefined);
  }

  private static toDenyOutput(reason: string): object {
    return {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: reason,
      },
    };
  }

  private static isHookInput(value: unknown): value is HookInput {
    if (typeof value !== "object" || value === null) {
      return false;
    }
    if (!("cwd" in value) || typeof value.cwd !== "string") {
      return false;
    }
    if (!("tool_input" in value) || typeof value.tool_input !== "object") {
      return false;
    }
    const toolInput = value.tool_input;
    return toolInput !== null && "command" in toolInput && typeof toolInput.command === "string";
  }
}

process.exitCode = await AttributionCli.run();
