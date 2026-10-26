import "./style.css";
import { lessons, unlocked, correct } from "./lessons.js";
const icons = {
  home: "◫",
  path: "↗",
  review: "↻",
  notes: "▤",
  library: "⌕",
  settings: "⚙",
};
let state;
try {
  state = JSON.parse(localStorage.getItem("stepwise-v1"));
} catch {}
state = { completed: [], notes: {}, drafts: {}, goal: 20, ...state };
state.completed = Array.isArray(state.completed)
  ? state.completed.filter(
      (x) => Number.isInteger(x) && x >= 0 && x < lessons.length,
    )
  : [];
state.notes = cleanTextMap(state.notes);
state.drafts = cleanTextMap(state.drafts);
function cleanTextMap(value) {
  return Object.fromEntries(
    Object.entries(value && typeof value === "object" ? value : {})
      .filter(
        ([key, text]) =>
          /^\d+$/.test(key) && lessons[Number(key)] && typeof text === "string",
      )
      .map(([k, v]) => [k, v.slice(0, 50000)]),
  );
}
let page = "home",
  active = 0,
  stage = 0,
  feedback = "",
  passed = false;
let runningWorker = null,
  runTimer = null;
state.reviews =
  state.reviews && typeof state.reviews === "object" ? state.reviews : {};
state.goal = [10, 20, 30, 60].includes(state.goal) ? state.goal : 20;
const chapters = [
  { title: "Your first Python project", start: 0, end: 6 },
  { title: "Working with information", start: 6, end: 12 },
  { title: "Reusable, reliable programs", start: 12, end: 18 },
  { title: "From code to projects", start: 18, end: 24 },
  { title: "Web & Git essentials", start: 24, end: 32 },
];
function stopRun() {
  if (runningWorker) runningWorker.terminate();
  runningWorker = null;
  clearTimeout(runTimer);
}

const escape = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const save = () => {
  try {
    localStorage.setItem("stepwise-v1", JSON.stringify(state));
  } catch {
    document.getElementById("storage-warning").hidden = false;
  }
};
const next = () => lessons.findIndex((_, i) => !state.completed.includes(i));
function openLesson(i) {
  if (!Number.isInteger(i) || !lessons[i] || !unlocked(i, state.completed))
    return;
  active = i;
  stage = 0;
  feedback = "";
  passed = false;
  page = "lesson";
  render();
  window.scrollTo(0, 0);
}
function shell(body) {
  return `<aside class="sidebar"><a class="brand" href="#" data-page="home"><span class="logo">s<span>↗</span></span>stepwise<span class="brand-dot">.</span></a><div class="workspace-label">YOUR LEARNING SPACE</div><nav>${[
    ["home", "Overview"],
    ["path", "My learning path"],
    ["review", "Practice & review"],
    ["notes", "My notebook"],
    ["library", "Lesson library"],
    ["settings", "Progress & backup"],
  ]
    .map(
      ([id, label]) =>
        `<button data-page="${id}" aria-label="${label}" class="nav-item ${page === id || (page === "lesson" && id === "path") ? "selected" : ""}"><span>${icons[id]}</span>${label}${id === "path" ? `<small>${lessons.length}</small>` : ""}</button>`,
    )
    .join(
      "",
    )}</nav><div class="sidebar-card"><span class="little-spark">✦</span><h3>Small steps.<br>Real understanding.</h3><p>You don’t have to know it all.<br>Just take the next step.</p><div class="plant">╱╲<span>✳</span></div></div><div class="profile"><span class="avatar">Y</span><div><strong>Your personal space</strong><small>Beginner · Big ambitions</small></div><span class="profile-dot"></span></div></aside><div class="main-wrap"><header><div><span class="breadcrumb">My workspace</span><span class="slash">/</span>${page === "lesson" ? "My learning path" : { home: "Overview", path: "My learning path", review: "Practice & review", notes: "My notebook", library: "Lesson library", settings: "Progress & backup" }[page]}</div><span class="header-tag"><span></span> Learning at your pace</span></header><main>${body}</main><footer>Built for curiosity. Designed for progress.<span>One step at a time ✦</span></footer></div><div id="storage-warning" role="alert" hidden>Browser storage is unavailable. Your progress cannot be saved on this device.</div>`;
}
function lessonRows(limit = lessons.length) {
  return lessons
    .slice(0, limit)
    .map(
      (l, i) =>
        `<button class="lesson-row ${!unlocked(i, state.completed) ? "locked" : ""}" data-lesson="${i}" ${!unlocked(i, state.completed) ? "disabled" : ""}><span class="lesson-number ${state.completed.includes(i) ? "done" : ""}">${state.completed.includes(i) ? "✓" : String(i + 1).padStart(2, "0")}</span><span class="lesson-details"><strong>${l.title}</strong><small>${l.category} <span>·</span> ${l.minutes} min</small></span><span class="lesson-status">${state.completed.includes(i) ? "Completed ✓" : unlocked(i, state.completed) ? "Start lesson ↗" : "Locked"}</span></button>`,
    )
    .join("");
}
function home() {
  let n = next(),
    current = n < 0 ? lessons.length - 1 : n;
  return `<section class="page-heading"><div class="eyebrow">A FRESH START, EVERY DAY</div><h1>Your future starts with<br>one small step<span class="green">.</span></h1><p>No experience needed. Just curiosity and a little time.</p></section><section class="hero"><div class="hero-copy"><span class="pill">✦ YOUR FIRST CHAPTER</span><h2>From “I know nothing”<br>to “I built this.”</h2><p>Learn to code from the ground up. Bite-sized lessons,<br class="desktop"> hands-on practice, and plenty of little wins.</p><button class="primary" data-lesson="${current}">${n === 0 ? "Let’s take the first step" : n < 0 ? "Revisit your first project" : "Continue learning"} <span>↗</span></button><div class="hero-meta"><span>◷ ${lessons[current].minutes} minutes</span><span>◈ Beginner friendly</span></div></div><div class="hero-art" aria-hidden="true"><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><span class="spark spark-one">✳</span><span class="spark spark-two">✦</span><div class="floating-label">a little better, every day</div><div class="stair stair-one">01 <span>Learn</span></div><div class="stair stair-two">02 <span>Practice</span></div><div class="stair stair-three">03 <span>Build ↗</span></div><div class="art-caption">YOU’VE GOT THIS.</div></div></section><section class="stats"><div><span class="stat-icon sage">◫</span><div><strong>${state.completed.length}<small> / ${lessons.length}</small></strong><p>Lessons understood</p></div></div><div><span class="stat-icon peach">◷</span><div><strong>${state.goal}<small> min / day</small></strong><p>Your daily goal <button class="text-link" id="goal-edit" aria-label="Change daily goal">Edit</button></p></div></div><div><span class="stat-icon lilac">↗</span><div><strong>${Math.round((state.completed.length / lessons.length) * 100)}<small>%</small></strong><p>Learning path complete</p></div></div></section><div class="lower-grid"><section class="card path-card"><div class="section-title"><div><span class="eyebrow">YOUR ROADMAP</span><h2>A clear path forward</h2></div><button class="text-link" data-page="path">View path ↗</button></div><div class="chapter-heading"><span class="chapter-icon">⌘</span><div><strong>01 · Learn the language of computers</strong><p>Python, web & Git · ${lessons.length} guided lessons</p></div><span class="tag">START HERE</span></div><div class="progress-track"><div style="width:${(state.completed.length / lessons.length) * 100}%"></div></div>${lessonRows(3)}</section><aside class="method-card"><span class="eyebrow">LEARN IT. REALLY GET IT.</span><h2>Fast doesn’t have<br>to mean shallow.</h2><div class="method"><span>01</span><div><strong>Understand the why</strong><p>Simple explanations. No jargon walls.</p></div></div><div class="method"><span>02</span><div><strong>Try it for yourself</strong><p>Turn an idea into something that works.</p></div></div><div class="method"><span>03</span><div><strong>Make it stick</strong><p>Check your understanding. Revisit it.</p></div></div><div class="method-bottom">Depth over speed. Progress over perfection.</div></aside></div>`;
}
function learning() {
  const l = lessons[active];
  return `<button class="text-link back" data-page="path">← Back to your path</button><div class="eyebrow">LESSON ${active + 1} OF ${lessons.length} · ${l.minutes} MINUTES</div><h1>${l.title}</h1><div class="step-tabs">${["Understand", "Try it", "Check & reflect"].map((s, i) => `<button data-stage="${i}" class="${stage === i ? "active" : ""}">${i + 1}. ${s}</button>`).join("")}</div><section class="card lesson-content">${stage === 0 ? `<span class="pill">THE BIG IDEA</span><h2>${l.concept}</h2><p>${l.explanation}</p><div class="code-label">${(l.language || "python").toUpperCase()}</div><pre><code>${escape(l.example)}</code></pre><h3>Let’s unpack that</h3><p>${l.breakdown}</p><button class="primary" data-stage="1">Try it yourself →</button>` : stage === 1 ? `<h2>Make the idea your own</h2><p>${l.task}</p><label for="code">${l.language === "notes" ? "Your exercise notes" : "Your code editor"}</label><textarea id="code" class="code-editor" spellcheck="false">${escape(state.drafts[active] ?? l.starter)}</textarea>${practiceControls(l)}<button class="primary" data-stage="2">Check my understanding →</button>` : `<h2>A small check. A deeper understanding.</h2><p>${l.question}</p><div class="choices">${l.choices.map((c, i) => `<button data-answer="${i}">${String.fromCharCode(65 + i)} <span>${escape(c)}</span></button>`).join("")}</div><div role="status" class="feedback ${passed ? "success" : ""}">${feedback}</div><label for="reflection">Explain it in your own words</label><p class="muted">${l.recall}</p><textarea id="reflection" placeholder="I understand that…">${escape(state.notes[active] || "")}</textarea><button class="primary" id="complete" ${passed && String(state.notes[active] || "").trim().length >= 15 ? "" : "disabled"}>Complete lesson ✓</button><p class="muted small">Answer correctly and write a reflection of at least 15 characters to continue. This is a learning checkpoint, not a certification of mastery.</p>`}</section>`;
}
function render() {
  stopRun();
  let body;
  if (page === "home") body = home();
  else if (page === "path") body = pathPage();
  else if (page === "lesson") body = learning();
  else if (page === "review")
    body = `<div class="eyebrow">MAKE IT STICK</div><h1>A little recall goes a long way<span class="green">.</span></h1><p class="subtitle">Try answering from memory before reopening a lesson.</p>${state.completed.length ? state.completed.map((i) => `<section class="card review-card"><span class="eyebrow">LESSON ${i + 1} · ${reviewDue(i) ? "READY TO REVIEW" : "REVIEW SCHEDULED"}</span><h2>${lessons[i].title}</h2><p>${lessons[i].recall}</p><details><summary>Reveal your previous reflection</summary><p class="saved-note">${escape(state.notes[i] || "No reflection yet.")}</p></details><div class="review-actions"><button class="text-link" data-lesson="${i}">Revisit lesson ↗</button><button class="primary" data-review="${i}">I recalled this — review later</button></div></section>`).join("") : `<section class="card empty"><span>↻</span><h2>Your practice space is waiting</h2><p>Finish your first lesson, then come back to revisit what you learned.</p><button class="primary" data-lesson="0">Start lesson one ↗</button></section>`}`;
  else if (page === "library") body = libraryPage();
  else if (page === "settings") body = settingsPage();
  else
    body = `<div class="eyebrow">YOUR IDEAS, IN YOUR WORDS</div><h1>My notebook<span class="green">.</span></h1><p class="subtitle">Reflections from your lessons, saved automatically on this browser.</p>${
      Object.keys(state.notes).filter((i) => state.notes[i] && lessons[i])
        .length
        ? Object.keys(state.notes)
            .filter((i) => state.notes[i] && lessons[i])
            .map(
              (i) =>
                `<section class="card review-card"><h2>${lessons[i].title}</h2><p class="saved-note">${escape(state.notes[i])}</p><button class="text-link" data-lesson="${i}">Open lesson ↗</button></section>`,
            )
            .join("")
        : '<section class="card empty"><span>▤</span><h2>Understanding starts with your own words</h2><p>Your lesson reflections will appear here. No perfect answers needed.</p><button class="primary" data-lesson="0">Start writing through learning ↗</button></section>'
    }`;
  document.querySelector("#app").innerHTML = shell(body);
  bind();
}
function bind() {
  bindExtras();
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = (e) => {
        e.preventDefault();
        page = b.dataset.page;
        render();
        window.scrollTo(0, 0);
      }),
  );
  document
    .querySelectorAll("[data-lesson]")
    .forEach((b) => (b.onclick = () => openLesson(Number(b.dataset.lesson))));
  document.querySelectorAll("[data-stage]").forEach(
    (b) =>
      (b.onclick = () => {
        stage = Number(b.dataset.stage);
        render();
      }),
  );
  document.querySelectorAll("[data-answer]").forEach(
    (b) =>
      (b.onclick = () => {
        passed = correct(active, Number(b.dataset.answer));
        feedback = passed
          ? "✓ That’s right. " + lessons[active].why
          : "Not quite. " + lessons[active].why + " Try again.";
        render();
      }),
  );
  const code = document.querySelector("#code");
  if (code)
    code.oninput = () => {
      state.drafts[active] = code.value;
      save();
    };
  const reflection = document.querySelector("#reflection");
  if (reflection)
    reflection.oninput = () => {
      state.notes[active] = reflection.value;
      save();
      document.querySelector("#complete").disabled = !(
        passed && reflection.value.trim().length >= 15
      );
    };
  const complete = document.querySelector("#complete");
  if (complete)
    complete.onclick = () => {
      if (!passed || String(state.notes[active] || "").trim().length < 15)
        return;
      if (!state.completed.includes(active)) state.completed.push(active);
      if (!state.reviews[active])
        state.reviews[active] = { level: 0, due: Date.now() + 86400000 };
      save();
      page = "path";
      render();
      window.scrollTo(0, 0);
    };
  const goal = document.querySelector("#goal-edit");
  if (goal)
    goal.onclick = () => {
      const dialog = document.createElement("dialog");
      dialog.innerHTML =
        '<form method="dialog"><h2>Your daily learning goal</h2><p>A sustainable pace beats a rushed sprint.</p><label for="goal">Minutes per day</label><select id="goal">' +
        [10, 20, 30, 60]
          .map(
            (n) =>
              `<option ${state.goal === n ? "selected" : ""}>${n}</option>`,
          )
          .join("") +
        '</select><div class="dialog-actions"><button value="cancel">Cancel</button><button class="primary" value="save">Save goal</button></div></form>';
      document.body.append(dialog);
      dialog.addEventListener("close", () => {
        if (dialog.returnValue === "save") {
          state.goal = Number(dialog.querySelector("select").value);
          save();
          render();
        }
        dialog.remove();
      });
      dialog.showModal();
    };
}
function practiceControls(l) {
  if (l.language === "notes")
    return '<div class="notice">This is a written exercise. Use your own words in the space above. No terminal or database is required for this lesson.</div>';
  return `<div class="runner-toolbar"><button class="primary" id="run-code">${l.language === "html" ? "Preview webpage ↗" : "▶ Run Python"}</button><button class="text-link" id="stop-code">Stop / clear output</button><span>${l.language === "html" ? "Isolated page preview" : "Python runs on your device · no setup needed"}</span></div><div class="runner-status" id="run-status" role="status"></div><pre id="code-output" aria-label="Program output" hidden></pre><div id="preview-slot"></div><div class="notice">${l.language === "html" ? "Your preview is isolated from the learning app. Reloading it resets its state." : "The first run loads a bundled Python runtime (about 15 MB). Each run starts fresh; input() is not supported. Long-running programs stop after 30 seconds. Use fixed values while learning."}</div>`;
}
function pathPage() {
  return `<div class="eyebrow">A GUIDED PATH, NOT A LIST OF TOOLS</div><h1>Build your foundations<span class="green">.</span></h1><p class="subtitle">${lessons.length} lessons. Five chapters. Learn, experiment, explain, then move forward.</p>${chapters
    .map(
      (c, i) =>
        `<section class="card chapter-card"><div class="section-title"><div><span class="eyebrow">CHAPTER ${i + 1}</span><h2>${c.title}</h2></div><span class="tag">${state.completed.filter((n) => n >= c.start && n < c.end).length} / ${c.end - c.start} COMPLETE</span></div>${lessons
          .slice(c.start, c.end)
          .map((l, j) => row(l, c.start + j))
          .join("")}</section>`,
    )
    .join(
      "",
    )}<div class="notice"><strong>After these foundations:</strong> deepen JavaScript, SQL, backend development, testing, and deployment, then choose AI, cloud, or data engineering. Those advanced courses are not included yet. You do not need to learn all four specializations at once.</div>`;
}
function row(l, i) {
  return `<button class="lesson-row" data-lesson="${i}" ${unlocked(i, state.completed) ? "" : "disabled"}><span class="lesson-number ${state.completed.includes(i) ? "done" : ""}">${state.completed.includes(i) ? "✓" : i + 1}</span><span class="lesson-details"><strong>${escape(l.title)}</strong><small>${escape(l.category)} · ${l.minutes} min · ${l.language === "notes" ? "Written exercise" : l.language === "html" ? "Live preview" : "Run Python"}</small></span><span class="lesson-status">${state.completed.includes(i) ? "Review ↗" : unlocked(i, state.completed) ? "Start ↗" : "Locked"}</span></button>`;
}
function libraryPage() {
  return `<div class="eyebrow">FIND YOUR NEXT AHA MOMENT</div><h1>Your lesson library<span class="green">.</span></h1><p class="subtitle">Search the curriculum. Follow the learning path to unlock each lesson.</p><label for="lesson-search">Search by topic or lesson name</label><input id="lesson-search" type="search" placeholder="Try functions, Git, or HTML…"><section class="card" id="search-results">${lessons.map(row).join("")}</section><p class="muted small" id="search-count">${lessons.length} lessons</p>`;
}
function reviewDue(i) {
  return !state.reviews[i] || state.reviews[i].due <= Date.now();
}
function settingsPage() {
  return `<div class="eyebrow">YOUR PROGRESS BELONGS TO YOU</div><h1>Keep your learning safe<span class="green">.</span></h1><section class="card lesson-content"><h2>Progress backup</h2><p>Your notes, practice code, and completed lessons are stored in this browser. They do not automatically sync to another device. Download a backup before changing devices or clearing browser data.</p><div class="backup-actions"><button id="export-progress" class="primary">Download my progress ↓</button><label class="import-label" for="import-progress">Restore from backup</label><input type="file" id="import-progress" accept="application/json,.json"></div><p class="muted small">Restoring merges completed lessons. Imported notes and code replace matching entries; download your current progress first if you want to preserve both versions.</p><div id="import-status" role="status"></div><h2>Your study rhythm</h2><p>Aim for ${state.goal} minutes a day. Spend a little time understanding, most of it practicing, and a few minutes recalling without looking.</p><button id="goal-edit" class="text-link">Change daily goal ↗</button><h2>What this platform includes</h2><p>24 Python lessons with real code execution, 8 web and Git foundation lessons, a browser webpage preview, quizzes, reflection notes, and scheduled review. No paid API key is needed. Accounts, automatic cloud sync, AI tutoring, and advanced specialization courses are not included.</p></section>`;
}
function validateBackup(data) {
  if (
    !data ||
    data.format !== "stepwise-backup" ||
    data.version !== 1 ||
    !data.progress ||
    !Array.isArray(data.progress.completed)
  )
    throw new Error("Choose a Stepwise progress backup JSON file.");
  const p = data.progress;
  if (
    p.completed.some(
      (i) => !Number.isInteger(i) || i < 0 || i >= lessons.length,
    )
  )
    throw new Error("The backup contains unknown lesson numbers.");
  const completed = [...new Set(p.completed)].sort((a, b) => a - b);
  if (completed.some((value, index) => value !== index))
    throw new Error("The backup has a gap in completed lessons.");
  return {
    completed,
    notes: cleanTextMap(p.notes),
    drafts: cleanTextMap(p.drafts),
    goal: [10, 20, 30, 60].includes(p.goal) ? p.goal : state.goal,
  };
}
function bindExtras() {
  const run = document.querySelector("#run-code");
  if (run)
    run.onclick = () => {
      stopRun();
      const code = document.querySelector("#code").value;
      const output = document.querySelector("#code-output"),
        status = document.querySelector("#run-status");
      if (lessons[active].language === "html") {
        const frame = document.createElement("iframe");
        frame.title = "Your webpage preview";
        frame.setAttribute("sandbox", "allow-scripts");
        frame.setAttribute("referrerpolicy", "no-referrer");
        frame.srcdoc =
          "<meta http-equiv=\"Content-Security-Policy\" content=\"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:;\">" +
          code;
        document.querySelector("#preview-slot").replaceChildren(frame);
        status.textContent = "Preview updated. Try interacting with your page.";
        return;
      }
      output.hidden = false;
      output.textContent = "";
      status.textContent = "Loading Python and running your program…";
      run.disabled = true;
      try {
        runningWorker = new Worker(
          new URL("python-worker.js", document.baseURI),
          { type: "module" },
        );
      } catch (error) {
        status.textContent =
          "Python could not start in this browser: " + error.message;
        run.disabled = false;
        return;
      }
      function finish(message) {
        stopRun();
        status.textContent = message;
        run.disabled = false;
      }
      runningWorker.onmessage = ({ data }) => {
        output.textContent = data.output;
        finish(
          data.ok
            ? "Program finished. Compare the output with your prediction."
            : "Python found an error. Read the final line below, then try a small fix.",
        );
      };
      runningWorker.onerror = () =>
        finish(
          "Python could not load. Refresh the page and check your connection; the runtime files must be hosted with the app.",
        );
      runTimer = setTimeout(
        () =>
          finish(
            "Stopped after 30 seconds. Check for an infinite loop, or retry if the first runtime download was slow.",
          ),
        30000,
      );
      runningWorker.postMessage({ code });
    };
  const stop = document.querySelector("#stop-code");
  if (stop)
    stop.onclick = () => {
      stopRun();
      document.querySelector("#run-code").disabled = false;
      document.querySelector("#code-output").textContent = "";
      document.querySelector("#preview-slot").replaceChildren();
      document.querySelector("#run-status").textContent =
        "Stopped. Your code is still saved.";
    };
  const search = document.querySelector("#lesson-search");
  if (search)
    search.oninput = () => {
      const query = search.value.toLowerCase().trim();
      const matches = lessons
        .map((l, i) => ({ l, i }))
        .filter(({ l }) =>
          (l.title + " " + l.category + " " + l.concept)
            .toLowerCase()
            .includes(query),
        );
      document.querySelector("#search-results").innerHTML = matches.length
        ? matches.map(({ l, i }) => row(l, i)).join("")
        : "<p>No lessons found. Try another topic.</p>";
      document.querySelector("#search-count").textContent =
        matches.length + " lessons";
      document
        .querySelectorAll("#search-results [data-lesson]")
        .forEach(
          (b) => (b.onclick = () => openLesson(Number(b.dataset.lesson))),
        );
    };
  document.querySelectorAll("[data-review]").forEach(
    (b) =>
      (b.onclick = () => {
        const i = Number(b.dataset.review);
        const level = Math.min((state.reviews[i]?.level || 0) + 1, 4);
        state.reviews[i] = {
          level,
          due: Date.now() + [1, 3, 7, 14, 30][level] * 86400000,
        };
        save();
        b.textContent = "Scheduled in " + [1, 3, 7, 14, 30][level] + " days";
        b.disabled = true;
      }),
  );
  const download = document.querySelector("#export-progress");
  if (download)
    download.onclick = () => {
      const data = {
        format: "stepwise-backup",
        version: 1,
        exportedAt: new Date().toISOString(),
        progress: state,
      };
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.download = "stepwise-progress.json";
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    };
  const upload = document.querySelector("#import-progress");
  if (upload)
    upload.onchange = async () => {
      const status = document.querySelector("#import-status");
      try {
        const file = upload.files[0];
        if (!file) return;
        if (file.size > 2000000)
          throw new Error(
            "This file is too large. Choose a progress backup under 2 MB.",
          );
        const p = validateBackup(JSON.parse(await file.text()));
        state.completed = [
          ...new Set([...state.completed, ...p.completed]),
        ].sort((a, b) => a - b);
        Object.assign(state.notes, p.notes);
        Object.assign(state.drafts, p.drafts);
        state.goal = p.goal;
        save();
        status.textContent =
          "Progress restored. Your learning path and notebook are updated.";
      } catch (error) {
        status.textContent = "Could not restore: " + error.message;
      }
    };
}
render();
