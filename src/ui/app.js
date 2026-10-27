import {
  lessons,
  modules,
  lessonById,
  moduleById,
  moduleLessons,
} from "../curriculum/index.js";
import { projects, projectById } from "../curriculum/projects.js";
import {
  STORAGE_KEY,
  loadProgress,
  saveProgress,
  normalizeProgress,
  initialProgress,
  challengeSource,
  hasEvidence,
  canComplete,
  canCompleteProject,
  markComplete,
  scheduleReview,
  activitySummary,
  localDay,
  exportBackup,
  parseBackup,
} from "../core/progress.js";
import {
  allPassed,
  codeFingerprint,
  assessScenario,
} from "../core/assessment.js";
import { Runner } from "../core/runner.js";
import {
  cloudConfigured,
  cloudClient,
  progressService,
} from "../core/cloud.js";
import { SyncCoordinator } from "../core/sync.js";
import { escape as e, icon, codeBlock, download } from "./html.js";

export function startApp() {
  const app = document.querySelector("#app");
  let storage;
  try {
    storage = window.localStorage;
  } catch {
    storage = {
      getItem: () => null,
      setItem: () => {
        throw new Error("Storage unavailable");
      },
    };
  }
  let storageKey = STORAGE_KEY,
    state = loadProgress(storage),
    user = null,
    sync = null,
    syncStatus = "local",
    syncError = "",
    saveError = false;
  let results = {},
    revealed = new Set(),
    hints = {},
    query = "",
    moduleFilter = "",
    reviewAnswers = {},
    mobileOpen = false;
  let focus = { started: 0, ends: 0, running: false },
    lastRoute = "",
    saveTimer,
    toastTimer;
  const runner = new Runner();
  const route = () => {
    const [page = "home", id = "", step = "learn"] = location.hash
      .replace(/^#/, "")
      .split("/");
    return { page: page || "home", id: decodeURIComponent(id), step };
  };
  function persist() {
    state.updatedAt = Date.now();
    state.activities = state.activities.slice(-5000);
    try {
      saveProgress(storage, state, storageKey);
      saveError = false;
    } catch {
      saveError = true;
    }
    sync?.changed();
    updateSaveStatus();
  }
  function saveSoon() {
    persist();
  }
  function flushLocal() {
    clearTimeout(saveTimer);
    try {
      saveProgress(storage, state, storageKey);
    } catch {
      saveError = true;
    }
  }
  function notify(message) {
    let node = document.querySelector("#toast");
    if (!node) {
      node = document.createElement("div");
      node.id = "toast";
      node.setAttribute("role", "status");
      document.body.append(node);
    }
    node.textContent = message;
    node.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (node.hidden = true), 6000);
  }
  function currentItem() {
    const r = route();
    return r.page === "project" ? projectById[r.id] : lessonById[r.id];
  }
  function navigate(hash) {
    if (location.hash === "#" + hash) render();
    else location.hash = hash;
  }
  const nextLesson = () =>
    lessons.find((l) => !state.completed[l.id]) || lessons.at(-1);
  const percentage = (items) =>
    Math.round(
      (items.filter((l) => state.completed[l.id]).length / items.length) * 100,
    ) || 0;
  function statusText() {
    if (saveError) return "Device storage full — export a backup";
    return user
      ? {
          loading: "Loading cloud progress…",
          synced: "Saved to your account",
          pending: "Saved here · sync pending",
          saving: "Syncing securely…",
          conflict: "Two versions need your attention",
          error: "Saved here · cloud sync failed",
        }[syncStatus] || "Saved on this device"
      : "Saved on this device";
  }
  function updateSaveStatus() {
    document
      .querySelectorAll("[data-save-status]")
      .forEach((n) => (n.textContent = statusText()));
    const warning = document.querySelector("#persistent-warning");
    if (warning) {
      warning.hidden = !saveError;
      warning.textContent =
        "Your latest changes could not be saved on this device. Export a backup now from Settings.";
    }
  }
  function applyPreferences() {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.dataset.fontSize = state.fontSize;
  }
  function shell(content) {
    const r = route(),
      nav = [
        ["home", "My day"],
        ["path", "Learning path"],
        ["projects", "Project studio"],
        ["practice", "Practice & recall"],
        ["notes", "My notebook"],
        ["insights", "My progress"],
        ["settings", "Account & settings"],
      ];
    return `<a class="skip-link" href="#main-content">Skip to content</a><aside class="sidebar ${mobileOpen ? "is-open" : ""}"><a class="brand" href="#home"><span class="brand-mark">s<span>↗</span></span>stepwise<span class="brand-period">.</span></a><div class="workspace-label">YOUR PERSONAL LEARNING SPACE</div><nav aria-label="Main navigation">${nav.map(([page, label]) => `<a href="#${page}" class="nav-item ${r.page === page || (page === "path" && r.page === "lesson") || (page === "projects" && r.page === "project") ? "active" : ""}" ${r.page === page ? 'aria-current="page"' : ""}>${icon({ path: "path", projects: "projects", practice: "review", notes: "notes", insights: "insights", settings: "settings", home: "home" }[page])}<span>${label}</span>${page === "practice" && activitySummary(state).due.length ? `<small>${activitySummary(state).due.length}</small>` : ""}</a>`).join("")}</nav><div class="sidebar-note"><span class="mini-spark">✦</span><strong>Understand it.<br>Build it. Own it.</strong><p>Your pace. Real practice.<br>Progress you can explain.</p></div><a class="account-chip" href="#settings"><span class="avatar">${e((state.name || user?.email || "You")[0].toUpperCase())}</span><span><strong>${e(state.name || "Your learning space")}</strong><small>${user ? "Private account" : "Personal workspace"}</small></span>${icon("settings", 16)}</a></aside><div class="main-wrap"><header class="topbar"><button class="icon-button mobile-toggle" data-action="menu" aria-label="Toggle navigation" aria-expanded="${mobileOpen}">${icon("menu")}</button><div class="breadcrumbs"><span>My workspace</span><span>/</span><strong>${e({ home: "Overview", path: "Learning path", lesson: "Lesson workspace", projects: "Project studio", project: "Project workspace", practice: "Practice & recall", notes: "My notebook", insights: "My progress", settings: "Account & settings" }[r.page] || "Learning space")}</strong></div><div class="header-actions"><a href="#path" class="icon-button" aria-label="Search lessons">${icon("search", 18)}</a><button class="focus-button ${focus.running ? "running" : ""}" data-action="focus">${icon("clock", 16)}<span id="focus-time">${focus.running ? focusTime() : "Focus session"}</span></button></div></header><div id="persistent-warning" class="alert error" role="alert" ${saveError ? "" : "hidden"}>Your latest changes could not be saved. Export a backup from Settings.</div>${syncStatus === "conflict" ? '<div class="sync-banner">Another device has a different version of your progress. Both copies are preserved. <a href="#settings">Resolve versions →</a></div>' : ""}<main id="main-content" tabindex="-1">${content}</main><footer><span>${icon(user ? "cloud" : "check", 14)} <span data-save-status>${e(statusText())}</span></span><span>Learn with intention. Build with confidence.</span></footer></div>`;
  }
  function heading(kicker, title, description, action = "") {
    return `<div class="page-heading"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${description}</p></div>${action}</div>`;
  }
  function moduleCard(m) {
    const items = moduleLessons(m.id),
      done = items.filter((l) => state.completed[l.id]).length;
    return `<a class="module-card" href="#path/${m.id}"><div class="module-top"><span class="module-index">${m.icon}</span><span class="tag">${m.level}</span></div><h3>${e(m.title)}</h3><p>${e(m.description)}</p><div class="module-bottom"><span>${done} / ${items.length} verified</span>${icon("arrow", 17)}</div><div class="progress-track"><span style="width:${(done / items.length) * 100}%"></span></div></a>`;
  }
  function lessonRow(l) {
    return `<a class="lesson-row" href="#lesson/${l.id}"><span class="lesson-state ${state.completed[l.id] ? "done" : ""}">${state.completed[l.id] ? icon("check", 16) : icon("code", 16)}</span><div><strong>${e(l.title)}</strong><small>${e(moduleById[l.module].title)} · ${l.minutes} min · ${l.language === "scenario" ? "Applied decisions" : l.language.toUpperCase()}</small></div><span class="row-tail">${state.completed[l.id] ? "Verified" : state.evidence[l.id] ? "Finish check" : "Open"} ${icon("arrow", 15)}</span></a>`;
  }
  function home() {
    const next = nextLesson(),
      stats = activitySummary(state),
      done = Object.keys(state.completed).length,
      activeModule = moduleById[next.module];
    return `${heading("A LITTLE PROGRESS. A DEEPER UNDERSTANDING.", `${state.name ? "Welcome back, " + e(state.name) : "Your next chapter starts here"}<span class="green">.</span>`, "A clear path from your first line of code to software you can explain.")}<section class="hero"><div class="hero-copy"><span class="pill">${done ? "CONTINUE YOUR JOURNEY" : "START FROM ZERO"}</span><h2>${done ? e(next.title) : "Don’t just learn the code.<br>Learn how to think."}</h2><p>${done ? e(next.concept) : "Understand one idea. Try it yourself. Test it against real cases.<br>Then build something that brings it all together."}</p><a class="button primary" href="#lesson/${next.id}">${done ? "Continue learning" : "Begin your first lesson"} ${icon("arrow", 18)}</a><div class="hero-meta"><span>${icon("clock", 14)} ${next.minutes} min</span><span>${icon("code", 14)} ${e(activeModule.title)}</span></div></div><div class="hero-art" aria-hidden="true"><div class="art-ring"></div><div class="art-ring second"></div><span class="art-spark">✦</span><div class="art-step one"><small>01</small><strong>Understand</strong></div><div class="art-step two"><small>02</small><strong>Practice</strong></div><div class="art-step three"><small>03</small><strong>Build ↗</strong></div><span class="art-label">a little better, every day</span></div></section><section class="stats-grid"><div class="stat-card"><span class="stat-icon">${icon("check")}</span><div><strong>${done}<small> / ${lessons.length}</small></strong><p>Lessons verified</p></div></div><div class="stat-card"><span class="stat-icon peach">${icon("projects")}</span><div><strong>${Object.keys(state.projectCompleted).length}<small> / ${projects.length}</small></strong><p>Projects completed</p></div></div><div class="stat-card"><span class="stat-icon lilac">${icon("clock")}</span><div><strong>${stats.todayMinutes}<small> / ${state.goal} min</small></strong><p>Focused study today</p></div></div><div class="stat-card"><span class="stat-icon blue">${icon("review")}</span><div><strong>${stats.due.length}</strong><p>Reviews ready for you</p></div></div></section><div class="dashboard-grid"><section class="card"><div class="section-heading"><div><div class="eyebrow">TODAY’S LEARNING PLAN</div><h2>One focused step at a time</h2></div><span class="tag">${state.goal} MIN GOAL</span></div><div class="plan-row"><span>01</span><div><strong>Understand & practice</strong><p>${e(next.title)}</p></div><a href="#lesson/${next.id}">${icon("arrow", 18)}<span class="sr-only">Open your next lesson</span></a></div><div class="plan-row"><span>02</span><div><strong>Recall without looking</strong><p>${stats.due.length ? `${stats.due.length} review${stats.due.length === 1 ? "" : "s"} ready. Give your memory a workout.` : "After completing lessons, spaced reviews appear here."}</p></div><a href="#practice">${icon("arrow", 18)}<span class="sr-only">Open practice</span></a></div><div class="plan-row"><span>03</span><div><strong>Connect it to a project</strong><p>Apply the concept. Test the edge cases. Explain your choices.</p></div><a href="#projects">${icon("arrow", 18)}<span class="sr-only">Open projects</span></a></div></section><aside class="principle-card"><div class="eyebrow">DEPTH OVER RUSHING</div><h2>Passing a lesson<br>means doing the work.</h2><p>${icon("check", 16)} Solve an exercise with executable checks.</p><p>${icon("check", 16)} Answer a question about why it works.</p><p>${icon("check", 16)} Revisit it before it fades.</p><div class="principle-foot">Tests are evidence of this exercise—not a guarantee of professional mastery.</div></aside></div><div class="section-heading section-space"><div><div class="eyebrow">A PATH THAT GROWS WITH YOU</div><h2>Build foundations. Then go deeper.</h2></div><a href="#path" class="text-link">Explore all ${modules.length} chapters ${icon("arrow", 15)}</a></div><div class="module-grid">${[activeModule, ...modules.filter((m) => m.id !== activeModule.id)].slice(0, 3).map(moduleCard).join("")}</div>${state.legacyCompleted.length ? '<div class="alert">Your previous notes and code were preserved. The upgraded curriculum uses new assessments, so earlier completion clicks do not count as verified exercises.</div>' : ""}`;
  }
  function pathPage(id) {
    if (id && moduleById[id]) {
      const m = moduleById[id],
        items = moduleLessons(id);
      return `<a class="back-link" href="#path">← All chapters</a>${heading(m.level.toUpperCase(), e(m.title), e(m.description))}<div class="card module-summary"><span>${items.length} lessons</span><span>${Math.round((items.reduce((n, l) => n + l.minutes, 0) / 60) * 10) / 10} hours of guided lessons, plus practice</span><span>${percentage(items)}% verified</span></div>${m.prerequisites.length ? `<div class="alert">Recommended preparation: ${m.prerequisites.map((id) => `<a href="#path/${id}">${e(moduleById[id].title)}</a>`).join(" · ")}. You can explore ahead; take time to fill gaps.</div>` : ""}<section class="card lesson-list">${items.map(lessonRow).join("")}</section>`;
    }
    return `${heading("YOUR SOFTWARE ENGINEERING PATH", 'From first steps to real systems<span class="green">.</span>', `${lessons.length} authored lessons across ${modules.length} chapters. Follow the sequence or explore a topic when you need it.`)}<div class="catalog-search"><label class="search-field">${icon("search", 18)}<input id="lesson-search" type="search" placeholder="Search lessons, skills, or a concept…" value="${e(query)}" aria-label="Search the curriculum"></label><select id="module-filter" aria-label="Filter by chapter"><option value="">All chapters</option>${modules.map((m) => `<option value="${m.id}" ${moduleFilter === m.id ? "selected" : ""}>${e(m.title)}</option>`).join("")}</select></div><div id="catalog-results">${catalogResults()}</div><div class="alert"><strong>How to use this path:</strong> progress comes from passing exercises and explaining decisions, not from rushing through pages. The course builds engineering foundations; production expertise also requires sustained project work, collaboration, and real deployments.</div>`;
  }
  function catalogResults() {
    if (query || moduleFilter) {
      const matches = lessons.filter(
        (l) =>
          (!moduleFilter || l.module === moduleFilter) &&
          (l.title + " " + l.concept + " " + moduleById[l.module].title)
            .toLowerCase()
            .includes(query.toLowerCase().trim()),
      );
      return `<p class="muted" role="status">${matches.length} lessons found</p><section class="card lesson-list">${matches.length ? matches.map(lessonRow).join("") : '<div class="empty-state"><h2>No matching lessons</h2><p>Try a broader topic such as functions, data, or HTTP.</p></div>'}</section>`;
    }
    return `<div class="module-grid">${modules.map(moduleCard).join("")}</div>`;
  }
  function tabs(type, item, step) {
    const entries =
      type === "project"
        ? [
            ["learn", "Project brief"],
            ["lab", "Build & test"],
            ["check", "Review & submit"],
          ]
        : [
            ["learn", "Understand"],
            ["lab", "Practice"],
            ["check", "Check understanding"],
            ["reflect", "Reflect"],
          ];
    return `<nav class="workspace-tabs" aria-label="${type === "project" ? "Project" : "Lesson"} sections">${entries.map(([id, label], i) => `<a href="#${type}/${item.id}/${id}" class="${step === id ? "active" : ""}" ${step === id ? 'aria-current="step"' : ""}><span>${i + 1}</span>${label}</a>`).join("")}</nav>`;
  }
  function itemHeader(item, type) {
    return `<a class="back-link" href="#${type === "project" ? "projects" : "path/" + item.module}">← ${type === "project" ? "Project studio" : e(moduleById[item.module].title)}</a><div class="workspace-heading"><div><div class="eyebrow">${type === "project" ? "INTEGRATED PROJECT" : e(item.language.toUpperCase()) + " · " + item.minutes + " MIN GUIDED LESSON"}</div><h1>${e(item.title)}</h1></div><button class="icon-button bookmark ${state.bookmarks.includes(item.id) ? "selected" : ""}" data-action="bookmark" data-id="${item.id}" aria-label="${state.bookmarks.includes(item.id) ? "Remove bookmark" : "Bookmark this " + type}" aria-pressed="${state.bookmarks.includes(item.id)}">${icon("bookmark")}</button></div>`;
  }
  function lessonPage(id, step) {
    const item = lessonById[id];
    if (!item) return notFound();
    if (!["learn", "lab", "check", "reflect"].includes(step)) step = "learn";
    return `${itemHeader(item, "lesson")}${tabs("lesson", item, step)}${step === "learn" ? `<div class="lesson-grid"><article class="card reading-card"><span class="pill">THE BIG IDEA</span><h2>${e(item.concept)}</h2><p>${e(item.explanation)}</p>${codeBlock(item.example, item.language === "scenario" ? "Concept" : item.language)}<h3>Walk through the example</h3><p>${e(item.breakdown)}</p><h3>Make a prediction first</h3><p>Before running anything, write down what you expect. Trace the values one step at a time. Change one input and explain how that should change the result.</p><a class="button primary" href="#lesson/${id}/lab">Try the independent exercise ${icon("arrow", 18)}</a></article><aside class="lesson-aside"><section class="card"><div class="eyebrow">YOUR LEARNING CHECKPOINT</div><h3>Can you explain it?</h3><p>${e(item.recall)}</p><div class="divider"></div><strong>When you get stuck</strong><p>Read the error. Find the smallest failing case. Test one change. Use hints before the reference solution.</p></section><section class="card"><h3>Go to the source</h3><p>Use documentation to understand details and build independent research habits.</p><a href="${e(item.resource.url)}" target="_blank" rel="noopener noreferrer" class="text-link">${e(item.resource.label)} ↗</a></section></aside></div>` : step === "lab" ? lab(item) : step === "check" ? knowledgeCheck(item) : reflection(item)}`;
  }
  function lab(item) {
    const challenge = item.challenge;
    const source = challengeSource(state, item),
      result = results[item.id],
      passed = hasEvidence(state, item);
    return `<div class="lab-grid"><section class="card exercise-card"><div class="section-heading"><span class="pill">${challenge.language === "scenario" ? "APPLY YOUR JUDGMENT" : "INDEPENDENT EXERCISE"}</span><span class="evidence-tag ${passed ? "passed" : ""}">${passed ? "✓ Current solution verified" : "Practice → test → improve"}</span></div><h2>${e(challenge.title || item.title)}</h2><p>${e(challenge.prompt)}</p>${challenge.schema ? `<details class="schema-details"><summary>Inspect the starting database</summary><pre><code>${e(challenge.schema)}</code></pre></details>` : ""}${challenge.language === "scenario" ? `<div class="scenario-questions">${challenge.questions.map((q, i) => `<fieldset><legend>${i + 1}. ${e(q.question)}</legend>${q.choices.map((choice, j) => `<label class="answer-option"><input type="radio" name="scenario-${i}" data-scenario="${i}" value="${j}" ${state.scenario[item.id]?.[i] === j ? "checked" : ""}><span>${e(choice)}</span></label>`).join("")}</fieldset>`).join("")}</div>` : `<div class="editor-heading"><label for="code-editor">Your ${challenge.language.toUpperCase()} solution</label><div><button class="text-link" data-action="reset-code" data-id="${item.id}">Reset starter</button><button class="text-link" data-action="export-code" data-id="${item.id}">Download code</button></div></div><textarea id="code-editor" class="code-editor" aria-describedby="editor-help" spellcheck="false" autocapitalize="off" autocomplete="off">${e(source)}</textarea><p id="editor-help" class="editor-help">Tab inserts spaces. Ctrl/⌘ + Enter runs your code. ${challenge.language === "python" ? "Python runs in your browser. Use fixed values instead of input(). Each run starts fresh." : challenge.language === "sql" ? "A fresh SQLite database is created for each run." : "Your code runs separately from the learning interface."}</p>`}<div class="runner-toolbar">${challenge.language === "scenario" ? "" : `<button class="button secondary" data-action="run" data-id="${item.id}">${icon("play", 16)} ${challenge.language === "html" ? "Preview page" : "Run code"}</button>`}<button class="button primary" data-action="test" data-id="${item.id}">${icon("check", 17)} ${challenge.language === "scenario" ? "Check decisions" : "Test my solution"}</button><button class="text-link" data-action="stop">Stop</button></div><div id="runner-status" role="status" class="runner-status">${passed ? "Your current solution passed all checks." : result ? "Your last result is below." : "Make a prediction, then try your solution."}</div><div id="test-results">${renderResult(result)}</div><div id="preview-slot"></div><a href="#${projectById[item.id] ? "project" : "lesson"}/${item.id}/check" class="button secondary continue-check">${projectById[item.id] ? "Review your project" : "Check your understanding"} ${icon("arrow", 16)}</a></section><aside class="lesson-aside"><section class="card"><div class="eyebrow">BUILD A PLAN</div><h3>Before you code</h3><ol class="plain-steps"><li>Identify the inputs and expected output.</li><li>Work through one example by hand.</li><li>Think about empty, boundary, and invalid cases.</li><li>Build the smallest working version.</li></ol></section><section class="card hints"><h3>A nudge, not the answer</h3>${(challenge.hints || []).map((hint, i) => `<details><summary>Hint ${i + 1}</summary><p>${e(hint)}</p></details>`).join("")}<button class="text-link solution-button" data-action="solution" data-id="${item.id}">${revealed.has(item.id) ? "Hide reference solution" : "Compare a reference solution"}</button><div id="reference-solution">${revealed.has(item.id) ? referenceSolution(item) : ""}</div></section><section class="card"><h3>What these checks prove</h3><p>They verify the stated cases, not every possible behavior. Explain your approach, test additional inputs, and review the project’s real-world limitations.</p></section></aside></div>`;
  }
  function referenceSolution(item) {
    const c = item.challenge;
    return c.language === "scenario"
      ? "<p>Use the feedback under each decision to understand the reasoning.</p>"
      : `<p class="small muted">Read to understand, then close this and rebuild it yourself. Passing with assistance is practice, not independent mastery.</p><pre class="reference-code"><code>${e(c.solution)}</code></pre>`;
  }
  function renderResult(result) {
    if (!result) return "";
    return `${result.error ? `<div class="alert error"><strong>${result.cancelled ? "Execution stopped" : "Something needs attention"}</strong><pre>${e(result.error)}</pre></div>` : ""}${result.tests?.length ? `<div class="test-report"><div class="test-report-title"><strong>${result.tests.filter((t) => t.passed).length} / ${result.tests.length} checks passed</strong><span>${result.tests.every((t) => t.passed) ? "Ready for the next step" : "Use the feedback and try again"}</span></div>${result.tests.map((t) => `<details class="test-case ${t.passed ? "passed" : "failed"}"><summary><span>${t.passed ? "✓" : "×"}</span>${e(t.name)}</summary><p>${e(t.detail || "")}</p></details>`).join("")}</div>` : ""}${result.table ? `<div class="output-panel"><div class="code-caption">QUERY RESULT</div><div class="table-scroll"><table><thead><tr>${result.table.columns.map((c) => `<th>${e(c)}</th>`).join("")}</tr></thead><tbody>${result.table.values.map((row) => `<tr>${row.map((v) => `<td>${v === null ? '<span class="muted">NULL</span>' : e(v)}</td>`).join("")}</tr>`).join("")}</tbody></table>${!result.table.values.length ? "<p>No rows returned.</p>" : ""}</div></div>` : result.output ? `<div class="output-panel"><div class="code-caption">PROGRAM OUTPUT</div><pre>${e(result.output)}</pre></div>` : ""}`;
  }
  function knowledgeCheck(l) {
    const chosen = state.quiz[l.id],
      correct = chosen === l.quiz.answer,
      ready = canComplete(state, l);
    return `<section class="card check-card"><span class="pill">REASON ABOUT THE CONCEPT</span><h2>${e(l.quiz.question)}</h2><fieldset class="quiz-options"><legend class="sr-only">Choose your answer</legend>${l.quiz.choices.map((choice, i) => `<label class="answer-option ${chosen === i ? "chosen" : ""}"><input type="radio" name="knowledge" data-quiz="${l.id}" value="${i}" ${chosen === i ? "checked" : ""}><span class="answer-letter">${String.fromCharCode(65 + i)}</span><span>${e(choice)}</span></label>`).join("")}</fieldset>${chosen !== undefined ? `<div class="alert ${correct ? "success" : "warning"}" role="status"><strong>${correct ? "That’s right." : "Not yet. Revisit the reasoning."}</strong> ${e(l.quiz.why)}</div>` : ""}<div class="completion-checklist"><div>${hasEvidence(state, l) ? "✓" : "○"} Independent exercise checks passed for your current solution</div><div>${correct ? "✓" : "○"} Knowledge check answered correctly</div></div>${!hasEvidence(state, l) ? `<p class="muted">Your exercise still needs a verified solution. <a href="#lesson/${l.id}/lab">Return to the practice workspace →</a></p>` : ""}<button class="button primary" data-action="complete" data-id="${l.id}" ${ready ? "" : "disabled"}>${state.completed[l.id] ? "Lesson verified — continue" : "Verify this lesson"} ${icon("check", 17)}</button><p class="small muted">Reflection is encouraged, but its length is not used as a measure of understanding.</p></section>`;
  }
  function reflection(item) {
    return `<section class="card reflection-card"><span class="pill">PUT IT INTO YOUR OWN WORDS</span><h2>${e(item.recall || "Explain your solution, tradeoffs, and remaining limitations.")}</h2><p>Write as if you’re teaching a friend. Include an example, a mistake you fixed, and one question you still have. Your notes are saved automatically.</p><label for="reflection">Your reflection</label><textarea id="reflection" class="reflection-editor" data-note="${item.id}" placeholder="Here is how I would explain it…">${e(state.notes[item.id] || "")}</textarea><div class="note-footer"><span data-save-status>${e(statusText())}</span><a class="text-link" href="#notes">Open notebook →</a></div></section>`;
  }
  function projectsPage() {
    return `${heading("BUILD SOMETHING WORTH EXPLAINING", 'Your project studio<span class="green">.</span>', "Six integrated projects with acceptance criteria, runnable checks, and a deliberate engineering review.")}<div class="projects-grid">${projects.map((p, i) => `<a class="project-card card" href="#project/${p.id}"><div class="project-art art-${i % 3}"><span>${String(i + 1).padStart(2, "0")}</span>${icon(["insights", "cloud", "code", "search", "review", "book"][i], 48)}<small>${p.language.toUpperCase()}</small></div><div class="project-copy"><div class="eyebrow">${p.hours} HOURS · ${state.projectCompleted[p.id] ? "COMPLETED" : "INTEGRATED PROJECT"}</div><h2>${e(p.title)}</h2><p>${e(p.subtitle)}</p><div class="module-bottom"><span>${p.challenge.tests.length} executable checks</span>${icon("arrow", 18)}</div></div></a>`).join("")}</div><div class="alert">These projects are implemented in the browser lab. API and systems projects model important engineering contracts; running a production service additionally requires deployment, durable infrastructure, and operational validation.</div>`;
  }
  function projectPage(id, step) {
    const p = projectById[id];
    if (!p) return notFound();
    if (!["learn", "lab", "check"].includes(step)) step = "learn";
    return `${itemHeader(p, "project")}${tabs("project", p, step)}${step === "lab" ? lab(p) : step === "learn" ? `<div class="lesson-grid"><article class="card reading-card"><span class="pill">THE PROJECT BRIEF</span><h2>${e(p.subtitle)}</h2><p>${e(p.brief)}</p><h3>Acceptance criteria</h3><ol class="plain-steps">${p.requirements.map((t) => `<li>${e(t)}</li>`).join("")}</ol><h3>Your delivery plan</h3><p>First describe the contract. Build a minimal working implementation, then test the edge cases. Finally review readability, privacy, and failure behavior before writing your explanation.</p><a href="#project/${id}/lab" class="button primary">Open the project workspace ${icon("arrow", 17)}</a></article><aside class="lesson-aside"><section class="card"><h3>Recommended preparation</h3>${p.modules.map((id) => `<a class="resource-link" href="#path/${id}">${e(moduleById[id].title)} →</a>`).join("")}<div class="divider"></div><p>${p.hours} hours is a rough practice estimate. Take the time you need to understand the solution.</p></section></aside></div>` : `<section class="card check-card"><span class="pill">ENGINEERING REVIEW</span><h2>Working code is the start.</h2><p>Review these criteria honestly. Automated checks cover behavior; the review below is your own assessment of clarity, usability, and limitations.</p><div class="completion-checklist"><div>${hasEvidence(state, p) ? "✓" : "○"} All executable checks pass for the current solution</div></div>${p.rubric.map((text, i) => `<label class="rubric-option"><input type="checkbox" data-rubric="${i}" ${state.rubrics[id]?.[i] ? "checked" : ""}><span>${e(text)}</span></label>`).join("")}<label for="project-notes">Project README & engineering notes</label><textarea id="project-notes" data-note="${id}" class="reflection-editor" placeholder="Problem, contract, approach, test cases, tradeoffs, and limitations…">${e(state.notes[id] || "")}</textarea><div class="runner-toolbar"><button class="button primary" id="complete-project" data-action="complete-project" data-id="${id}" ${canCompleteProject(state, p) ? "" : "disabled"}>Complete project ${icon("check", 17)}</button><button class="button secondary" data-action="export-project" data-id="${id}">Export project files</button></div></section>`}`;
  }
  function practicePage(id) {
    const stats = activitySummary(state);
    if (id && lessonById[id] && state.completed[id]) {
      const l = lessonById[id],
        answer = reviewAnswers[id];
      return `<a class="back-link" href="#practice">← All reviews</a>${heading("RETRIEVAL BEFORE RE-READING", e(l.title), "Try from memory first. Struggling a little is part of making the knowledge stick.")}<section class="card check-card"><h2>${e(l.recall)}</h2><label for="review-scratch">Explain it without looking</label><textarea id="review-scratch" class="reflection-editor" placeholder="Use your own words. This temporary scratch space is not graded."></textarea><details class="recall-reveal"><summary>Compare with the concept and your previous note</summary><p>${e(l.explanation)}</p><blockquote>${e(state.notes[id] || "You have not written a reflection for this lesson yet.")}</blockquote></details><h3>${e(l.quiz.question)}</h3>${l.quiz.choices.map((c, i) => `<button class="review-answer ${answer === i ? "chosen" : ""}" data-action="review-answer" data-id="${id}" data-index="${i}">${e(c)}</button>`).join("")}${answer !== undefined ? `<div class="alert ${answer === l.quiz.answer ? "success" : "warning"}">${e(l.quiz.why)}</div>` : ""}<div class="runner-toolbar"><button class="button secondary" data-action="review-again" data-id="${id}">I need more practice</button><button class="button primary" data-action="review-good" data-id="${id}" ${answer === l.quiz.answer ? "" : "disabled"}>I recalled it clearly ${icon("check", 16)}</button></div><p class="small muted">“Need more practice” schedules a review in 10 minutes. Successful reviews gradually move farther apart.</p></section>`;
    }
    const completed = lessons.filter((l) => state.completed[l.id]);
    return `${heading("UNDERSTANDING THAT LASTS", 'Practice & recall<span class="green">.</span>', "Revisit ideas before they fade. Due dates adapt to your recall, not just your attendance.")}<div class="review-summary"><div class="card"><strong>${stats.due.length}</strong><span>Ready to review</span></div><div class="card"><strong>${completed.length}</strong><span>Lessons in your review collection</span></div></div>${
      completed.length
        ? `<section class="card lesson-list">${[...completed]
            .sort(
              (a, b) =>
                (state.reviews[a.id]?.due || 0) -
                (state.reviews[b.id]?.due || 0),
            )
            .map(
              (l) =>
                `<a class="lesson-row" href="#practice/${l.id}"><span class="lesson-state">${icon("review", 17)}</span><div><strong>${e(l.title)}</strong><small>${stats.due.includes(l.id) ? "Ready now" : "Next review " + new Date(state.reviews[l.id]?.due || Date.now()).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</small></div><span class="row-tail">Practice ${icon("arrow", 15)}</span></a>`,
            )
            .join("")}</section>`
        : empty(
            "Your review collection starts with one verified lesson.",
            "Complete the exercise and knowledge check in your first lesson. Then come back to practice recalling it.",
            "#lesson/" + lessons[0].id,
            "Start learning",
          )
    }`;
  }
  function notesPage() {
    const entries = Object.entries(state.notes).filter(([, text]) =>
      text.trim(),
    );
    return `${heading("YOUR UNDERSTANDING, IN YOUR WORDS", 'My notebook<span class="green">.</span>', "Your reflections and project decisions, kept together as you grow.", `<button class="button secondary" data-action="export-notes">${icon("download", 16)} Export notebook</button>`)}${
      entries.length
        ? entries
            .map(([id, note]) => {
              const item = lessonById[id] || projectById[id];
              return `<section class="card note-card"><div class="section-heading"><h2>${e(item.title)}</h2><a class="text-link" href="#${projectById[id] ? "project" : "lesson"}/${id}/${projectById[id] ? "check" : "reflect"}">Open workspace →</a></div><label class="sr-only" for="note-${id}">${e(item.title)} notes</label><textarea id="note-${id}" data-note="${id}" class="note-textarea">${e(note)}</textarea><span class="small muted" data-save-status>${e(statusText())}</span></section>`;
            })
            .join("")
        : empty(
            "A notebook filled with your own explanations.",
            "Write a reflection in a lesson or add engineering notes to a project. They will appear here.",
            "#path",
            "Find a lesson",
          )
    }<section class="section-space"><div class="section-heading"><h2>Saved for later</h2><span class="tag">${state.bookmarks.length} BOOKMARKS</span></div>${state.bookmarks.length ? `<section class="card lesson-list">${state.bookmarks.map((id) => (lessonById[id] ? lessonRow(lessonById[id]) : `<a class="lesson-row" href="#project/${id}">${icon("bookmark", 18)}<strong>${e(projectById[id].title)}</strong></a>`)).join("")}</section>` : '<p class="muted">Use the bookmark button in a lesson or project to find it again here.</p>'}</section>`;
  }
  function insightsPage() {
    const stats = activitySummary(state),
      attempts = state.activities.filter((a) => a.type === "attempt"),
      days = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const day = localDay(d),
        count = state.activities.filter((a) => localDay(a.at) === day).length;
      days.push({ day, count });
    }
    return `${heading("EVIDENCE OF YOUR PROGRESS", 'Look how far you’re going<span class="green">.</span>', "A clear view of practice, completed work, and the skills that still need attention.")}<section class="stats-grid"><div class="stat-card"><div><strong>${stats.streak}<small> days</small></strong><p>Current activity streak</p></div></div><div class="stat-card"><div><strong>${stats.activeDays}</strong><p>Days with real learning activity</p></div></div><div class="stat-card"><div><strong>${stats.focusMinutes}<small> min</small></strong><p>Logged focus time</p></div></div><div class="stat-card"><div><strong>${attempts.length}</strong><p>Assessment attempts</p></div></div></section><section class="card"><div class="section-heading"><div><div class="eyebrow">CONSISTENCY OVER PERFECTION</div><h2>Your last 12 weeks</h2></div><span class="small muted">Practice, reviews, projects, and focus sessions</span></div><div class="activity-heatmap" aria-label="Daily learning activity">${days.map((d) => `<div class="heat-cell level-${Math.min(d.count, 3)}" title="${d.day}: ${d.count} learning actions" role="img" aria-label="${d.day}: ${d.count} learning actions"></div>`).join("")}</div><p class="small muted">A day counts when you attempt an assessment, complete work, review an idea, or log a focus session. Opening the app alone does not count.</p></section><section class="card section-space"><div class="section-heading"><h2>Your skills, chapter by chapter</h2><span class="small muted">Verified exercises + knowledge checks</span></div>${modules
      .map((m) => {
        const items = moduleLessons(m.id),
          done = items.filter((l) => state.completed[l.id]).length;
        return `<a class="skill-row" href="#path/${m.id}"><span>${e(m.title)}</span><div class="progress-track"><span style="width:${(done / items.length) * 100}%"></span></div><strong>${done}/${items.length}</strong></a>`;
      })
      .join(
        "",
      )}</section><div class="alert">These measures describe work completed inside Stepwise. They are not a certificate, job guarantee, or a substitute for independent projects and real-world feedback.</div>`;
  }
  function settingsPage() {
    return `${heading("A SPACE THAT WORKS FOR YOU", 'Account & settings<span class="green">.</span>', "Keep your progress private, make a backup, and choose a sustainable learning rhythm.")}<div class="settings-grid"><section class="card"><div class="section-heading"><h2>Private cross-device sync</h2>${icon("cloud", 22)}</div>${!cloudConfigured ? `<div class="alert warning"><strong>Cloud connection is not configured yet.</strong><p>Your learning works on this device, but automatic cross-device sync needs the hosted account service to be connected. No login or cloud-save claim is being made.</p></div><p>The account integration and private database rules are included with the app. The owner must connect the Supabase project and redeploy. Until then, use backups to move progress between devices.</p>` : user ? `<div class="account-detail"><span class="avatar">${e((user.email || "U")[0].toUpperCase())}</span><div><strong>${e(user.email || "Signed in")}</strong><span data-save-status>${e(statusText())}</span></div></div>${syncStatus === "error" ? `<div class="alert error">${e(syncError)} Your device copy is preserved.</div>` : ""}${sync?.conflict ? `<div class="alert warning"><strong>Choose which progress to keep</strong><p>Cloud and device copies differ. Download both before choosing. “Keep device” writes your current device copy to the cloud; “Keep cloud” replaces this account’s device copy.</p><div class="runner-toolbar"><button class="button secondary" data-action="download-conflicts">Download both versions</button><button class="button secondary" data-action="keep-cloud">Keep cloud version</button><button class="button primary" data-action="keep-device">Keep device version</button></div></div>` : ""}<div class="runner-toolbar"><button class="button secondary" data-action="sync-now">Sync now</button><button class="text-link" data-action="signout">Sign out</button></div><p class="small muted">This account has its own device storage. Use a backup to import progress from your local-only workspace.</p>` : `<p>Sign in to keep a private copy of your progress across devices. Your local-only workspace remains separate; export it first if you want to import its progress after signing in.</p><form id="login-form"><label for="email">Email address</label><input id="email" type="email" autocomplete="email" required placeholder="you@example.com"><button class="button primary" type="submit">Send secure sign-in link ${icon("arrow", 16)}</button><p class="small muted">Open the email link in the same browser where you requested it. No password is stored by this app.</p></form><div id="auth-status" role="status"></div>`}</section><section class="card"><h2>Your preferences</h2><label for="display-name">What should we call you?</label><input id="display-name" maxlength="50" value="${e(state.name)}" placeholder="Your first name"><label for="daily-goal">Daily focus goal</label><select id="daily-goal">${[15, 20, 30, 45, 60, 90].map((n) => `<option value="${n}" ${state.goal === n ? "selected" : ""}>${n} minutes</option>`).join("")}</select><label for="theme">Appearance</label><select id="theme">${["light", "dark", "system"].map((t) => `<option ${state.theme === t ? "selected" : ""}>${t}</option>`).join("")}</select><label for="font-size">Reading size</label><select id="font-size"><option value="normal" ${state.fontSize === "normal" ? "selected" : ""}>Standard</option><option value="large" ${state.fontSize === "large" ? "selected" : ""}>Larger text</option></select><p class="small muted">A repeatable routine beats an unsustainable sprint. Your goal can change whenever you need.</p></section><section class="card"><h2>Back up your learning</h2><p>Download a portable copy of your progress, code, reflections, bookmarks, and review schedule. Back up before clearing browser data or replacing progress.</p><button class="button primary" data-action="export-backup">${icon("download", 17)} Download progress backup</button><label for="import-backup">Restore from a Stepwise backup</label><input id="import-backup" type="file" accept="application/json,.json"><p class="small muted">You will see a summary before replacing anything. Older Stepwise backups are supported; old completion clicks are retained as history rather than new assessment credit.</p><div id="import-status" role="status"></div></section><section class="card"><h2>How your learning data works</h2><ul class="plain-steps"><li>Local work is stored in this browser and may be removed when you clear site data.</li><li>When configured and signed in, cloud access is restricted to your account.</li><li>Conflicting saves are surfaced; another device’s work is not silently overwritten.</li><li>Your code executes locally. Python and SQL start with fresh in-memory state on each run.</li><li>Reference solutions and test cases are learning aids, not tamper-proof certification.</li></ul><a href="#insights" class="text-link">See what progress metrics measure →</a></section></div>`;
  }
  function empty(title, description, href, label) {
    return `<section class="card empty-state">${icon("book", 40)}<h2>${e(title)}</h2><p>${e(description)}</p><a class="button primary" href="${href}">${e(label)} ${icon("arrow", 16)}</a></section>`;
  }
  function notFound() {
    return empty(
      "This workspace could not be found.",
      "Your learning progress is still here. Choose a lesson from the path.",
      "#path",
      "Back to the learning path",
    );
  }
  function render() {
    runner.cancel();
    flushLocal();
    applyPreferences();
    const r = route();
    let content;
    switch (r.page) {
      case "home":
        content = home();
        break;
      case "path":
        content = pathPage(r.id);
        break;
      case "lesson":
        content = lessonPage(r.id, r.step);
        break;
      case "projects":
        content = projectsPage();
        break;
      case "project":
        content = projectPage(r.id, r.step);
        break;
      case "practice":
        content = practicePage(r.id);
        break;
      case "notes":
        content = notesPage();
        break;
      case "insights":
        content = insightsPage();
        break;
      case "settings":
        content = settingsPage();
        break;
      default:
        content = notFound();
    }
    app.innerHTML = shell(content);
    bindInputs();
    document.title =
      (currentItem()?.title || "Your learning space") + " · Stepwise";
    updateSaveStatus();
  }
  async function runAssessment(item, test) {
    const source = challengeSource(state, item),
      fingerprint = codeFingerprint(source),
      challenge = item.challenge,
      routeAtStart = location.hash;
    document
      .querySelectorAll('[data-action="run"],[data-action="test"]')
      .forEach((b) => (b.disabled = true));
    const status = document.querySelector("#runner-status");
    if (status) status.textContent = "Checking your work…";
    const result =
      challenge.language === "scenario"
        ? assessScenario(challenge, state.scenario[item.id] || [])
        : await runner.run(challenge, source, {
            test,
            onStatus: (text) => {
              if (
                location.hash === routeAtStart &&
                document.querySelector("#runner-status")
              )
                document.querySelector("#runner-status").textContent = text;
            },
            preview: document.querySelector("#preview-slot"),
          });
    if (result.cancelled) return;
    results[item.id] = result;
    if (test) {
      const count =
        challenge.language === "scenario"
          ? challenge.questions.length
          : challenge.tests.length;
      const passed =
        allPassed(result, count) &&
        fingerprint === codeFingerprint(challengeSource(state, item));
      state.activities.push({
        type: "attempt",
        id: item.id,
        at: Date.now(),
        passed,
      });
      if (passed)
        state.evidence[item.id] = {
          hash: fingerprint,
          passedAt: Date.now(),
          caseCount: count,
        };
      else delete state.evidence[item.id];
      persist();
    }
    if (location.hash !== routeAtStart) return;
    document
      .querySelectorAll('[data-action="run"],[data-action="test"]')
      .forEach((b) => (b.disabled = false));
    document.querySelector("#test-results").innerHTML = renderResult(result);
    document.querySelector("#runner-status").textContent = result.ok
      ? test
        ? hasEvidence(state, item)
          ? "All checks passed. Now explain the concept in the next step."
          : "Some checks need attention. Read the feedback, change one thing, and try again."
        : "Run finished. Compare the output with your prediction."
      : "The program needs a fix. Read the error below.";
    const badge = document.querySelector(".evidence-tag");
    if (badge) {
      badge.textContent = hasEvidence(state, item)
        ? "✓ Current solution verified"
        : "Practice → test → improve";
      badge.classList.toggle("passed", hasEvidence(state, item));
    }
  }
  function bindInputs() {
    const search = document.querySelector("#lesson-search");
    if (search)
      search.oninput = () => {
        query = search.value;
        document.querySelector("#catalog-results").innerHTML = catalogResults();
      };
    const filter = document.querySelector("#module-filter");
    if (filter)
      filter.onchange = () => {
        moduleFilter = filter.value;
        document.querySelector("#catalog-results").innerHTML = catalogResults();
      };
    const editor = document.querySelector("#code-editor");
    if (editor) {
      editor.oninput = () => {
        const item = currentItem();
        state.drafts[item.id] = editor.value;
        saveSoon();
        const badge = document.querySelector(".evidence-tag");
        if (badge) {
          badge.textContent = hasEvidence(state, item)
            ? "✓ Current solution verified"
            : "Edited — run checks again";
          badge.classList.toggle("passed", hasEvidence(state, item));
        }
      };
      editor.onkeydown = (event) => {
        if (event.key === "Tab") {
          event.preventDefault();
          const start = editor.selectionStart,
            end = editor.selectionEnd;
          editor.setRangeText("    ", start, end, "end");
          editor.dispatchEvent(new Event("input"));
        }
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          runAssessment(currentItem(), false);
        }
      };
    }
    document.querySelectorAll("[data-note]").forEach(
      (n) =>
        (n.oninput = () => {
          state.notes[n.dataset.note] = n.value;
          saveSoon();
        }),
    );
    document.querySelectorAll("[data-scenario]").forEach(
      (n) =>
        (n.onchange = () => {
          const id = currentItem().id;
          state.scenario[id] ||= [];
          state.scenario[id][Number(n.dataset.scenario)] = Number(n.value);
          persist();
        }),
    );
    document.querySelectorAll("[data-quiz]").forEach(
      (n) =>
        (n.onchange = () => {
          state.quiz[n.dataset.quiz] = Number(n.value);
          persist();
          render();
        }),
    );
    document.querySelectorAll("[data-rubric]").forEach(
      (n) =>
        (n.onchange = () => {
          const item = currentItem();
          state.rubrics[item.id] ||= [];
          state.rubrics[item.id][Number(n.dataset.rubric)] = n.checked;
          persist();
          document.querySelector("#complete-project").disabled =
            !canCompleteProject(state, item);
        }),
    );
    for (const [selector, field] of [
      ["#display-name", "name"],
      ["#daily-goal", "goal"],
      ["#theme", "theme"],
      ["#font-size", "fontSize"],
    ]) {
      const n = document.querySelector(selector);
      if (n)
        n.addEventListener(
          selector === "#display-name" ? "input" : "change",
          () => {
            state[field] = field === "goal" ? Number(n.value) : n.value;
            persist();
            applyPreferences();
          },
        );
    }
    const upload = document.querySelector("#import-backup");
    if (upload)
      upload.onchange = async () => {
        const status = document.querySelector("#import-status");
        try {
          const file = upload.files[0];
          if (!file) return;
          if (file.size > 5000000)
            throw new Error("Choose a backup smaller than 5 MB.");
          const restored = parseBackup(await file.text());
          showDialog(
            "Restore your progress?",
            `<p>This backup contains <strong>${Object.keys(restored.completed).length} verified lessons</strong>, ${Object.keys(restored.notes).length} notes, and ${Object.keys(restored.drafts).length} saved programs.</p><p>Restoring replaces this workspace’s progress. Download your current backup first if you need both copies.</p>`,
            [
              {
                label: "Download current backup",
                action: () =>
                  download(
                    "stepwise-before-restore.json",
                    JSON.stringify(exportBackup(state), null, 2),
                    "application/json",
                  ),
                close: false,
              },
              { label: "Cancel" },
              {
                label: "Restore backup",
                primary: true,
                action: () => {
                  state = restored;
                  persist();
                  render();
                  notify(
                    "Backup restored. Your learning path and notes are updated.",
                  );
                },
              },
            ],
          );
        } catch (error) {
          status.textContent = error.message;
        }
      };
    const form = document.querySelector("#login-form");
    if (form)
      form.onsubmit = async (event) => {
        event.preventDefault();
        const button = form.querySelector("button"),
          status = document.querySelector("#auth-status");
        button.disabled = true;
        status.textContent = "Requesting your secure sign-in link…";
        try {
          const { error } = await cloudClient().auth.signInWithOtp({
            email: form.querySelector("input").value.trim(),
            options: { emailRedirectTo: location.origin + "/#settings" },
          });
          if (error) throw error;
          status.textContent =
            "Check your inbox. Open the sign-in link in this browser, then return to Stepwise.";
        } catch (error) {
          status.textContent = "Sign-in could not start: " + error.message;
        } finally {
          button.disabled = false;
        }
      };
  }
  function showDialog(title, body, actions) {
    const dialog = document.createElement("dialog");
    dialog.className = "app-dialog";
    dialog.innerHTML = `<h2>${e(title)}</h2>${body}<div class="dialog-actions">${actions.map((a, i) => `<button class="button ${a.primary ? "primary" : "secondary"}" data-dialog-index="${i}">${e(a.label)}</button>`).join("")}</div>`;
    document.body.append(dialog);
    dialog.addEventListener("close", () => dialog.remove());
    dialog.querySelectorAll("button").forEach(
      (b) =>
        (b.onclick = async () => {
          const a = actions[Number(b.dataset.dialogIndex)];
          if (a.action) await a.action();
          if (a.close !== false) dialog.close();
        }),
    );
    dialog.showModal();
  }
  function focusTime() {
    const seconds = Math.max(0, Math.ceil((focus.ends - Date.now()) / 1000));
    return (
      Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0")
    );
  }
  function finishFocus() {
    if (!focus.running) return;
    const minutes = Math.max(
      0,
      Math.min(state.goal, Math.floor((Date.now() - focus.started) / 60000)),
    );
    focus.running = false;
    if (minutes) {
      state.activities.push({ type: "focus", at: Date.now(), minutes });
      persist();
      notify(
        `${minutes} focused minute${minutes === 1 ? "" : "s"} added to your learning activity.`,
      );
    } else
      notify(
        "Session stopped. Focus time is logged after at least one minute.",
      );
    render();
  }
  app.addEventListener("click", async (event) => {
    const b = event.target.closest("[data-action]");
    if (!b) return;
    const action = b.dataset.action,
      id = b.dataset.id,
      item = lessonById[id] || projectById[id];
    if (action === "menu") {
      mobileOpen = !mobileOpen;
      document
        .querySelector(".sidebar")
        .classList.toggle("is-open", mobileOpen);
      b.setAttribute("aria-expanded", String(mobileOpen));
    }
    if (action === "bookmark") {
      state.bookmarks = state.bookmarks.includes(id)
        ? state.bookmarks.filter((x) => x !== id)
        : [...state.bookmarks, id];
      persist();
      b.classList.toggle("selected");
      b.setAttribute("aria-pressed", String(state.bookmarks.includes(id)));
      b.setAttribute(
        "aria-label",
        state.bookmarks.includes(id) ? "Remove bookmark" : "Bookmark this item",
      );
      notify(
        state.bookmarks.includes(id)
          ? "Saved to your notebook bookmarks."
          : "Bookmark removed.",
      );
    }
    if (action === "run" || action === "test")
      await runAssessment(item, action === "test");
    if (action === "stop") {
      runner.cancel();
      document
        .querySelectorAll('[data-action="run"],[data-action="test"]')
        .forEach((n) => (n.disabled = false));
      if (document.querySelector("#runner-status"))
        document.querySelector("#runner-status").textContent =
          "Stopped. Your code is saved.";
      document.querySelector("#preview-slot")?.replaceChildren();
    }
    if (action === "reset-code")
      showDialog(
        "Reset this exercise?",
        "<p>Your current code will be replaced with the starter. Download it first if you want to keep a copy.</p>",
        [
          { label: "Cancel" },
          {
            label: "Reset starter",
            primary: true,
            action: () => {
              state.drafts[id] = item.challenge.starter;
              delete state.evidence[id];
              delete results[id];
              persist();
              render();
            },
          },
        ],
      );
    if (action === "solution") {
      if (!state.activities.some((a) => a.type === "attempt" && a.id === id)) {
        notify(
          "Try the assessment once first. The hints can help you get started.",
        );
        return;
      }
      if (revealed.has(id)) revealed.delete(id);
      else revealed.add(id);
      b.textContent = revealed.has(id)
        ? "Hide reference solution"
        : "Compare a reference solution";
      document.querySelector("#reference-solution").innerHTML = revealed.has(id)
        ? referenceSolution(item)
        : "";
    }
    if (action === "complete") {
      if (markComplete(state, item)) {
        persist();
        const next = lessons[lessons.indexOf(item) + 1];
        showDialog(
          "Lesson verified. Nice work.",
          `<p>You passed the exercise and knowledge check for <strong>${e(item.title)}</strong>. A review is scheduled to help it stick.</p>`,
          [
            {
              label: "Write a reflection",
              action: () => navigate("lesson/" + id + "/reflect"),
            },
            {
              label: next ? "Next lesson" : "See my progress",
              primary: true,
              action: () => navigate(next ? "lesson/" + next.id : "insights"),
            },
          ],
        );
      }
    }
    if (action === "complete-project" && canCompleteProject(state, item)) {
      if (!state.projectCompleted[id]) {
        state.projectCompleted[id] = Date.now();
        state.activities.push({
          type: "project",
          id,
          at: Date.now(),
          passed: true,
        });
      }
      persist();
      notify(
        "Project completed. Export your implementation and engineering notes for your portfolio.",
      );
      render();
    }
    if (action === "export-code") {
      const ext =
        { python: "py", javascript: "js", sql: "sql", html: "html" }[
          item.challenge.language
        ] || "txt";
      download(id + "." + ext, challengeSource(state, item));
    }
    if (action === "export-project") {
      const c = item.challenge;
      download(
        id +
          "." +
          { python: "py", javascript: "js", sql: "sql", html: "html" }[
            c.language
          ],
        challengeSource(state, item),
      );
      download(
        id + "-README.md",
        `# ${item.title}\n\n${item.brief}\n\n## Requirements\n${item.requirements.map((t) => "- " + t).join("\n")}\n\n## My engineering notes\n${state.notes[id] || ""}\n`,
      );
    }
    if (action === "export-notes")
      download(
        "stepwise-notebook.md",
        "# My learning notebook\n\n" +
          Object.entries(state.notes)
            .filter(([, n]) => n.trim())
            .map(
              ([id, n]) =>
                `## ${(lessonById[id] || projectById[id]).title}\n\n${n}`,
            )
            .join("\n\n"),
      );
    if (action === "export-backup")
      download(
        "stepwise-progress.json",
        JSON.stringify(exportBackup(state), null, 2),
        "application/json",
      );
    if (action === "review-answer") {
      reviewAnswers[id] = Number(b.dataset.index);
      render();
    }
    if (action === "review-again" || action === "review-good") {
      if (
        action === "review-good" &&
        reviewAnswers[id] !== lessonById[id].quiz.answer
      )
        return;
      scheduleReview(state, id, action === "review-good" ? "good" : "again");
      persist();
      notify(
        action === "review-good"
          ? "Review completed. Your next review is scheduled."
          : "This idea is scheduled again in 10 minutes. Revisit the exercise to rebuild confidence.",
      );
      navigate("practice");
    }
    if (action === "focus") {
      if (focus.running)
        showDialog(
          "Finish this focus session?",
          `<p>You have ${focusTime()} remaining. Only minutes actually spent will be logged.</p>`,
          [
            { label: "Keep going" },
            { label: "Finish session", primary: true, action: finishFocus },
          ],
        );
      else {
        focus = {
          started: Date.now(),
          ends: Date.now() + state.goal * 60000,
          running: true,
        };
        notify(
          `Your ${state.goal}-minute focus session has started. Keep this page open to log the session.`,
        );
        render();
      }
    }
    if (action === "sync-now") {
      if (sync?.ready) await sync.flush();
      else await sync?.load();
    }
    if (action === "download-conflicts" && sync?.conflict) {
      download(
        "stepwise-device-copy.json",
        JSON.stringify(exportBackup(state), null, 2),
        "application/json",
      );
      if (sync.conflict.remote)
        download(
          "stepwise-cloud-copy.json",
          JSON.stringify(exportBackup(sync.conflict.remote.progress), null, 2),
          "application/json",
        );
    }
    if (action === "keep-cloud" || action === "keep-device")
      showDialog(
        "Resolve the two versions?",
        `<p>${action === "keep-cloud" ? "The cloud version will replace this account’s device progress." : "Your current device progress will replace the cloud document if its revision still matches."} Download both copies first if you need to combine them later.</p>`,
        [
          { label: "Cancel" },
          {
            label: "Use this version",
            primary: true,
            action: async () => {
              await sync.resolve(action === "keep-cloud" ? "cloud" : "device");
              render();
            },
          },
        ],
      );
    if (action === "signout") {
      flushLocal();
      await sync?.flush();
      if (syncStatus === "error" || syncStatus === "conflict") {
        notify(
          "Your device copy is safe, but cloud sync needs attention. Resolve or export it before signing out.",
        );
        return;
      }
      const { error } = await cloudClient().auth.signOut();
      if (error) notify(error.message);
    }
  });
  async function connectAccount(nextUser) {
    if (user?.id === nextUser?.id && user !== null) return;
    flushLocal();
    sync?.dispose();
    sync = null;
    user = nextUser;
    storageKey = user ? STORAGE_KEY + ":" + user.id : STORAGE_KEY;
    state = loadProgress(storage, storageKey);
    results = {};
    syncStatus = user ? "loading" : "local";
    render();
    if (user) {
      sync = new SyncCoordinator({
        service: progressService(user.id),
        getState: () => state,
        setState: (remote) => {
          state = normalizeProgress(remote);
          flushLocal();
          render();
        },
        onStatus: (status, error) => {
          syncStatus = status;
          syncError = error || "";
          updateSaveStatus();
          if (
            route().page === "settings" &&
            !document.querySelector("#email:focus")
          )
            render();
        },
      });
      await sync.load();
    }
  }
  window.addEventListener("hashchange", () => {
    mobileOpen = false;
    const r = route();
    if (r.page === "lesson" && lessonById[r.id]) {
      state.lastLesson = r.id;
      saveSoon();
    }
    render();
    window.scrollTo({ top: 0, behavior: "instant" });
    document.querySelector("#main-content")?.focus({ preventScroll: true });
  });
  window.addEventListener("pagehide", () => {
    clearTimeout(saveTimer);
    flushLocal();
  });
  window.addEventListener("online", () => {
    if (sync?.ready && !sync.conflict) sync.flush();
  });
  document.addEventListener("keydown", (event) => {
    if (
      event.key === "/" &&
      !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)
    ) {
      event.preventDefault();
      navigate("path");
      setTimeout(() => document.querySelector("#lesson-search")?.focus(), 0);
    }
  });
  setInterval(() => {
    if (!focus.running) return;
    if (Date.now() >= focus.ends) {
      finishFocus();
      return;
    }
    const label = document.querySelector("#focus-time");
    if (label) label.textContent = focusTime();
  }, 1000);
  render();
  if (cloudConfigured) {
    const client = cloudClient();
    client.auth.getSession().then(({ data, error }) => {
      if (error) {
        syncError = error.message;
        notify(
          "Sign-in could not be restored. Your local work is still available.",
        );
      } else if (data.session?.user) connectAccount(data.session.user);
    });
    client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT")
        setTimeout(() => connectAccount(session?.user || null), 0);
    });
  }
  return { getState: () => state, render };
}
