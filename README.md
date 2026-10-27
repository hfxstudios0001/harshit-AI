# Stepwise

A personal engineering-learning platform with 68 authored lessons, 11 chapters, and six integrated projects. The learning loop is explanation, independent exercise, executable tests, knowledge check, reflection, and scheduled retrieval practice.

## Capabilities

- Python, JavaScript, SQL, HTML/CSS, Git, algorithms, API contracts, authorization, concurrency, retrieval evaluation, and reliability foundations.
- Python and JavaScript workers, fresh SQLite databases, isolated HTML interaction assessments, timeouts, errors, hints, and reference solutions.
- Project briefs, acceptance criteria, executable checks, self-review rubrics, implementation export, and engineering notes.
- Search, bookmarks, focus sessions, activity history, skills progress, spaced review, theme preferences, responsive layouts, and keyboard navigation.
- Versioned device storage, migration from the earlier app, downloadable backups, validated restoration, and separate account workspaces.
- Supabase sign-in and private progress integration with database ownership policies, atomic revision checks, conflict handling, and downloadable conflicting versions.

The account service needs a configured Supabase project. It is not connected merely because the integration code exists. See [deployment instructions](docs/DEPLOYMENT.md).

## Develop

Requires Node.js 22.12+ (validated with Node 24).

```sh
npm ci
npm test
npm run build
npm run dev -- --port 5173
```

For a production check, run `npm run preview -- --port 4173`. Build hooks copy the installed Python and SQLite runtimes into ignored public asset directories. No third-party runtime CDN is required.

## Verification

Automated tests validate authored Python/JavaScript solutions, reject empty submissions, validate SQL solutions and reject starter queries, exercise completion prerequisites, backup restoration, migration, review scheduling, and simulated cloud revision conflicts. The teaching examples also run against Python.

Production Chromium checks cover Python and SQL grading, all HTML reference assessments, lesson completion, immediate note persistence, and mobile navigation/overflow. Live Supabase authentication, database policies, cross-device behavior, and the final public Vercel deployment require external account configuration and their own acceptance tests.

## Practical limits

The curriculum teaches engineering foundations and applied models. It does not replace sustained work on real services, collaboration, or specialization. API/system labs model behavior rather than starting production infrastructure. Browser assessments and supplied reference solutions support learning; they are not tamper-proof certification. Reflections and project rubrics are self-reviewed. Code execution starts fresh; Python input() and extra packages are not bundled. Keep a backup before clearing browser data.
