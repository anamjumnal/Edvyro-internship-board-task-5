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
