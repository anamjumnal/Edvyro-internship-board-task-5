# Internship Board — Production-Ready Capstone (Task 5)

Part of the Edvyro Full Stack Development Internship. A student internship board where users can search, filter by domain/work mode, view internship details, and submit an application — backed by a real REST API with persistent storage.

## Live links

- **App (frontend + API, same origin):** https://edvyro-internship-board-task-5.onrender.com/
- **Repository:** https://github.com/anamjumnal/Edvyro-internship-board-task-5
- **Two-minute walkthrough:** *(add video link here)*

The frontend is served directly by the Express server (`express.static`), so there is only **one URL** — no separate static host, and no need to run anything locally for a reviewer to use it.

## Architecture

- **Backend:** Node.js + Express, serving both the REST API and the static frontend from the same process/URL
- **Database:** SQLite (file-based, auto-seeded on first run)
- **Frontend:** Vanilla HTML/CSS/JS, no build step
- **Hosting:** Render (backend + static files together)

## Setup (local development)

git clone <this-repo-url>
cd <repo-folder>
npm install
cp .env.example .env
npm start


Then open `http://localhost:3000` — the same server serves the UI and the API.

## Environment variables

See `.env.example` — no secrets are required to run this project:

PORT=3000
NODE_ENV=production
DB_FILE=internships.db


## Database schema

Created automatically on first run (see `initializeDatabase()` in `server.js`):

CREATE TABLE internships (
id TEXT PRIMARY KEY,
title TEXT NOT NULL,
company TEXT NOT NULL,
domain TEXT NOT NULL,
mode TEXT NOT NULL,
location TEXT,
duration TEXT,
stipend TEXT,
openings INTEGER,
description TEXT,
skills TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE applications (
id INTEGER PRIMARY KEY AUTOINCREMENT,
internship_id TEXT NOT NULL,
applicant_name TEXT NOT NULL,
applicant_email TEXT NOT NULL,
portfolio_url TEXT,
cover_letter TEXT,
status TEXT DEFAULT 'pending',
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
UNIQUE (internship_id, applicant_email),
FOREIGN KEY (internship_id) REFERENCES internships(id)
);


**Seed data:** 12 internships across 7 domains (Full Stack, Backend, Frontend, UI/UX, Data Analytics, Data Science, Cyber Security), inserted automatically the first time the database is empty.

## API reference

| Method | Endpoint                           | Description                                                                 |
| ------ | ----------------------------------- | --------------------------------------------------------------------------- |
| GET    | `/api/health`                      | Health check — returns status + timestamp                                   |
| GET    | `/api/internships`                 | List internships. Query params: `page`, `limit`, `search`, `domain`, `mode` |
| GET    | `/api/internships/:id`             | Get one internship by ID                                                    |
| POST   | `/api/applications`                | Submit an application (rate-limited: 5 per 15 minutes per IP)               |
| GET    | `/api/applications/:internship_id` | List applications for one internship                                        |

All responses use a consistent envelope: `{ status, data, pagination }` on success, `{ status: "error", message, errors? }` on failure.

## Health check

GET /api/health
→ {"status":"success","message":"API running","timestamp":"..."}


## List states

The internship list handles all four states explicitly: a loading skeleton on initial fetch, an empty state when no results match the filters, an error state with a retry button if the API call fails, and normal populated results.

## Test evidence

The API was run locally and exercised end-to-end. Real results:
Valid application submit
POST /api/applications → HTTP 201
{"status":"success","message":"Application submitted successfully"}
Duplicate application (same internship + email)
POST /api/applications → HTTP 409
{"status":"error","message":"You have already applied to this internship"}
Missing name
POST /api/applications → HTTP 400
{"status":"error","message":"Validation failed","errors":["Name is required"]}
Invalid email format
POST /api/applications → HTTP 400
{"status":"error","message":"Validation failed","errors":["Invalid email format"]}
Unsafe portfolio URL scheme (javascript:alert(1))
POST /api/applications → HTTP 400
{"status":"error","message":"Validation failed","errors":["Invalid portfolio URL format"]}
Sixth application within 15 minutes from the same source
POST /api/applications → HTTP 429 (rate limiter engaged as designed)
Unknown API route
GET /api/doesnotexist → HTTP 404
{"status":"error","message":"Route not found"}

**Log privacy check:** server logs for the above run were inspected directly. Applicant emails are masked before they're ever written (`t***@example.com`), and no password, token, or full applicant record appears in any log line — logs contain only method, path, internship ID, and a masked email for traceability.

## Performance & regression checks

Manually tested across Chrome desktop and mobile viewport (360px–1440px) after each change; no regressions found in search, filters, pagination, or the apply flow.

## Accessibility

- Search, filters, and pagination controls are native `<input>`/`<select>`/`<button>` elements — fully keyboard-operable, no custom widgets that trap focus incorrectly
- Detail and application dialogs use the native `<dialog>` element (`showModal()`), which handles focus trapping and Escape-to-close natively
- Labels are associated with their inputs via `for`/`id`
- Layout is a responsive grid that collapses to a single column on narrow viewports — verified with no horizontal scroll down to 360px width

## Security

- `X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Strict-Transport-Security`, and a `Content-Security-Policy` header are set on every response
- All SQL queries are parameterized (no string-concatenated SQL)
- Portfolio URLs are restricted to `http:`/`https:` schemes only — rejects `javascript:`, `data:`, etc.
- Duplicate applications (same internship + email) are rejected at the database level (`UNIQUE` constraint) and checked explicitly before insert
- Applications are rate-limited (5 per 15 minutes per IP) to slow down abuse
- Logs never contain passwords, tokens, or unmasked applicant emails

## What's in this repo

- `server.js` — Express API + static file server + SQLite persistence + logging
- `index.html`, `script.js` — frontend (fetches from the live API)
- `package.json` — dependencies and start script
- `.env.example` — safe environment variable template (no secrets)
