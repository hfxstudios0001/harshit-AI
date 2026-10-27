import { mkdir, copyFile } from "node:fs/promises";
await mkdir(new URL("../public/python/", import.meta.url), { recursive: true });
for (const file of [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
]) {
  await copyFile(
    new URL("../node_modules/pyodide/" + file, import.meta.url),
    new URL("../public/python/" + file, import.meta.url),
  );
}
console.log("Local Python runtime ready.");
await copyFile(
  new URL("../src/core/assessment.js", import.meta.url),
  new URL("../public/assessment.js", import.meta.url),
);
await mkdir(new URL("../public/sql/", import.meta.url), { recursive: true });
for (const file of ["sql-wasm.js", "sql-wasm.wasm"])
  await copyFile(
    new URL("../node_modules/sql.js/dist/" + file, import.meta.url),
    new URL("../public/sql/" + file, import.meta.url),
  );
