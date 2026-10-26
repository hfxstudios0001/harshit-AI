import { mkdir, copyFile } from 'node:fs/promises';
await mkdir(new URL('../public/python/', import.meta.url), {recursive:true});
for (const file of ['pyodide.mjs','pyodide.asm.mjs','pyodide.asm.wasm','python_stdlib.zip','pyodide-lock.json']) {
 await copyFile(new URL('../node_modules/pyodide/'+file,import.meta.url),new URL('../public/python/'+file,import.meta.url));
}
console.log('Local Python runtime ready.');
