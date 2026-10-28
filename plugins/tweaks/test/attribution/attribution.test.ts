import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AttributionDetector } from "../../src/attribution/index.ts";

const CLI_PATH = join(import.meta.dirname, "../../src/attribution/cli.ts");

const CLAUDE_TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";

const PR_FOOTER = "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

const TRAILER_REASON =
  "the commit or pull request text has a Co-Authored-By line naming Claude; remove it and run the command again";

const runHook = (input: string) =>
  spawnSync(process.execPath, [CLI_PATH], { encoding: "utf8", input });

const toHookInput = (command: string, cwd: string = process.cwd()): string =>
  JSON.stringify({
    hook_event_name: "PreToolUse",
    tool_name: "Bash",
    cwd,
    tool_input: { command },
  });

test("blocks a commit with a Claude co-author trailer in a heredoc", () => {
  const command = `git commit -m "$(cat <<'EOF'\nfeat: thing\n\n${CLAUDE_TRAILER}\nEOF\n)"`;
  assert.deepEqual(AttributionDetector.check(command, []), {
    kind: "blocked",
    reason: TRAILER_REASON,
  });
});

test("blocks a pr with the claude code footer", () => {
  const command = `gh pr create --title "x" --body "Fixes it.\n\n${PR_FOOTER}"`;
  assert.deepEqual(AttributionDetector.check(command, []), {
    kind: "blocked",
    reason:
      'the commit or pull request text has the "Generated with Claude Code" footer; remove it and run the command again',
  });
});

test("names both findings when both are present", () => {
  const outcome = AttributionDetector.check(
    `gh pr edit 3 --body "${PR_FOOTER}\n${CLAUDE_TRAILER}"`,
    [],
  );
  assert.deepEqual(outcome, {
    kind: "blocked",
    reason:
      'the commit or pull request text has a Co-Authored-By line naming Claude and the "Generated with Claude Code" footer; remove it and run the command again',
  });
});

test("matches a trailer by the anthropic noreply address or the claude name alone", () => {
  for (const trailer of ["co-authored-by: Bot <noreply@anthropic.com>", "Co-Authored-By: Claude"]) {
    assert.equal(AttributionDetector.check(`git commit -m "x\n\n${trailer}"`, []).kind, "blocked");
  }
});

test("blocks attribution found in a message file", () => {
  assert.deepEqual(AttributionDetector.check("git commit -F msg.txt", [`x\n\n${CLAUDE_TRAILER}`]), {
    kind: "blocked",
    reason: TRAILER_REASON,
  });
});

test("blocks commits with git global options before commit", () => {
  assert.equal(
    AttributionDetector.check(`git -C repo commit -m "x\n\n${CLAUDE_TRAILER}"`, []).kind,
    "blocked",
  );
});

test("allows human co-author trailers", () => {
  for (const trailer of [
    "Co-Authored-By: Jane Doe <jane@example.com>",
    "Co-Authored-By: Claudette <claudette@example.com>",
  ]) {
    assert.deepEqual(AttributionDetector.check(`git commit -m "x\n\n${trailer}"`, []), {
      kind: "allowed",
    });
  }
});

test("allows commands that are not commits or pr edits", () => {
  for (const command of [
    `echo "${CLAUDE_TRAILER}"`,
    `git log --grep "${CLAUDE_TRAILER}"`,
    `gh pr view 3`,
  ]) {
    assert.deepEqual(AttributionDetector.check(command, [`x\n${CLAUDE_TRAILER}`]), {
      kind: "allowed",
    });
  }
});

test("finds message files in every flag form", () => {
  assert.deepEqual(
    AttributionDetector.findMessageFiles(
      `git commit -F a.txt --file b.txt --file="c d.txt" -Fe.txt && gh pr create --body-file f.md --body-file=g.md`,
    ),
    ["a.txt", "b.txt", "c d.txt", "e.txt", "f.md", "g.md"],
  );
});

test("skips stdin message files", () => {
  assert.deepEqual(AttributionDetector.findMessageFiles("git commit -F - <<EOF\nx\nEOF"), []);
});

test("finds no message files outside commits and pr edits", () => {
  assert.deepEqual(AttributionDetector.findMessageFiles("grep -F pattern file"), []);
});

test("allows an empty command", () => {
  assert.deepEqual(AttributionDetector.check("", []), { kind: "allowed" });
  assert.deepEqual(AttributionDetector.findMessageFiles(""), []);
});

test("hook prints a deny decision for a commit with a claude trailer", () => {
  const result = runHook(toHookInput(`git commit -m "x\n\n${CLAUDE_TRAILER}"`));
  assert.equal(result.status, 0);
  assert.deepEqual(JSON.parse(result.stdout), {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: TRAILER_REASON,
    },
  });
});

test("hook reads a relative message file from the input cwd", async () => {
  const directory = await mkdtemp(join(tmpdir(), "tweaks-hook-"));
  await writeFile(join(directory, "msg.txt"), `feat: x\n\n${CLAUDE_TRAILER}\n`);
  const result = runHook(toHookInput("git commit -F msg.txt", directory));
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).hookSpecificOutput.permissionDecision, "deny");
});

test("hook allows a commit whose message file can't be read", () => {
  const result = runHook(toHookInput("git commit -F /nonexistent/msg.txt"));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("hook allows a clean commit silently", () => {
  const result = runHook(toHookInput(`git commit -m "fix: thing"`));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("hook ignores input that isn't a bash tool call", () => {
  const result = runHook(JSON.stringify({ cwd: "/", tool_input: { file_path: "x" } }));
  assert.equal(result.status, 0);
  assert.equal(result.stdout, "");
});

test("hook exits 1 without a decision on invalid json", () => {
  const result = runHook("not json");
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /^tweaks attribution hook: /);
});
