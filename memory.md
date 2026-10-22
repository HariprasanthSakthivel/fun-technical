# Fun Friday Activities Platform — Project Memory

## Project Overview

| Property | Value |
|---|---|
| **Platform Name** | Fun Friday Activities Platform |
| **Workspace** | `c:\Users\ELCOT\axtrlabs\fun-technical` |
| **Purpose** | Real-time interactive team-building and gaming platform for internal events |
| **Roles** | Administrator · Participants |
| **Supported Games** | Game 1: Tech Detective · Game 2: Lightning Talks |
| **Leaderboards** | Game 1 Leaderboard · Game 2 Leaderboard · Final Combined Leaderboard |

---

## Functional Requirements Implemented

### 1. Participant Authentication & Live Tracking
- Login with username and password.
- Details automatically appear in the **Logged-in Users List** on the Admin Dashboard.
- Total count and participant profiles tracked in real time.

### 2. Random Team Formation
- Admin one-click random team division:
  - **Even participant count**: Teams of 2 members each.
  - **Odd participant count**: Teams of 2 members each, with one team containing 3 members.
- Random member assignment.
- Default team names assigned and editable by both the Admin and team members.
- **Team Name Page** displays assigned team name, members, and custom name editor.

### 3. Game 1: Tech Detective
- 25 image-based technology guessing questions (each with 2 to 4 visual clue images).
- Sequential admin unlocking (only 1 unlocked at a time; others locked).
- Simultaneous buzzer availability upon unlock.
- Chronological buzzer queue recording up to 3 teams (auto-locks after 3).
- Answering opportunities:
  - 1st team: Correct = +10, Incorrect = -2 (passes to 2nd).
  - 2nd team: Correct = +9,  Incorrect = -2 (passes to 3rd).
  - 3rd team: Correct = +8,  Incorrect = -2 (round ends).
- Team-wise Tech Detective Leaderboard with Admin manual score editing.

### 4. Game 2: Lightning Talks
- Conducted team-wise based on Tech Detective leaderboard rankings.
- Non-duplicate technical topic assignment across all participants.
- 1-minute countdown timer per speaker.
- Speaker must explain the concept without uttering the topic name or prohibited words.
- Admin evaluates each speaker across 3 criteria:
  1. Time Management (1-min utilization, 0–10 pts)
  2. Words Used (vocabulary & avoiding topic name, 0–10 pts)
  3. Understandability (clarity, 0–10 pts)
- Points contribute directly to the participant's team score.
- Admin can view and edit assigned scores.

### 5. Final Combined Leaderboard
- Authoritative table:
  | Rank | Team Name | Tech Detective Score | Lightning Talks Score | Total Score |
- Top 3 podium display (Gold 🥇, Silver 🥈, Bronze 🥉).
- Combined score calculation: Game 1 Points + Game 2 Points.
- Admin manual override permissions; view-only for participants.

---

## Verification Results

| Layer | Command | Status |
|---|---|---|
| **Backend Tests** | `pytest tests/ -v` | ✅ 11/11 tests passed |
| **Frontend Production Build** | `npm run build` | ✅ Built in 1.84s (0 TypeScript errors) |
| **Database Seeding** | `python seed_db.py` | ✅ 1 Admin, 10 Participants, 25 Questions, 25 Topics |
