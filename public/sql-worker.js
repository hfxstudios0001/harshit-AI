importScripts("./sql/sql-wasm.js");
let runtime;
self.onmessage = async ({ data }) => {
  let db;
  try {
    runtime ||= await initSqlJs({
      locateFile: (file) => new URL("./sql/" + file, self.location.href).href,
    });
    db = new runtime.Database();
    db.run(data.schema || "");
    const result = db.exec(data.code).at(-1) || { columns: [], values: [] };
    const tests = (data.tests || []).map((t) => ({
      name: t.name,
      passed:
        JSON.stringify(result.columns) === JSON.stringify(t.columns) &&
        JSON.stringify(result.values) === JSON.stringify(t.expected),
      detail: "Check columns, row values, ordering, and null handling.",
    }));
    self.postMessage({
      type: "result",
      result: {
        ok: true,
        output: JSON.stringify(result, null, 2),
        table: result,
        tests,
      },
    });
  } catch (error) {
    self.postMessage({
      type: "result",
      result: {
        ok: false,
        error: String(error.message || error),
        output: "",
        tests: [],
      },
    });
  } finally {
    db?.close();
  }
};
