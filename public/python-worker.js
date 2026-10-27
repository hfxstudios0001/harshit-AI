import { loadPyodide } from "./python/pyodide.mjs";
import { assessPython } from "./assessment.js";
let runtime,
  output = "";
const append = (text) => {
  if (output.length < 20000)
    output += (text + "\n").slice(0, 20000 - output.length);
};
self.onmessage = async ({ data }) => {
  try {
    self.postMessage({ type: "status", message: "Loading Python…" });
    runtime ||= await loadPyodide({
      indexURL: new URL("./python/", self.location.href).href,
      stdout: append,
      stderr: append,
      stdin: () => null,
    });
    output = "";
    self.postMessage({ type: "status", message: "Running your program…" });
    const result = await assessPython(
      runtime,
      data.code,
      data.tests || [],
      () => output,
    );
    self.postMessage({ type: "result", result });
  } catch (error) {
    self.postMessage({
      type: "result",
      result: {
        ok: false,
        error: String(error.message || error),
        output,
        tests: [],
      },
    });
  }
};
