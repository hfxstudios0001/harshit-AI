# Stepwise

A personal learning platform for complete beginners: 32 guided lessons across Python, web basics, and Git, with hands-on practice and reflection.

## Open it as a website with Vercel

1. Sign in at https://vercel.com/new.
2. Import `hfxstudios0001/harshit-AI`. If it is missing, grant the Vercel GitHub integration access to this repository.
3. Keep the repository root as the root directory and click **Deploy**. `vercel.json` specifies the build settings. No environment variables are required.
4. Open the deployment URL that Vercel provides. Check the first lesson's **Run Python** button on that URL.

This source repository is not itself a live website. Publishing a Codex environment does not deploy this website. A successful Vercel deployment supplies the public address.

## Learning experience

- 24 Python lessons: first program, variables, arithmetic, decisions, loops, data collections, functions, debugging, tests, files, JSON, classes, complexity, and small projects.
- 8 web/Git foundation lessons: HTTP, HTML, CSS, JavaScript events, version control, collaboration, SQL concepts, and deployment.
- Real Python execution through a locally bundled Pyodide runtime in a Web Worker; Stop control and a 30-second timeout.
- Isolated HTML/CSS/JavaScript previews, quizzes, saved reflections, searchable curriculum, and spaced review prompts.
- Browser-local progress and downloadable/importable JSON backups.
- Mobile and desktop layouts.

## Scope and limitations

This is a working foundation curriculum, not a complete curriculum covering all technology careers. AI, cloud engineering, advanced backend work, and other specializations are not authored yet. There are no accounts, automatic cloud sync, paid APIs, or AI tutoring. Quiz correctness and reflection length unlock lessons; reflections are not automatically graded. SQL and Git lessons contain written exercises, not a live database or terminal.

Python runs start fresh. Python files are temporary, `input()` is not supported, and extra third-party Python packages are not bundled. Initial runtime transfer is about 15 MB. HTML previews are sandboxed and block external resources. Browser-local learning progress can be lost when clearing site data; use the backup feature before changing devices or addresses. Review scheduling is a learning aid, not a guarantee of retention.

## Local development

Node.js 22.12+ is required; validated with Node 24.

```sh
npm ci
npm run dev -- --port 5173
```

```sh
npm test
npm run build
npm run preview -- --port 4173
```

`predev` and `prebuild` copy the installed Python runtime into ignored `public/python/`. The production `dist/` contains everything needed for static hosting, except optional Google Fonts (system fonts provide a fallback). No secrets or environment variables are needed.

## Validation

- Nine automated tests cover sequential progression through all 32 lessons, persistence, safe note rendering, invalid storage, search, backup validation, review scheduling, restricted previews, and all 24 Python teaching examples (23 run successfully and one deliberately raises TypeError for debugging practice).
- Chromium checks cover Python output and errors, stopping execution, search, and mobile horizontal overflow.
- The production build passes. Public deployment must still be verified after importing the repository into Vercel.
