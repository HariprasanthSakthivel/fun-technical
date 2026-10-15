# Fun & Technical Activity Platform

A real-time, interactive game platform for internal company events, built with React (TypeScript + Vite) on the frontend and Python FastAPI on the backend.

---

## Supported games

| Game | Description |
|------|-------------|
| **Guess the Technology** | Participants identify a technology, programming language, framework, package, tool, or company from image or text clues. |
| **Explain Without Naming** | One team explains a secret topic without saying its name. Other teams race to identify it first. |

---

## Project structure

```
fun-tech-activity-platform/
├── frontend/               # React + TypeScript + Vite application
│   ├── src/
│   │   ├── components/     # Reusable UI components (shadcn-style)
│   │   │   └── ui/         # button, card, badge, dialog, input, label
│   │   ├── pages/          # Route-level page components
│   │   │   ├── admin/      # AdminLoginPage, AdminDashboardPage
│   │   │   ├── participant/ # ParticipantJoinPage, ParticipantWaitingPage
│   │   │   └── WelcomePage.tsx
│   │   ├── layouts/        # RootLayout, AdminLayout, ParticipantLayout
│   │   ├── hooks/          # useDocumentTitle
│   │   ├── services/       # api.ts — typed fetch helpers
│   │   ├── types/          # Shared TypeScript types
│   │   └── utils/          # cn() utility
│   ├── public/             # Static assets (favicon, icons)
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                # Python FastAPI application
│   ├── app/
│   │   ├── api/            # Route handlers (health.py)
│   │   ├── core/           # config.py, database.py, exceptions.py
│   │   ├── models/         # SQLAlchemy ORM models (Step 2+)
│   │   ├── schemas/        # Pydantic schemas (Step 2+)
│   │   ├── services/       # Business logic (Step 2+)
│   │   ├── websocket/      # WebSocket handlers (Step 3+)
│   │   └── main.py         # Application entry point
│   ├── alembic/            # Database migration scripts
│   ├── tests/              # pytest test suite
│   ├── requirements.txt
│   └── pytest.ini
│
├── .env.example            # Environment variable template
├── .gitignore
└── README.md
```

---

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | ≥ 20 LTS | `node --version` |
| npm | ≥ 10 | Bundled with Node |
| Python | ≥ 3.12 | `python --version` |
| PostgreSQL | ≥ 15 | Required for database features (Step 2+) |

> **PostgreSQL note:** The backend starts without a live database connection in Step 1 (health check only). You only need PostgreSQL running when database-backed endpoints are added in a later step.

---

## Quick start

### 1 — Clone / open the repository

```bash
cd "c:/Users/hh676/OneDrive/Documents/FUN"
```

### 2 — Configure environment variables

Copy the template and fill in real values:

```bash
# Root template
cp .env.example .env.example   # already committed — read-only reference

# Frontend
copy .env.example frontend\.env
# Edit frontend/.env — set VITE_API_BASE_URL if your backend port differs

# Backend
copy .env.example backend\.env
# Edit backend/.env — set DATABASE_URL with real PostgreSQL credentials
```

### 3 — Install frontend dependencies

```bash
cd frontend
npm install
```

### 4 — Set up the backend virtual environment

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

---

## Running the application

Both the frontend and backend run **independently** on separate ports.

### Frontend development server (port 5173)

```bash
cd frontend
npm run dev
# Open http://localhost:5173
```

### Backend development server (port 8000)

```bash
cd backend
# Activate venv first (see above)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
# API docs: http://localhost:8000/docs
# Health:   http://localhost:8000/api/health
```

---

## Environment variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Location | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | `frontend/.env` | Backend base URL (default `http://localhost:8000`) |
| `DATABASE_URL` | `backend/.env` | PostgreSQL connection string (SQLAlchemy format) |
| `CORS_ORIGINS` | `backend/.env` | Comma-separated allowed origins |
| `APP_ENV` | `backend/.env` | `development` or `production` |
| `DEBUG` | `backend/.env` | `true` / `false` |

---

## Available pages (Step 1)

| URL | Description |
|-----|-------------|
| `/` | Welcome — introduces both games and role entry points |
| `/admin/login` | Admin login UI shell (placeholder, no auth yet) |
| `/admin/dashboard` | Admin dashboard — metrics, quick actions, activity feed, game overview |
| `/admin/games` | Games management — 2 game cards with manage/view/edit |
| `/admin/questions` | Question Bank — searchable, filterable table with add/view/delete |
| `/admin/teams` | Teams — table with register modal, search, view/delete |
| `/admin/sessions` | Live Sessions — upcoming/active/completed sections, create session modal |
| `/admin/scoreboard` | Scoreboard — top-3 podium, ranked table, session filter |
| `/admin/results` | Results & History — completed session results (empty state in Step 2) |
| `/admin/settings` | Settings — Game Rules controls, appearance, danger zone |
| `/participant/join` | Participant join form (session code + team name) |
| `/participant/waiting` | Waiting room — shows session/team, awaits admin start |

---

## API endpoints (Step 1)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Health check — returns `{ status: "ok", success: true, … }` |
| `GET` | `/` | Root message with links to docs and health |
| `GET` | `/docs` | Swagger UI (FastAPI auto-generated) |
| `GET` | `/redoc` | ReDoc (FastAPI auto-generated) |

---

## Running tests

### Backend

```bash
cd backend
# Activate venv first
pytest tests/ -v
```

Expected output:
```
tests/test_health.py::test_health_check_returns_ok PASSED
tests/test_health.py::test_root_returns_links     PASSED
2 passed
```

### Frontend type-check + production build

```bash
cd frontend
npm run build
```

Expected output: `✓ built in ~3s` with no TypeScript errors.

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Frontend framework | React 19 + TypeScript 6 + Vite 8 |
| Styling | Tailwind CSS 4 |
| UI components | Radix UI primitives (shadcn-style) + class-variance-authority |
| Icons | Lucide React |
| Routing | React Router v7 |
| Backend framework | Python FastAPI 0.143 |
| ORM | SQLAlchemy 2 |
| Migrations | Alembic |
| Validation | Pydantic v2 + pydantic-settings |
| Real-time | WebSockets (wired in Step 3+) |
| Database | PostgreSQL 15+ |

---

## Development roadmap

- [x] **Step 1** — Project structure, frontend shell, backend foundation, health check
- [x] **Step 2** — Complete Admin Dashboard (8 pages, collapsible sidebar, mock data, search/filter/modals)
- [ ] **Step 3** — Database schema (teams, games, questions, sessions), Alembic migrations, REST CRUD endpoints
- [ ] **Step 3** — Admin authentication, session management, protected routes
- [ ] **Step 4** — Participant flow, team join, real-time WebSocket session events
- [ ] **Step 5** — Buzzer system, answer submission, scoring engine
- [ ] **Step 6** — Game mechanics for Guess the Technology (image/text clues)
- [ ] **Step 7** — Game mechanics for Explain Without Naming
- [ ] **Step 8** — Polish, leaderboard, production deployment configuration

---

## Commit hygiene

- `.env` files are git-ignored — never commit real secrets.
- Use `.env.example` as the documented template.
- The `frontend/dist/` and `backend/__pycache__/` directories are git-ignored.
