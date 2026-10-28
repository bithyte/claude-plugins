import {
  ALLOWED,
  ATTRIBUTION_RULES,
  GH_PR_PATTERN,
  GIT_COMMIT_PATTERN,
  MESSAGE_FILE_FLAGS,
  STDIN_PATH,
  WHITESPACE_PATTERN,
} from "./constants.ts";
import type { CheckOutcome } from "./types.ts";

/** Finds Claude attribution in `git commit` and `gh pr create`/`edit` commands. */
export class AttributionDetector {
  private constructor() {}

  /** Lists the message files a commit or PR command reads, as written. Never throws. */
  public static findMessageFiles(command: string): readonly string[] {
    if (!AttributionDetector.isWatchedCommand(command)) {
      return [];
    }
    const tokens = AttributionDetector.tokenize(command);
    return tokens
      .flatMap((token, index) => AttributionDetector.toMessageFile(token, tokens[index + 1]))
      .filter((path) => path !== STDIN_PATH);
  }

  /**
   * Blocks a commit or PR command whose text, or the text of a message file it reads, carries
   * Claude attribution. Other commands are always allowed. Never throws.
   */
  public static check(command: string, messageFileTexts: readonly string[]): CheckOutcome {
    if (!AttributionDetector.isWatchedCommand(command)) {
      return ALLOWED;
    }
    const texts = [command, ...messageFileTexts];
    const descriptions = ATTRIBUTION_RULES.filter((rule) =>
      texts.some((text) => rule.pattern.test(text)),
    ).map((rule) => rule.description);
    if (descriptions.length === 0) {
      return ALLOWED;
    }
    return {
      kind: "blocked",
      reason: `the commit or pull request text has ${descriptions.join(" and ")}; remove it and run the command again`,
    };
  }

  private static isWatchedCommand(command: string): boolean {
    return GIT_COMMIT_PATTERN.test(command) || GH_PR_PATTERN.test(command);
  }

  private static toMessageFile(token: string, nextToken: string | undefined): readonly string[] {
    for (const flag of MESSAGE_FILE_FLAGS) {
      if (token === flag) {
        return nextToken === undefined ? [] : [nextToken];
      }
      if (token.startsWith(`${flag}=`)) {
        return [token.slice(flag.length + 1)];
      }
    }
    // Short form glued to its value, such as `-Fmessage.txt`.
    if (token.startsWith("-F") && !token.startsWith("--") && token.length > 2) {
      return [token.slice(2)];
    }
    return [];
  }

  // Splits like a shell would for words and quotes; operators such as `&&` end up as their own
  // tokens or glued to words, which is fine because only flag values are looked up.
  private static tokenize(command: string): readonly string[] {
    const tokens: string[] = [];
    let current = "";
    let hasToken = false;
    let quote: "'" | '"' | undefined = undefined;
    for (let index = 0; index < command.length; index += 1) {
      const character = command.charAt(index);
      if (quote !== undefined) {
        if (character === quote) {
          quote = undefined;
        } else if (character === "\\" && quote === '"' && index + 1 < command.length) {
          index += 1;
          current += command.charAt(index);
        } else {
          current += character;
        }
        continue;
      }
      if (character === "'" || character === '"') {
        quote = character;
        hasToken = true;
        continue;
      }
      if (character === "\\" && index + 1 < command.length) {
        index += 1;
        current += command.charAt(index);
        hasToken = true;
        continue;
      }
      if (WHITESPACE_PATTERN.test(character)) {
        if (hasToken) {
          tokens.push(current);
        }
        current = "";
        hasToken = false;
        continue;
      }
      current += character;
      hasToken = true;
    }
    if (hasToken) {
      tokens.push(current);
    }
    return tokens;
  }
}
