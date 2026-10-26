import { loadPyodide } from "./python/pyodide.mjs";
let runtime;
let output = "";
function append(text) {
  if (output.length < 20000)
    output += (text + "\n").slice(0, 20000 - output.length);
}
self.onmessage = async ({ data }) => {
  try {
    runtime ||= await loadPyodide({
      indexURL: new URL("./python/", self.location.href).href,
      stdout: append,
      stderr: append,
      stdin: () => null,
    });
    output = "";
    const globals = runtime.toPy({});
    try {
      await runtime.runPythonAsync(data.code, { globals });
      self.postMessage({
        ok: true,
        output: output || "Program finished without printed output.",
      });
    } finally {
      globals.destroy();
    }
  } catch (error) {
    self.postMessage({
      ok: false,
      output: output + "\n" + String(error.message || error),
    });
  }
};
