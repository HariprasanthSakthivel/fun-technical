# Fun Friday Activities Platform

A real-time, interactive game and team-building platform built with React 19 (TypeScript + Vite) on the frontend and Python FastAPI with SQLite on the backend.

---

## 1. Supported Games

| Game | Description |
|---|---|
| **Game 1: Tech Detective** | Image-based technology guessing game (25 questions, each with 2–4 visual clues). Teams race to press the buzzer (top 3 qualify). Scoring: 1st (+10 / -2), 2nd (+9 / -2), 3rd (+8 / -2). |
| **Game 2: Lightning Talks** | 1-minute speaking activity conducted team-wise based on Tech Detective rankings. Each participant explains an assigned technical topic without uttering the topic name or prohibited words. Admin scores across 3 criteria: Time Management, Words Used, and Understandability. |
| **Final Combined Leaderboard** | Aggregates Game 1 and Game 2 points into an authoritative overall ranking table editable by the admin and viewable by all participants. |

---

## 2. Participant & Team Formation Flow

1. **Participant Sign In**:
   - Participants log in with their username and password.
   - Details immediately appear in the **Logged-in Users List** on the Admin Dashboard.
2. **Random Team Formation**:
   - The admin divides logged-in participants into teams:
     - **Even count**: Teams of 2 members each.
     - **Odd count**: Teams of 2 members each, with one team containing 3 members.
     - Team members are assigned randomly.
3. **Team Name Page**:
   - Participants view their assigned team and can customize their team name.

---

## 3. Project Structure

```
fun-technical/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth.py             # Login, logout, logged-in participants
│   │   │   ├── health.py           # System health check
│   │   │   ├── leaderboard.py      # Final combined leaderboard & admin overrides
│   │   │   ├── lightning_talks.py  # Game 2: Topic assignment, unlocking, scoring
│   │   │   ├── teams.py            # Random team formation (even/odd) & team naming
│   │   │   └── tech_detective.py   # Game 1: Unlocking, buzzer race, answer grading
│   │   ├── core/
│   │   │   ├── config.py           # Environment settings
│   │   │   ├── database.py         # SQLite engine & session factory
│   │   │   ├── deps.py             # Auth & RBAC dependencies
│   │   │   ├── exceptions.py       # Standardized error handling
│   │   │   └── security.py         # PBKDF2 hashing & HMAC-SHA256 tokens
│   │   ├── models/
│   │   │   └── models.py           # Users, Teams, Questions, Buzzers, Scores
│   │   ├── schemas/
│   │   │   └── schemas.py          # Pydantic validation & response models
│   │   └── main.py                 # FastAPI application entry point
│   ├── data/
│   │   └── fun_tech_activity.db    # SQLite database
│   ├── seed_db.py                  # Seeds admin, 10 participants, 25 questions, 25 topics
│   ├── requirements.txt
│   ├── pytest.ini
│   └── tests/
│       ├── test_health.py          # Health check tests
│       └── test_platform.py        # 11 comprehensive automated tests
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── BrandLogo.tsx
│   │   │   └── ui/                 # Accessible Radix & CVA primitives
│   │   ├── context/
│   │   │   └── AuthContext.tsx     # Client authentication state
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx       # Unified sign in
│   │   │   ├── FinalLeaderboardPage.tsx # Final combined standings
│   │   │   ├── admin/
│   │   │   │   └── AdminDashboardPage.tsx # 4-tab admin control center
│   │   │   └── participant/
│   │   │       ├── ParticipantTeamPage.tsx            # Team roster & naming
│   │   │       ├── ParticipantTechDetectivePage.tsx   # Game 1 arena
│   │   │       └── ParticipantLightningTalksPage.tsx # Game 2 arena
│   │   ├── services/
│   │   │   └── api.ts              # Typed API client
│   │   ├── types/
│   │   │   └── index.ts            # TypeScript interfaces
│   │   ├── App.tsx                 # Route tree
│   │   ├── index.css               # Modern design tokens
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 4. Quick Start

### Backend
```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python seed_db.py
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/api/health`

### Frontend
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 5. Default Credentials

| Role | Username | Password |
|---|---|---|
| **Admin** | `admin` | `admin123` |
| **Participants (10 seeded)** | `alex`, `sarah`, `priya`, `david`, `elena`, `marcus`, `hannah`, `rachel`, `kevin`, `carlos` | `password123` |

---

## 6. Running Tests

```bash
cd backend
pytest tests/ -v
```

```bash
cd frontend
npm run build
```
