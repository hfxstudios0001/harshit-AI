export const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const paths = {
  home: "M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z",
  path: "M5 4h14M5 12h14M5 20h14M8 4v16",
  projects: "M3 7h18v13H3zM8 7V4h8v3M3 12h18",
  review: "M20 7a8 8 0 1 0 1 7M20 3v5h-5",
  notes: "M5 3h14v18H5zM8 7h8M8 11h8M8 15h5",
  insights: "M4 20h17M7 16v-5M12 16V5M17 16V8",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2",
  arrow: "M5 12h14M13 6l6 6-6 6",
  check: "m5 12 4 4L19 6",
  clock: "M12 8v5l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18",
  search: "M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14M15 15l6 6",
  code: "m8 6-6 6 6 6M16 6l6 6-6 6M14 3l-4 18",
  cloud: "M6 18a5 5 0 0 1-1-10 7 7 0 0 1 13-1 5 5 0 0 1 0 11Z",
  book: "M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3zM12 6v15",
  bookmark: "M6 3h12v18l-6-4-6 4z",
  download: "M12 3v12M7 10l5 5 5-5M4 17v4h16v-4",
  close: "m6 6 12 12M6 18 18 6",
  play: "m8 4 12 8-12 8z",
  sun: "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v2M12 20v2M2 12h2M20 12h2",
  menu: "M4 6h16M4 12h16M4 18h16",
};
export const icon = (name, size = 20) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${paths[name] || paths.code}"/></svg>`;
export const codeBlock = (code, language = "") =>
  `<div class="code-sample"><div class="code-caption">${escape(language)} <span>Worked example</span></div><pre><code>${escape(code)}</code></pre></div>`;
export function download(name, text, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
