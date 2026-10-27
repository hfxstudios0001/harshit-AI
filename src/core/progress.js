import { lessons, lessonById } from "../curriculum/index.js";
import { projects, projectById } from "../curriculum/projects.js";
import { codeFingerprint } from "./assessment.js";
export const STORAGE_KEY = "stepwise-v2";
const knownIds = new Set([...lessons, ...projects].map((x) => x.id));
const record = (value) =>
  value && typeof value === "object" && !Array.isArray(value) ? value : {};
const finite = (value) =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;
export function initialProgress() {
  return {
    version: 2,
    name: "",
    goal: 30,
    theme: "light",
    fontSize: "normal",
    completed: {},
    projectCompleted: {},
    drafts: {},
    notes: {},
    evidence: {},
    quiz: {},
    scenario: {},
    rubrics: {},
    reviews: {},
    bookmarks: [],
    activities: [],
    lastLesson: lessons[0].id,
    updatedAt: 0,
    legacyCompleted: [],
  };
}
function textMap(value, max = 80000) {
  return Object.fromEntries(
    Object.entries(record(value))
      .filter(([k, v]) => knownIds.has(k) && typeof v === "string")
      .map(([k, v]) => [k, v.slice(0, max)]),
  );
}
function timeMap(value, allowed) {
  return Object.fromEntries(
    Object.entries(record(value)).filter(([k, v]) => allowed(k) && finite(v)),
  );
}
export function normalizeProgress(raw) {
  const p = record(raw),
    out = initialProgress();
  out.name = typeof p.name === "string" ? p.name.slice(0, 50) : "";
  out.goal = [15, 20, 30, 45, 60, 90].includes(p.goal) ? p.goal : 30;
  out.theme = ["light", "dark", "system"].includes(p.theme) ? p.theme : "light";
  out.fontSize = p.fontSize === "large" ? "large" : "normal";
  out.drafts = textMap(p.drafts);
  out.notes = textMap(p.notes, 30000);
  out.completed = timeMap(p.completed, (k) => !!lessonById[k]);
  out.projectCompleted = timeMap(p.projectCompleted, (k) => !!projectById[k]);
  out.evidence = Object.fromEntries(
    Object.entries(record(p.evidence))
      .filter(
        ([k, v]) =>
          knownIds.has(k) &&
          typeof v?.hash === "string" &&
          finite(v?.passedAt) &&
          Number.isInteger(v?.caseCount) &&
          v.caseCount > 0,
      )
      .map(([k, v]) => [
        k,
        { hash: v.hash, passedAt: v.passedAt, caseCount: v.caseCount },
      ]),
  );
  out.quiz = Object.fromEntries(
    Object.entries(record(p.quiz)).filter(
      ([k, v]) =>
        lessonById[k] &&
        Number.isInteger(v) &&
        v >= 0 &&
        v < lessonById[k].quiz.choices.length,
    ),
  );
  out.scenario = Object.fromEntries(
    Object.entries(record(p.scenario))
      .filter(([k, v]) => knownIds.has(k) && Array.isArray(v))
      .map(([k, v]) => [
        k,
        v
          .slice(0, 20)
          .map((x) => (Number.isInteger(x) && x >= 0 && x < 10 ? x : null)),
      ]),
  );
  out.rubrics = Object.fromEntries(
    Object.entries(record(p.rubrics))
      .filter(([k, v]) => projectById[k] && Array.isArray(v))
      .map(([k, v]) => [
        k,
        v.slice(0, projectById[k].rubric.length).map((x) => x === true),
      ]),
  );
  out.reviews = Object.fromEntries(
    Object.entries(record(p.reviews))
      .filter(
        ([k, v]) =>
          lessonById[k] &&
          finite(v?.due) &&
          Number.isInteger(v?.level) &&
          v.level >= 0 &&
          v.level <= 5,
      )
      .map(([k, v]) => [k, { due: v.due, level: v.level }]),
  );
  out.bookmarks = [
    ...new Set(
      (Array.isArray(p.bookmarks) ? p.bookmarks : []).filter((id) =>
        knownIds.has(id),
      ),
    ),
  ];
  out.activities = (Array.isArray(p.activities) ? p.activities : [])
    .filter(
      (a) =>
        finite(a?.at) &&
        ["attempt", "complete", "review", "focus", "project"].includes(a?.type),
    )
    .slice(-5000)
    .map((a) => ({
      at: a.at,
      type: a.type,
      id: knownIds.has(a.id) ? a.id : "",
      passed: a.passed === true,
      minutes: Number.isFinite(a.minutes)
        ? Math.max(0, Math.min(180, a.minutes))
        : 0,
    }));
  out.lastLesson = lessonById[p.lastLesson] ? p.lastLesson : lessons[0].id;
  out.updatedAt = finite(p.updatedAt) ? p.updatedAt : 0;
  out.legacyCompleted = (
    Array.isArray(p.legacyCompleted) ? p.legacyCompleted : []
  ).filter((id) => !!lessonById[id]);
  return out;
}
export function migrateLegacy(old) {
  const state = initialProgress();
  if (!old || typeof old !== "object") return state;
  for (const field of ["notes", "drafts"])
    for (const [index, text] of Object.entries(record(old[field]))) {
      const l = lessons.find((l) => l.legacyIndex === Number(index));
      if (l && typeof text === "string") state[field][l.id] = text;
    }
  state.legacyCompleted = (Array.isArray(old.completed) ? old.completed : [])
    .map((i) => lessons.find((l) => l.legacyIndex === i)?.id)
    .filter(Boolean);
  state.goal = [15, 20, 30, 45, 60, 90].includes(old.goal) ? old.goal : 30;
  return normalizeProgress(state);
}
export function loadProgress(storage, key = STORAGE_KEY) {
  try {
    const saved = storage.getItem(key);
    if (saved) return normalizeProgress(JSON.parse(saved));
    if (key === STORAGE_KEY) {
      const legacy = storage.getItem("stepwise-v1");
      if (legacy) return migrateLegacy(JSON.parse(legacy));
    }
  } catch {}
  return initialProgress();
}
export function saveProgress(storage, state, key = STORAGE_KEY) {
  storage.setItem(key, JSON.stringify(state));
}
export function challengeSource(state, item) {
  return item.challenge.language === "scenario"
    ? JSON.stringify(state.scenario[item.id] || [])
    : (state.drafts[item.id] ?? item.challenge.starter);
}
export function hasEvidence(state, item) {
  const e = state.evidence[item.id];
  const count =
    item.challenge.language === "scenario"
      ? item.challenge.questions.length
      : item.challenge.tests.length;
  return (
    !!e &&
    e.hash === codeFingerprint(challengeSource(state, item)) &&
    e.caseCount === count
  );
}
export function canComplete(state, lesson) {
  return (
    hasEvidence(state, lesson) && state.quiz[lesson.id] === lesson.quiz.answer
  );
}
export function canCompleteProject(state, project) {
  return (
    hasEvidence(state, project) &&
    project.rubric.every((_, i) => state.rubrics[project.id]?.[i] === true)
  );
}
export function markComplete(state, lesson, now = Date.now()) {
  if (!canComplete(state, lesson)) return false;
  if (!state.completed[lesson.id]) {
    state.completed[lesson.id] = now;
    state.reviews[lesson.id] = { level: 0, due: now + 86400000 };
    state.activities.push({
      type: "complete",
      id: lesson.id,
      at: now,
      passed: true,
    });
  }
  return true;
}
export function scheduleReview(state, id, rating, now = Date.now()) {
  if (!lessonById[id] || !state.completed[id]) return;
  const old = state.reviews[id]?.level || 0;
  const level = rating === "again" ? 0 : Math.min(5, old + 1);
  const delay =
    rating === "again" ? 600000 : [1, 3, 7, 14, 30, 60][level] * 86400000;
  state.reviews[id] = { level, due: now + delay };
  state.activities.push({
    type: "review",
    id,
    at: now,
    passed: rating !== "again",
  });
}
export function localDay(time) {
  const d = new Date(time);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
export function activitySummary(state, now = Date.now()) {
  const days = new Set(state.activities.map((a) => localDay(a.at)));
  let streak = 0;
  const date = new Date(now);
  if (!days.has(localDay(date))) date.setDate(date.getDate() - 1);
  while (days.has(localDay(date))) {
    streak++;
    date.setDate(date.getDate() - 1);
  }
  const today = localDay(now);
  return {
    streak,
    activeDays: days.size,
    focusMinutes: state.activities
      .filter((a) => a.type === "focus")
      .reduce((n, a) => n + (a.minutes || 0), 0),
    todayMinutes: state.activities
      .filter((a) => a.type === "focus" && localDay(a.at) === today)
      .reduce((n, a) => n + (a.minutes || 0), 0),
    due: Object.entries(state.reviews)
      .filter(([id, v]) => state.completed[id] && v.due <= now)
      .map(([id]) => id),
  };
}
export function exportBackup(state) {
  return {
    format: "stepwise-learning-backup",
    version: 2,
    exportedAt: new Date().toISOString(),
    progress: normalizeProgress(state),
  };
}
export function parseBackup(text) {
  if (text.length > 5000000)
    throw new Error("The backup must be smaller than 5 MB.");
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("This is not valid JSON. Choose a Stepwise backup file.");
  }
  if (data?.format === "stepwise-backup" && data.version === 1 && data.progress)
    return migrateLegacy(data.progress);
  if (
    data?.format !== "stepwise-learning-backup" ||
    data.version !== 2 ||
    data.progress?.version !== 2
  )
    throw new Error("This is not a supported Stepwise progress backup.");
  if (!data.progress.completed || Array.isArray(data.progress.completed))
    throw new Error("The progress structure is invalid.");
  return normalizeProgress(data.progress);
}
