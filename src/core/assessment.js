export function codeFingerprint(code) {
  // A change detector, not a security hash or anti-cheating mechanism.
  let hash = 2166136261;
  for (let i = 0; i < code.length; i++)
    hash = Math.imul(hash ^ code.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16) + ":" + code.length;
}
export function allPassed(result, expectedCount) {
  return (
    result?.ok === true &&
    Array.isArray(result.tests) &&
    expectedCount > 0 &&
    result.tests.length === expectedCount &&
    result.tests.every((t) => t.passed === true)
  );
}
export function assessScenario(challenge, answers) {
  const tests = challenge.questions.map((q, i) => ({
    name: q.question,
    passed: answers[i] === q.answer,
    detail: q.why,
  }));
  return { ok: true, tests, output: "" };
}
export const pythonHelpers = `
import io as _io
import contextlib as _contextlib
import copy as _copy

def _capture(fn, *args):
    stream = _io.StringIO()
    with _contextlib.redirect_stdout(stream):
        fn(*args)
    return stream.getvalue()

def _raises(error_type, fn, *args):
    try:
        fn(*args)
    except error_type:
        return True
    except Exception:
        return False
    return False

def _unchanged(fn, value, *args):
    before = _copy.deepcopy(value)
    fn(value, *args)
    return value == before
`;
export async function assessPython(runtime, code, tests, getOutput) {
  const globals = runtime.toPy({ __name__: "__main__" });
  try {
    await runtime.runPythonAsync(code, { globals });
    const output = getOutput();
    globals.set("_output", output);
    await runtime.runPythonAsync(pythonHelpers, { globals });
    const results = [];
    for (const test of tests) {
      try {
        const passed =
          runtime.runPython(`bool(${test.expression})`, { globals }) === true;
        results.push({
          name: test.name,
          passed,
          detail: passed
            ? "Passed"
            : "The returned value or behavior did not meet this requirement.",
        });
      } catch (error) {
        results.push({
          name: test.name,
          passed: false,
          detail: String(error.message || error).slice(-1800),
        });
      }
    }
    return { ok: true, output, tests: results };
  } catch (error) {
    return {
      ok: false,
      output: getOutput(),
      error: String(error.message || error).slice(-6000),
      tests: [],
    };
  } finally {
    globals.destroy();
  }
}
export async function assessJavaScript(code, tests = []) {
  let output = "";
  const log = (...values) => {
    if (output.length < 20000)
      output += (
        values
          .map((v) => (typeof v === "string" ? v : JSON.stringify(v)))
          .join(" ") + "\n"
      ).slice(0, 20000 - output.length);
  };
  try {
    const AsyncFunction = Object.getPrototypeOf(
      async function () {},
    ).constructor;
    const checks = tests
      .map(
        (t) =>
          `try { const passed=Boolean(await (${t.expression})); __results.push({name:${JSON.stringify(t.name)},passed,detail:passed?'Passed':'The returned value or behavior did not meet this requirement.'}); } catch(error) { __results.push({name:${JSON.stringify(t.name)},passed:false,detail:String(error.message||error)}); }`,
      )
      .join("\n");
    const fn = new AsyncFunction(
      "console",
      code + "\n;const __results=[];\n" + checks + "\nreturn __results;",
    );
    const results = await fn({ log, warn: log, error: log });
    if (!Array.isArray(results))
      throw new Error(
        "The program returned before assessment could run. Define your functions without a top-level return.",
      );
    return { ok: true, output, tests: results };
  } catch (error) {
    return {
      ok: false,
      output,
      error: String(error.message || error),
      tests: [],
    };
  }
}
export function assessSql(SQL, code, challenge) {
  const db = new SQL.Database();
  try {
    db.run(challenge.schema || "");
    const outputs = db.exec(code);
    const result = outputs.at(-1) || { columns: [], values: [] };
    const tests = (challenge.tests || []).map((t) => ({
      name: t.name,
      passed:
        JSON.stringify(result.columns) === JSON.stringify(t.columns) &&
        JSON.stringify(result.values) === JSON.stringify(t.expected),
      detail:
        "Compare the returned column names, rows, ordering, and null behavior with the requirement.",
    }));
    return {
      ok: true,
      output: JSON.stringify(result, null, 2),
      table: result,
      tests,
    };
  } catch (error) {
    return {
      ok: false,
      error: String(error.message || error),
      output: "",
      tests: [],
    };
  } finally {
    db.close();
  }
}
