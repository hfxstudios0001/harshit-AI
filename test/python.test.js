import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPyodide } from "pyodide";
import { lessons } from "../src/lessons.js";

test("all 24 Python teaching examples run, including the intentional debugging error", async () => {
  let output = "";
  const python = await loadPyodide({
    stdout: (text) => {
      output += text + "\n";
    },
  });
  let success = 0,
    expectedErrors = 0;
  for (const lesson of lessons.filter(
    (l) => !l.language || l.language === "python",
  )) {
    const globals = python.toPy({});
    output = "";
    try {
      if (lesson.title === "Read errors without panicking") {
        await assert.rejects(
          python.runPythonAsync(lesson.example, { globals }),
          /TypeError/,
        );
        expectedErrors++;
      } else {
        await python.runPythonAsync(lesson.example, { globals });
        success++;
        assert.ok(
          output.length > 0,
          lesson.title + " should demonstrate output",
        );
      }
    } finally {
      globals.destroy();
    }
  }
  assert.equal(success, 23);
  assert.equal(expectedErrors, 1);
});
