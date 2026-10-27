import { test } from "node:test";
import assert from "node:assert/strict";
import { lessons } from "../src/curriculum/index.js";
import { projects } from "../src/curriculum/projects.js";
import {
  initialProgress,
  canComplete,
  markComplete,
  normalizeProgress,
  exportBackup,
  parseBackup,
  migrateLegacy,
  scheduleReview,
  activitySummary,
} from "../src/core/progress.js";
import {
  codeFingerprint,
  allPassed,
  assessPython,
  assessJavaScript,
  assessSql,
} from "../src/core/assessment.js";
import { loadPyodide } from "pyodide";
import initSqlJs from "sql.js";
import { SyncCoordinator } from "../src/core/sync.js";
test("completion requires both current code evidence and correct knowledge", () => {
  const l = lessons[0],
    p = initialProgress();
  assert.equal(markComplete(p, l), false);
  p.drafts[l.id] = l.challenge.solution;
  p.evidence[l.id] = {
    hash: codeFingerprint(p.drafts[l.id]),
    caseCount: l.challenge.tests.length,
    passedAt: 1,
  };
  assert.equal(canComplete(p, l), false);
  p.quiz[l.id] = l.quiz.answer;
  assert.equal(markComplete(p, l, 100), true);
  p.drafts[l.id] = 'print("wrong")';
  assert.equal(canComplete(p, l), false);
});
test("backups preserve evidence, notes, review dates and drafts; reject arbitrary files", () => {
  const p = initialProgress();
  p.notes[lessons[0].id] = "<script>literal note</script>";
  p.drafts[lessons[0].id] = "print(1)";
  p.reviews[lessons[0].id] = { level: 2, due: 12345 };
  assert.deepEqual(parseBackup(JSON.stringify(exportBackup(p))), p);
  assert.throws(() => parseBackup("{}"));
  assert.throws(() => parseBackup("bad json"));
});
test("legacy migration keeps notes without granting new assessment credit", () => {
  const p = migrateLegacy({
    completed: [0],
    notes: { 0: "My note" },
    drafts: { 0: "print(1)" },
  });
  assert.equal(p.notes["foundation-1"], "My note");
  assert.equal(Object.keys(p.completed).length, 0);
  assert.deepEqual(p.legacyCompleted, ["foundation-1"]);
});
test("review and focus statistics use real events", () => {
  const p = initialProgress(),
    id = lessons[0].id;
  p.completed[id] = 100;
  scheduleReview(p, id, "again", 1000);
  assert.equal(p.reviews[id].due, 601000);
  assert.equal(activitySummary(p, 1001).focusMinutes, 0);
});
test("unknown imported IDs cannot inflate completion", () => {
  const p = normalizeProgress({
    completed: { fake: 123 },
    bookmarks: ["fake"],
  });
  assert.equal(Object.keys(p.completed).length, 0);
  assert.equal(p.bookmarks.length, 0);
});
test("all authored Python and JavaScript solutions pass and empty submissions fail", async () => {
  let output = "";
  const runtime = await loadPyodide({ stdout: (t) => (output += t + "\n") });
  for (const item of [...lessons, ...projects]) {
    const c = item.challenge;
    if (!["python", "javascript"].includes(c.language)) continue;
    output = "";
    const good =
      c.language === "python"
        ? await assessPython(runtime, c.solution, c.tests, () => output)
        : await assessJavaScript(c.solution, c.tests);
    assert.equal(
      allPassed(good, c.tests.length),
      true,
      item.title + ": " + JSON.stringify(good),
    );
    output = "";
    const bad =
      c.language === "python"
        ? await assessPython(runtime, "", c.tests, () => output)
        : await assessJavaScript("", c.tests);
    assert.equal(
      allPassed(bad, c.tests.length),
      false,
      item.title + " accepted empty code",
    );
  }
});
test("all SQL solutions pass and starter queries fail", async () => {
  const SQL = await initSqlJs();
  for (const item of [...lessons, ...projects].filter(
    (i) => i.challenge.language === "sql",
  )) {
    const c = item.challenge;
    assert.equal(
      allPassed(assessSql(SQL, c.solution, c), c.tests.length),
      true,
      item.title,
    );
    assert.equal(
      allPassed(assessSql(SQL, c.starter, c), c.tests.length),
      false,
      item.title + " starter already passes",
    );
  }
});
test("sync refuses to overwrite a differing device copy on initial load", async () => {
  let state = { updatedAt: 2, notes: { a: "local" } };
  const remote = {
    revision: 4,
    progress: { updatedAt: 3, notes: { a: "remote" } },
  };
  const sync = new SyncCoordinator({
    service: { load: async () => remote },
    getState: () => state,
    setState: (p) => (state = p),
  });
  await sync.load();
  assert.ok(sync.conflict);
  assert.equal(state.notes.a, "local");
  await sync.resolve("cloud");
  assert.equal(state.notes.a, "remote");
  sync.dispose();
});
test("stale saves surface a conflict and preserve the current device state", async () => {
  let state = { updatedAt: 1, value: "local" };
  const sync = new SyncCoordinator({
    service: {
      load: async () => ({
        revision: 2,
        progress: { updatedAt: 2, value: "remote" },
      }),
      save: async () => {
        throw Object.assign(new Error("stale"), { code: "conflict" });
      },
    },
    getState: () => state,
    setState: (p) => (state = p),
  });
  sync.ready = true;
  sync.revision = 1;
  await sync.flush();
  assert.equal(state.value, "local");
  assert.equal(sync.conflict.remote.progress.value, "remote");
  sync.dispose();
});
