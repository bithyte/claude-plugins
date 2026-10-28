import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { SettingsEditor, SettingsStore } from "../../src/settings/index.ts";

const CLI_PATH = join(import.meta.dirname, "../../src/settings/cli.ts");

const HIDDEN = { commit: "", pr: "", sessionUrl: false };

const createDirectory = async (): Promise<string> =>
  mkdtemp(join(tmpdir(), "tweaks-settings-"));

const runCli = (args: readonly string[], environment: NodeJS.ProcessEnv = process.env) =>
  spawnSync(process.execPath, [CLI_PATH, ...args], { encoding: "utf8", env: environment });

test("hides attribution and keeps other keys", () => {
  const outcome = SettingsEditor.hideAttribution({ model: "opus", theme: "dark" });
  assert.deepEqual(outcome, {
    kind: "changed",
    settings: { model: "opus", theme: "dark", attribution: HIDDEN },
    changedKeys: ["attribution.commit", "attribution.pr", "attribution.sessionUrl"],
  });
});

test("keeps other attribution keys and reports only the keys it changed", () => {
  const outcome = SettingsEditor.hideAttribution({
    attribution: { commit: "", pr: "custom", extra: 1 },
  });
  assert.deepEqual(outcome, {
    kind: "changed",
    settings: { attribution: { commit: "", pr: "", extra: 1, sessionUrl: false } },
    changedKeys: ["attribution.pr", "attribution.sessionUrl"],
  });
});

test("replaces a non-object attribution", () => {
  const outcome = SettingsEditor.hideAttribution({ attribution: false });
  assert.deepEqual(outcome, {
    kind: "changed",
    settings: { attribution: HIDDEN },
    changedKeys: ["attribution.commit", "attribution.pr", "attribution.sessionUrl"],
  });
});

test("reports unchanged when attribution is already hidden", () => {
  assert.deepEqual(SettingsEditor.hideAttribution({ attribution: HIDDEN }), { kind: "unchanged" });
});

test("rejects a settings root that isn't an object", () => {
  for (const raw of [[], null, "text", 1]) {
    assert.deepEqual(SettingsEditor.hideAttribution(raw), {
      kind: "invalid",
      reason: "root is not a json object",
    });
  }
});

test("load reports a missing file", async () => {
  const directory = await createDirectory();
  assert.deepEqual(await SettingsStore.load(join(directory, "settings.json")), {
    kind: "missing",
  });
});

test("load throws on invalid json", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  await writeFile(path, "{ broken");
  await assert.rejects(SettingsStore.load(path), /is not valid json/);
});

test("save replaces the file atomically and leaves no temp files", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  await writeFile(path, "{}\n");
  const before = await stat(path);
  await SettingsStore.save(path, { attribution: HIDDEN });
  const after = await stat(path);
  assert.notEqual(after.ino, before.ino);
  assert.deepEqual(await readdir(directory), ["settings.json"]);
  assert.equal(
    await readFile(path, "utf8"),
    `${JSON.stringify({ attribution: HIDDEN }, null, 2)}\n`,
  );
});

test("cli writes hidden attribution into an existing file", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  await writeFile(path, JSON.stringify({ model: "opus" }));
  const result = runCli(["--file", path]);
  assert.equal(result.status, 0);
  assert.equal(
    result.stdout,
    `set attribution.commit, attribution.pr, attribution.sessionUrl in ${path}\n`,
  );
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), {
    model: "opus",
    attribution: HIDDEN,
  });
});

test("cli does not rewrite a file that is already hidden", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  const original = JSON.stringify({ attribution: HIDDEN });
  await writeFile(path, original);
  const before = await stat(path);
  const result = runCli(["--file", path]);
  assert.equal(result.status, 0);
  assert.equal(result.stdout, `attribution already hidden in ${path}\n`);
  assert.equal((await stat(path)).ino, before.ino);
  assert.equal(await readFile(path, "utf8"), original);
});

test("cli uses CLAUDE_CONFIG_DIR and creates a missing file", async () => {
  const directory = await createDirectory();
  const result = runCli([], { ...process.env, CLAUDE_CONFIG_DIR: join(directory, "config") });
  assert.equal(result.status, 0);
  const path = join(directory, "config", "settings.json");
  assert.deepEqual(JSON.parse(await readFile(path, "utf8")), { attribution: HIDDEN });
});

test("cli fails on invalid json and keeps the file", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  await writeFile(path, "{ broken");
  const result = runCli(["--file", path]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^no-attributions: settings file ".*" is not valid json: /);
  assert.equal(await readFile(path, "utf8"), "{ broken");
});

test("cli fails when the root is not an object", async () => {
  const directory = await createDirectory();
  const path = join(directory, "settings.json");
  await writeFile(path, "[]");
  const result = runCli(["--file", path]);
  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    `no-attributions: settings file ${JSON.stringify(path)} root is not a json object\n`,
  );
});

test("cli rejects unknown options", () => {
  const result = runCli(["--bogus"]);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^no-attributions: /);
});
