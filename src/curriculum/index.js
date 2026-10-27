import { lessons as foundations } from "../lessons.js";
import { pythonChallenges } from "./python-challenges.js";
import { advanced } from "./advanced.js";
export const modules = [
  {
    id: "python-start",
    title: "Your first working programs",
    description:
      "Understand how code runs. Build confidence through small, verified programs.",
    level: "Start here",
    prerequisites: [],
    icon: "01",
  },
  {
    id: "python-data",
    title: "Work with real information",
    description: "Transform text, lists, and records into useful reports.",
    level: "Foundation",
    prerequisites: ["python-start"],
    icon: "02",
  },
  {
    id: "python-functions",
    title: "Write reliable Python",
    description: "Functions, contracts, errors, and tests that catch mistakes.",
    level: "Foundation",
    prerequisites: ["python-data"],
    icon: "03",
  },
  {
    id: "python-projects",
    title: "From scripts to software",
    description: "Files, JSON, objects, complexity, and an integrated project.",
    level: "Build",
    prerequisites: ["python-functions"],
    icon: "04",
  },
  {
    id: "web",
    title: "Web development & Git",
    description:
      "Build interactive pages, understand hosting, and collaborate with version control.",
    level: "Foundation",
    prerequisites: ["python-start"],
    icon: "05",
  },
  {
    id: "javascript",
    title: "JavaScript application engineering",
    description:
      "State, asynchronous work, data validation, and predictable UI logic.",
    level: "Develop",
    prerequisites: ["web"],
    icon: "06",
  },
  {
    id: "sql",
    title: "Query and understand your data",
    description:
      "Real SQL queries: filtering, grouping, joins, subqueries, and window functions.",
    level: "Develop",
    prerequisites: ["python-data"],
    icon: "07",
  },
  {
    id: "algorithms",
    title: "Solve problems systematically",
    description:
      "Choose data structures, maintain invariants, and reason about cost.",
    level: "Deepen",
    prerequisites: ["python-functions"],
    icon: "08",
  },
  {
    id: "backend",
    title: "APIs, security & consistency",
    description:
      "Resource contracts, ownership checks, idempotency, and safe concurrent saves.",
    level: "Engineer",
    prerequisites: ["javascript", "sql"],
    icon: "09",
  },
  {
    id: "data-ai",
    title: "Data & AI engineering foundations",
    description:
      "Evaluate honestly, prepare evidence, and build measurable retrieval systems.",
    level: "Explore",
    prerequisites: ["python-projects", "algorithms"],
    icon: "10",
  },
  {
    id: "systems",
    title: "Reliable systems & releases",
    description:
      "Caching, retries, queues, rate limits, observability, and release gates.",
    level: "Engineer",
    prerequisites: ["backend"],
    icon: "11",
  },
];
const scenario = (title, prompt, questions) => ({
  id: title,
  title,
  prompt,
  language: "scenario",
  questions,
  hints: [
    "Separate what the client can control from what the server must enforce.",
    "Reason about the exact operation and its failure cases before choosing.",
  ],
});
const foundationAssessments = {
  24: scenario(
    "Trace a website request",
    "A learner opens a course on their phone. Choose the correct action at each boundary.",
    [
      {
        question:
          "The app runs only on a cloud machine’s localhost. What allows the phone to reach it?",
        choices: [
          "Deploy it to a reachable HTTPS host",
          "Send the localhost address",
          "Rename the folder",
        ],
        answer: 0,
        why: "The phone needs a publicly reachable host or an explicitly configured accessible network.",
      },
      {
        question:
          "The server cannot find lesson-99. Which status describes this?",
        choices: ["200 OK", "404 Not Found", "201 Created"],
        answer: 1,
        why: "404 indicates the requested resource was not found.",
      },
      {
        question:
          "The page loads, but clicking a button does nothing. Which layer likely contains the interaction logic?",
        choices: ["DNS alone", "CSS color rules", "JavaScript event handling"],
        answer: 2,
        why: "Event listeners and state updates implement the page’s behavior.",
      },
    ],
  ),
  25: {
    id: "html-journal",
    title: "Build a semantic journal",
    language: "html",
    prompt:
      "Create a main element containing exactly one h1 with your journal title and at least two nonempty paragraphs. Give the document a meaningful title element.",
    starter:
      '<!doctype html>\n<html lang="en">\n<head><title></title></head>\n<body>\n  <!-- Build your journal -->\n</body>\n</html>',
    solution:
      '<!doctype html><html lang="en"><head><title>My learning journal</title></head><body><main><h1>My learning journal</h1><p>I am learning Python.</p><p>Today I will practice for twenty minutes.</p></main></body></html>',
    tests: [
      {
        name: "One main heading",
        expression:
          'document.querySelectorAll("main h1").length === 1 && document.querySelector("main h1").textContent.trim().length > 0',
      },
      {
        name: "Two meaningful paragraphs",
        expression:
          '[...document.querySelectorAll("main p")].filter(p=>p.textContent.trim()).length >= 2',
      },
      {
        name: "Document title",
        expression: "document.title.trim().length > 0",
      },
    ],
    hints: [
      "Use main for the primary content and h1 for its heading.",
      "A title belongs in head; paragraphs belong in the visible body.",
    ],
  },
  26: {
    id: "css-journal",
    title: "Make the journal readable",
    language: "html",
    prompt:
      "Style the page so body has at least 16px font size and 20px padding, and paragraphs have line-height at least 1.5 times their font size. Include a heading and a paragraph.",
    starter:
      "<style>\n/* Add readable styles */\n</style>\n<h1>My journal</h1>\n<p>Small steps become real understanding.</p>",
    solution:
      "<style>body{font-family:sans-serif;font-size:18px;padding:24px}p{line-height:1.7}h1{color:#285c48}</style><h1>My journal</h1><p>Small steps become real understanding.</p>",
    tests: [
      {
        name: "Readable type",
        expression: "parseFloat(getComputedStyle(document.body).fontSize)>=16",
      },
      {
        name: "Breathing room",
        expression:
          "parseFloat(getComputedStyle(document.body).paddingLeft)>=20",
      },
      {
        name: "Comfortable paragraph spacing",
        expression:
          '(()=>{const p=document.querySelector("p");return !!p && parseFloat(getComputedStyle(p).lineHeight)>=1.5*parseFloat(getComputedStyle(p).fontSize)})()',
      },
    ],
    hints: [
      "Set body font-size and padding with px values.",
      "Use a unitless line-height such as 1.6 on paragraphs.",
    ],
  },
  27: {
    id: "js-counter-page",
    title: "Build a working session counter",
    language: "html",
    prompt:
      "Create buttons with IDs add and reset, and a paragraph with ID count showing 0. Add increments the count; Reset returns it to 0. Register click listeners.",
    starter:
      '<button id="add">Add session</button>\n<button id="reset">Reset</button>\n<p id="count">0</p>\n<script>\n// Connect the buttons\n</script>',
    solution:
      '<button id="add">Add session</button><button id="reset">Reset</button><p id="count">0</p><script>let n=0;document.querySelector("#add").addEventListener("click",()=>{document.querySelector("#count").textContent=String(++n)});document.querySelector("#reset").addEventListener("click",()=>{n=0;document.querySelector("#count").textContent="0"});</script>',
    tests: [
      {
        name: "Starts at zero",
        expression:
          'document.querySelector("#count")?.textContent.trim()==="0"',
      },
      {
        name: "Adds two sessions",
        expression:
          '(()=>{document.querySelector("#add").click();document.querySelector("#add").click();return document.querySelector("#count").textContent.trim()==="2"})()',
      },
      {
        name: "Reset works",
        expression:
          '(()=>{document.querySelector("#reset").click();return document.querySelector("#count").textContent.trim()==="0"})()',
      },
    ],
    hints: [
      "Keep a numeric counter variable outside the click handlers.",
      "Update textContent after changing the counter. Reset the variable and the displayed text.",
    ],
  },
  28: scenario(
    "Prepare a safe commit",
    "You changed index.html, fixed a test, and created a local .env containing an API key.",
    [
      {
        question: "Which files belong in the commit?",
        choices: [
          "Everything, including .env",
          "The intended page and test changes, without the secret file",
          "Only the secret",
        ],
        answer: 1,
        why: "Commit the intended source changes; keep secret values out of version control.",
      },
      {
        question: "Which operation records the staged changes locally?",
        choices: ["git commit", "git status", "git push"],
        answer: 0,
        why: "commit records the staged snapshot locally. push transfers commits to a remote.",
      },
      {
        question:
          "A secret was already committed. Is adding .env to .gitignore enough?",
        choices: [
          "Yes, it removes all history",
          "No, revoke/rotate the exposed secret and handle history appropriately",
          "Only if the filename is short",
        ],
        answer: 1,
        why: "Ignoring a file does not remove prior commits or invalidate an exposed credential.",
      },
    ],
  ),
  29: scenario(
    "Review a change before merging",
    "A pull request adds progress sync but also logs complete session tokens.",
    [
      {
        question: "Tests pass. Should it merge as-is?",
        choices: [
          "Yes, green tests prove safety",
          "No, remove secret logging and review access control",
          "Only if it has many lines",
        ],
        answer: 1,
        why: "Tests do not automatically cover security properties or accidental secret exposure.",
      },
      {
        question: "What makes the PR description useful?",
        choices: [
          "A concrete behavior change and how it was validated",
          "Only a celebratory sentence",
          "The author’s entire chat history",
        ],
        answer: 0,
        why: "Reviewers need the intended behavior and evidence relevant to that behavior.",
      },
      {
        question: "How should an unrelated formatting change be handled?",
        choices: [
          "Mix everything without explanation",
          "Keep the change focused or clearly separate unrelated work",
          "Delete the repository",
        ],
        answer: 1,
        why: "Focused diffs are easier to review and less likely to hide defects.",
      },
    ],
  ),
  30: {
    id: "sql-first-query",
    title: "Ask the database a question",
    language: "sql",
    prompt:
      "Return topic and minutes from sessions for records with minutes at least 20. Sort by id.",
    starter: "SELECT topic, minutes FROM sessions;",
    solution:
      "SELECT topic, minutes FROM sessions WHERE minutes >= 20 ORDER BY id;",
    schema:
      "CREATE TABLE sessions(id INTEGER PRIMARY KEY,topic TEXT,minutes INTEGER); INSERT INTO sessions VALUES(1,'Python',25),(2,'Git',10),(3,'SQL',30);",
    tests: [
      {
        name: "Selected records",
        columns: ["topic", "minutes"],
        expected: [
          ["Python", 25],
          ["SQL", 30],
        ],
      },
    ],
    hints: [
      "WHERE filters rows by a condition.",
      "Use >= to include the exact threshold.",
    ],
  },
  31: scenario(
    "Decide whether a release is ready",
    "Your website builds successfully, but the deployed sign-in flow has not been tested.",
    [
      {
        question: "What can you honestly claim?",
        choices: [
          "The build passed; authenticated deployment remains unverified",
          "All features work in production",
          "Every browser is supported",
        ],
        answer: 0,
        why: "A build validates compilation, not the behavior of external services in the deployed environment.",
      },
      {
        question: "Which smoke test adds meaningful evidence?",
        choices: [
          "Check only the repository name",
          "Open the public URL, sign in, save progress, and verify on another device",
          "Count lines of code",
        ],
        answer: 1,
        why: "The test exercises the actual user journey and configured services.",
      },
      {
        question: "What should exist before a risky release?",
        choices: [
          "A recovery/rollback plan and a recent backup",
          "Only a screenshot",
          "No previous deployment",
        ],
        answer: 0,
        why: "Recovery planning limits the impact of failures after release.",
      },
    ],
  ),
};
export const lessons = [
  ...foundations.map((l, i) => ({
    id: `foundation-${i + 1}`,
    legacyIndex: i,
    module:
      i < 6
        ? "python-start"
        : i < 12
          ? "python-data"
          : i < 18
            ? "python-functions"
            : i < 24
              ? "python-projects"
              : "web",
    title: l.title,
    concept: l.concept,
    explanation: l.explanation,
    example: l.example,
    breakdown: l.breakdown,
    minutes: l.minutes + 10,
    language: (pythonChallenges[i] || foundationAssessments[i]).language,
    challenge: pythonChallenges[i] || foundationAssessments[i],
    quiz: {
      question: l.question,
      choices: l.choices,
      answer: l.answer,
      why: l.why,
    },
    recall: l.recall,
    resource: {
      label: i < 24 ? "Python tutorial" : "MDN web learning",
      url:
        i < 24
          ? "https://docs.python.org/3/tutorial/"
          : "https://developer.mozilla.org/en-US/docs/Learn_web_development",
    },
  })),
  ...advanced,
];
export const lessonById = Object.fromEntries(lessons.map((l) => [l.id, l]));
export const moduleById = Object.fromEntries(modules.map((m) => [m.id, m]));
export function moduleLessons(id) {
  return lessons.filter((l) => l.module === id);
}
