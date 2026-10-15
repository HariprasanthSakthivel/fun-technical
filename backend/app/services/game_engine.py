"""Authoritative Game Engine Service for Fun & Technical Activity Platform.

Enforces:
1. Sequential question unlocking (admin explicit unlock).
2. Per-session concurrency synchronization (via per-session asyncio.Lock).
3. Authoritative buzzer queueing (default 3 distinct eligible teams, rejection of 4th+).
4. Idempotent duplicate buzzer press handling.
5. Answer submission for eligible teams only.
6. Safe normalized answer evaluation without leaking answers before reveal.
7. Explain Without Naming secret topic visibility restriction (only explaining team).
8. Question and session completion persistence.
"""

import asyncio
from datetime import datetime, timezone
import re
from typing import Any
from sqlalchemy.orm import Session

from app.core.exceptions import AppError
from app.models.models import (
    AnswerSubmission,
    BuzzerPosition,
    GameSession,
    LiveGameState,
    Question,
    SessionQuestion,
    SessionTeam,
    Team,
)
from app.services.connection_manager import ws_manager


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_answer(text: str) -> str:
    """Safely normalize answers: trim, lowercase, collapse multiple whitespace."""
    if not text:
        return ""
    # Collapse multiple spaces, tabs, newlines into single space
    cleaned = re.sub(r"\s+", " ", text.strip())
    return cleaned.lower()


class GameEngine:
    """Manages server-authoritative live session gameplay."""

    def __init__(self) -> None:
        # Per-session lock for atomic buzzer and state transactions
        self._session_locks: dict[str, asyncio.Lock] = {}
        self._global_lock = asyncio.Lock()

    async def get_session_lock(self, session_id: str) -> asyncio.Lock:
        """Get or initialize an asyncio Lock for a given session."""
        async with self._global_lock:
            if session_id not in self._session_locks:
                self._session_locks[session_id] = asyncio.Lock()
            return self._session_locks[session_id]

    def _get_max_eligible_teams(self, session: GameSession) -> int:
        """Read max eligible teams from session game_rules (default 3)."""
        rules = session.game_rules or {}
        return rules.get("maxEligibleTeams", 3)

    # ── State Initialization & Recovery ────────────────────────────────────────

    def get_or_create_live_state(self, db: Session, session: GameSession) -> LiveGameState:
        """Fetch persistent LiveGameState or initialize for a live session."""
        live_state = db.query(LiveGameState).filter(LiveGameState.session_id == session.id).first()
        if not live_state:
            # Order questions by configured question_order
            first_sq = (
                db.query(SessionQuestion)
                .filter(SessionQuestion.session_id == session.id)
                .order_by(SessionQuestion.question_order.asc())
                .first()
            )

            # Designate initial explaining team if Explain Without Naming
            explaining_team_id = None
            if session.game_type == "explain-without-naming":
                first_st = (
                    db.query(SessionTeam)
                    .filter(SessionTeam.session_id == session.id)
                    .order_by(SessionTeam.id.asc())
                    .first()
                )
                if first_st:
                    explaining_team_id = first_st.team_id

            live_state = LiveGameState(
                session_id=session.id,
                current_question_index=0,
                current_question_id=first_sq.question_id if first_sq else None,
                explaining_team_id=explaining_team_id,
                is_question_unlocked=False,
                is_buzzer_open=False,
                is_answer_revealed=False,
                is_question_completed=False,
            )
            db.add(live_state)
            db.commit()
            db.refresh(live_state)

        return live_state

    # ── Admin Controls ─────────────────────────────────────────────────────────

    async def start_game(self, db: Session, session_id: str) -> dict[str, Any]:
        """Start a Ready session -> Live."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError(f"Session '{session_id}' not found", status_code=404)
            if session.status != "ready":
                raise AppError(f"Cannot start session in status '{session.status}'. Must be 'ready'.")

            if len(session.session_questions) < 1:
                raise AppError("Session configuration incomplete: no questions configured.")
            if len(session.session_teams) < 2:
                raise AppError("Session configuration incomplete: at least 2 teams required.")

            session.status = "live"
            live_state = self.get_or_create_live_state(db, session)
            db.commit()

            state_summary = self.build_admin_state(db, session_id)
            await ws_manager.broadcast_to_session(session_id, "session_started", state_summary)
            return state_summary

    async def unlock_question(
        self,
        db: Session,
        session_id: str,
        explaining_team_id: str | None = None,
    ) -> dict[str, Any]:
        """Admin unlocks the current question and opens the buzzer queue."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session or session.status != "live":
                raise AppError("Session must be in 'live' status to unlock questions.")

            live_state = self.get_or_create_live_state(db, session)

            if live_state.is_question_unlocked and not live_state.is_question_completed:
                raise AppError("Current question is already unlocked. Close or complete it before unlocking again.")

            # Resolve current question
            ordered_questions = (
                db.query(SessionQuestion)
                .filter(SessionQuestion.session_id == session.id)
                .order_by(SessionQuestion.question_order.asc())
                .all()
            )
            if live_state.current_question_index >= len(ordered_questions):
                raise AppError("No more questions remaining in this session.")

            current_sq = ordered_questions[live_state.current_question_index]
            question = db.query(Question).filter(Question.id == current_sq.question_id).first()
            if not question:
                raise AppError(f"Question '{current_sq.question_id}' not found.")

            # For Explain Without Naming: enforce explaining team
            if session.game_type == "explain-without-naming":
                if explaining_team_id:
                    # Validate team is in session
                    st = (
                        db.query(SessionTeam)
                        .filter(SessionTeam.session_id == session.id, SessionTeam.team_id == explaining_team_id)
                        .first()
                    )
                    if not st:
                        raise AppError(f"Selected explaining team '{explaining_team_id}' is not in this session.")
                    live_state.explaining_team_id = explaining_team_id
                elif not live_state.explaining_team_id:
                    raise AppError("An explaining team must be assigned before unlocking an explanation question.")

            # Clear any stale buzzer presses or submissions for this question
            db.query(BuzzerPosition).filter(
                BuzzerPosition.session_id == session_id,
                BuzzerPosition.question_id == question.id,
            ).delete()
            db.query(AnswerSubmission).filter(
                AnswerSubmission.session_id == session_id,
                AnswerSubmission.question_id == question.id,
            ).delete()

            # Set authoritative state
            live_state.current_question_id = question.id
            live_state.is_question_unlocked = True
            live_state.is_buzzer_open = True
            live_state.is_answer_revealed = False
            live_state.is_question_completed = False
            live_state.unlocked_at = utc_now()
            live_state.buzzer_closed_at = None
            live_state.revealed_at = None

            db.commit()

            # Broadcast notifications
            admin_state = self.build_admin_state(db, session_id)
            await ws_manager.send_to_role(session_id, "admin", "question_unlocked", admin_state)
            await ws_manager.send_to_role(session_id, "admin", "buzzer_opened", {"question_id": question.id})

            # Participant broadcasts (customized per team for security)
            await self._broadcast_participant_state(db, session, live_state, question)

            return admin_state

    async def close_buzzer(self, db: Session, session_id: str) -> dict[str, Any]:
        """Admin or engine closes buzzer for the active question."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError("Session not found", status_code=404)
            live_state = self.get_or_create_live_state(db, session)

            if not live_state.is_buzzer_open:
                return self.build_admin_state(db, session_id)

            live_state.is_buzzer_open = False
            live_state.buzzer_closed_at = utc_now()
            db.commit()

            queue = self.get_buzzer_queue(db, session_id, live_state.current_question_id)
            event_data = {
                "question_id": live_state.current_question_id,
                "buzzer_open": False,
                "eligible_teams": queue,
            }
            await ws_manager.broadcast_to_session(session_id, "buzzer_closed", event_data)
            return self.build_admin_state(db, session_id)

    async def reveal_answer(self, db: Session, session_id: str) -> dict[str, Any]:
        """Admin reveals the correct answer and evaluation results."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError("Session not found", status_code=404)
            live_state = self.get_or_create_live_state(db, session)

            if not live_state.is_question_unlocked:
                raise AppError("No question is currently unlocked to reveal.")

            # Close buzzer if still open
            live_state.is_buzzer_open = False
            live_state.is_answer_revealed = True
            live_state.is_question_completed = True
            live_state.revealed_at = utc_now()

            # Authoritatively evaluate any pending submissions
            question = db.query(Question).filter(Question.id == live_state.current_question_id).first()
            self._evaluate_submissions_for_question(db, session_id, question)
            db.commit()

            admin_state = self.build_admin_state(db, session_id)
            results_payload = self.build_reveal_results(db, session_id, question)

            await ws_manager.send_to_role(session_id, "admin", "answer_revealed", admin_state)
            await ws_manager.broadcast_to_session(session_id, "answer_revealed", results_payload)
            return admin_state

    async def next_question(self, db: Session, session_id: str) -> dict[str, Any]:
        """Advance to next configured question (keeps it locked until admin unlocks)."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError("Session not found", status_code=404)
            live_state = self.get_or_create_live_state(db, session)

            ordered_questions = (
                db.query(SessionQuestion)
                .filter(SessionQuestion.session_id == session.id)
                .order_by(SessionQuestion.question_order.asc())
                .all()
            )

            next_idx = live_state.current_question_index + 1
            if next_idx >= len(ordered_questions):
                raise AppError("All questions completed. You can now complete the session.")

            next_sq = ordered_questions[next_idx]
            live_state.current_question_index = next_idx
            live_state.current_question_id = next_sq.question_id
            live_state.is_question_unlocked = False
            live_state.is_buzzer_open = False
            live_state.is_answer_revealed = False
            live_state.is_question_completed = False
            live_state.unlocked_at = None
            live_state.buzzer_closed_at = None
            live_state.revealed_at = None

            # Rotate or reset explaining team if needed
            if session.game_type == "explain-without-naming":
                # Advance explaining team to next registered team in round-robin fashion
                teams = (
                    db.query(SessionTeam)
                    .filter(SessionTeam.session_id == session.id)
                    .order_by(SessionTeam.id.asc())
                    .all()
                )
                if teams:
                    t_idx = next_idx % len(teams)
                    live_state.explaining_team_id = teams[t_idx].team_id

            db.commit()

            admin_state = self.build_admin_state(db, session_id)
            await ws_manager.send_to_role(session_id, "admin", "game_state_updated", admin_state)
            await ws_manager.broadcast_to_session(
                session_id,
                "question_completed",
                {"question_index": next_idx, "message": "Moving to next question. Awaiting unlock."},
            )
            return admin_state

    async def complete_session(self, db: Session, session_id: str) -> dict[str, Any]:
        """Admin marks the session completed."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError("Session not found", status_code=404)
            session.status = "completed"

            live_state = self.get_or_create_live_state(db, session)
            live_state.is_buzzer_open = False
            live_state.is_question_completed = True
            db.commit()

            admin_state = self.build_admin_state(db, session_id)
            await ws_manager.broadcast_to_session(session_id, "session_completed", admin_state)
            return admin_state

    async def cancel_session(self, db: Session, session_id: str) -> dict[str, Any]:
        """Admin cancels session."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session:
                raise AppError("Session not found", status_code=404)
            session.status = "cancelled"

            live_state = self.get_or_create_live_state(db, session)
            live_state.is_buzzer_open = False
            db.commit()

            admin_state = self.build_admin_state(db, session_id)
            await ws_manager.broadcast_to_session(session_id, "game_state_updated", admin_state)
            return admin_state

    # ── Buzzer System (Concurrency Safe) ───────────────────────────────────────

    async def handle_buzz(
        self,
        db: Session,
        session_id: str,
        team_id: str,
        idempotency_key: str | None = None,
    ) -> dict[str, Any]:
        """Atomically evaluates and records a buzzer press for a participating team."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session or session.status != "live":
                return {"success": False, "reason": "Session is not currently live"}

            live_state = self.get_or_create_live_state(db, session)

            if not live_state.is_question_unlocked:
                return {"success": False, "reason": "Question is locked"}

            if not live_state.is_buzzer_open:
                return {"success": False, "reason": "Buzzer is closed"}

            question_id = live_state.current_question_id
            if not question_id:
                return {"success": False, "reason": "No active question configured"}

            # For Explain Without Naming: explaining team cannot buzz
            if session.game_type == "explain-without-naming" and live_state.explaining_team_id == team_id:
                return {"success": False, "reason": "Explaining team cannot press buzzer"}

            # Verify team is registered for session
            st = (
                db.query(SessionTeam)
                .filter(SessionTeam.session_id == session_id, SessionTeam.team_id == team_id)
                .first()
            )
            if not st:
                return {"success": False, "reason": "Team is not registered for this session"}

            # Check if team already pressed buzzer (idempotency check)
            existing_pos = (
                db.query(BuzzerPosition)
                .filter(
                    BuzzerPosition.session_id == session_id,
                    BuzzerPosition.question_id == question_id,
                    BuzzerPosition.team_id == team_id,
                )
                .first()
            )
            if existing_pos:
                # Idempotent response: return previously secured position
                return {
                    "success": True,
                    "position": existing_pos.position,
                    "eligible": True,
                    "message": f"Position {existing_pos.position} already confirmed",
                }

            # Check existing queue count against max eligible teams limit
            max_teams = self._get_max_eligible_teams(session)
            current_queue = (
                db.query(BuzzerPosition)
                .filter(
                    BuzzerPosition.session_id == session_id,
                    BuzzerPosition.question_id == question_id,
                )
                .order_by(BuzzerPosition.position.asc())
                .all()
            )

            if len(current_queue) >= max_teams:
                # 4th and subsequent teams rejected
                return {
                    "success": False,
                    "reason": "Max eligible teams reached for this question",
                    "eligible": False,
                }

            # Server-authoritative position assignment
            assigned_position = len(current_queue) + 1
            new_buzzer = BuzzerPosition(
                session_id=session_id,
                question_id=question_id,
                team_id=team_id,
                position=assigned_position,
                pressed_at=utc_now(),
                idempotency_key=idempotency_key,
            )
            db.add(new_buzzer)

            # If capacity reached, close buzzer automatically
            if assigned_position >= max_teams:
                live_state.is_buzzer_open = False
                live_state.buzzer_closed_at = utc_now()

            db.commit()

            # Fetch team metadata for notifications
            team = db.query(Team).filter(Team.id == team_id).first()
            team_name = team.team_name if team else team_id

            # Broadcast updated queue and notifications
            updated_queue = self.get_buzzer_queue(db, session_id, question_id)
            await ws_manager.broadcast_to_session(
                session_id,
                "buzzer_position_confirmed",
                {
                    "team_id": team_id,
                    "team_name": team_name,
                    "position": assigned_position,
                    "eligible_teams": updated_queue,
                    "buzzer_open": live_state.is_buzzer_open,
                },
            )

            if not live_state.is_buzzer_open:
                await ws_manager.broadcast_to_session(
                    session_id,
                    "buzzer_closed",
                    {"question_id": question_id, "buzzer_open": False, "eligible_teams": updated_queue},
                )

            return {
                "success": True,
                "position": assigned_position,
                "eligible": True,
                "buzzer_open": live_state.is_buzzer_open,
            }

    # ── Answer Submission ──────────────────────────────────────────────────────

    async def submit_answer(
        self,
        db: Session,
        session_id: str,
        team_id: str,
        answer_text: str,
    ) -> dict[str, Any]:
        """Accept answer submission from eligible teams."""
        lock = await self.get_session_lock(session_id)
        async with lock:
            session = db.query(GameSession).filter(GameSession.id == session_id).first()
            if not session or session.status != "live":
                raise AppError("Session is not live")

            live_state = self.get_or_create_live_state(db, session)
            if not live_state.is_question_unlocked:
                raise AppError("Question is not currently active")
            if live_state.is_answer_revealed or live_state.is_question_completed:
                raise AppError("Answer submission window is closed for this question")

            question_id = live_state.current_question_id
            if not question_id:
                raise AppError("No active question configured")

            # Verify team secured a buzzer position (eligibility)
            buzzer_pos = (
                db.query(BuzzerPosition)
                .filter(
                    BuzzerPosition.session_id == session_id,
                    BuzzerPosition.question_id == question_id,
                    BuzzerPosition.team_id == team_id,
                )
                .first()
            )
            if not buzzer_pos:
                raise AppError("Team is not eligible to submit an answer (buzzer position required)", status_code=403)

            # Prevent duplicate submissions
            existing_sub = (
                db.query(AnswerSubmission)
                .filter(
                    AnswerSubmission.session_id == session_id,
                    AnswerSubmission.question_id == question_id,
                    AnswerSubmission.team_id == team_id,
                )
                .first()
            )
            if existing_sub:
                raise AppError("Answer has already been submitted by this team", status_code=409)

            # Clean and store answer
            cleaned_answer = answer_text.strip()
            if not cleaned_answer:
                raise AppError("Answer text cannot be empty")

            submission = AnswerSubmission(
                session_id=session_id,
                question_id=question_id,
                team_id=team_id,
                answer_text=cleaned_answer,
                submitted_at=utc_now(),
                evaluation_status="pending",
            )
            db.add(submission)
            db.commit()

            team = db.query(Team).filter(Team.id == team_id).first()
            team_name = team.team_name if team else team_id

            # Check if all eligible teams have submitted
            all_buzzed = (
                db.query(BuzzerPosition)
                .filter(BuzzerPosition.session_id == session_id, BuzzerPosition.question_id == question_id)
                .all()
            )
            all_subs = (
                db.query(AnswerSubmission)
                .filter(AnswerSubmission.session_id == session_id, AnswerSubmission.question_id == question_id)
                .all()
            )

            # Notify admin
            await ws_manager.send_to_role(
                session_id,
                "admin",
                "answer_submitted",
                {
                    "team_id": team_id,
                    "team_name": team_name,
                    "submissions_count": len(all_subs),
                    "eligible_count": len(all_buzzed),
                },
            )

            if len(all_subs) >= len(all_buzzed) and len(all_buzzed) > 0:
                await ws_manager.send_to_role(
                    session_id,
                    "admin",
                    "answers_ready",
                    {"message": "All eligible teams have submitted answers.", "count": len(all_subs)},
                )

            return {
                "success": True,
                "team_id": team_id,
                "submitted_at": submission.submitted_at.isoformat(),
                "evaluation_status": "pending",
            }

    # ── Answer Evaluation ──────────────────────────────────────────────────────

    def _evaluate_submissions_for_question(
        self,
        db: Session,
        session_id: str,
        question: Question,
    ) -> None:
        """Normalized comparison of submitted answers against correct and accepted answers."""
        if not question:
            return

        normalized_correct = normalize_answer(question.correct_answer)
        accepted_set = {normalize_answer(ans) for ans in (question.accepted_answers or []) if ans}
        accepted_set.add(normalized_correct)

        submissions = (
            db.query(AnswerSubmission)
            .filter(
                AnswerSubmission.session_id == session_id,
                AnswerSubmission.question_id == question.id,
            )
            .all()
        )

        for sub in submissions:
            norm_sub = normalize_answer(sub.answer_text)
            sub.is_correct = norm_sub in accepted_set
            sub.evaluation_status = "evaluated"
            sub.evaluated_at = utc_now()

    # ── Payload Construction ───────────────────────────────────────────────────

    def get_buzzer_queue(self, db: Session, session_id: str, question_id: str | None) -> list[dict[str, Any]]:
        """Return list of confirmed buzzer entries for a question."""
        if not question_id:
            return []
        positions = (
            db.query(BuzzerPosition)
            .filter(BuzzerPosition.session_id == session_id, BuzzerPosition.question_id == question_id)
            .order_by(BuzzerPosition.position.asc())
            .all()
        )
        results = []
        for p in positions:
            team = db.query(Team).filter(Team.id == p.team_id).first()
            results.append(
                {
                    "position": p.position,
                    "team_id": p.team_id,
                    "team_name": team.team_name if team else p.team_id,
                    "pressed_at": p.pressed_at.isoformat(),
                }
            )
        return results

    def build_admin_state(self, db: Session, session_id: str) -> dict[str, Any]:
        """Construct comprehensive state representation for Admin Control Panel."""
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            return {}

        live_state = self.get_or_create_live_state(db, session)
        ordered_sqs = (
            db.query(SessionQuestion)
            .filter(SessionQuestion.session_id == session.id)
            .order_by(SessionQuestion.question_order.asc())
            .all()
        )

        current_q = None
        if live_state.current_question_id:
            current_q = db.query(Question).filter(Question.id == live_state.current_question_id).first()

        queue = self.get_buzzer_queue(db, session_id, live_state.current_question_id)

        # Submissions
        submissions = []
        if live_state.current_question_id:
            subs = (
                db.query(AnswerSubmission)
                .filter(
                    AnswerSubmission.session_id == session_id,
                    AnswerSubmission.question_id == live_state.current_question_id,
                )
                .all()
            )
            for s in subs:
                t = db.query(Team).filter(Team.id == s.team_id).first()
                submissions.append(
                    {
                        "team_id": s.team_id,
                        "team_name": t.team_name if t else s.team_id,
                        "answer_text": s.answer_text,
                        "is_correct": s.is_correct,
                        "evaluation_status": s.evaluation_status,
                        "submitted_at": s.submitted_at.isoformat(),
                    }
                )

        explaining_team = None
        if live_state.explaining_team_id:
            t = db.query(Team).filter(Team.id == live_state.explaining_team_id).first()
            if t:
                explaining_team = {"id": t.id, "name": t.team_name, "code": t.team_code}

        return {
            "session_id": session.id,
            "session_code": session.session_code,
            "session_name": session.session_name,
            "game_type": session.game_type,
            "status": session.status,
            "total_questions": len(ordered_sqs),
            "current_question_index": live_state.current_question_index,
            "current_question_number": live_state.current_question_index + 1,
            "current_question": {
                "id": current_q.id,
                "title": current_q.title,
                "content_type": current_q.content_type,
                "text_content": current_q.text_content,
                "images": current_q.images,
                "instructions": current_q.instructions,
                "difficulty": current_q.difficulty,
                # Admin-only fields
                "correct_answer": current_q.correct_answer,
                "accepted_answers": current_q.accepted_answers,
                "explanation": current_q.explanation,
                "secret_topic": current_q.secret_topic,
                "prohibited_words": current_q.prohibited_words,
            }
            if current_q
            else None,
            "is_question_unlocked": live_state.is_question_unlocked,
            "is_buzzer_open": live_state.is_buzzer_open,
            "is_answer_revealed": live_state.is_answer_revealed,
            "is_question_completed": live_state.is_question_completed,
            "explaining_team": explaining_team,
            "buzzer_queue": queue,
            "submissions": submissions,
            "participating_teams": [
                {"id": st.team.id, "name": st.team.team_name, "code": st.team.team_code}
                for st in session.session_teams
                if st.team
            ],
            "max_eligible_teams": self._get_max_eligible_teams(session),
        }

    def build_participant_state(
        self,
        db: Session,
        session_id: str,
        team_id: str,
    ) -> dict[str, Any]:
        """Construct secure scoped participant state without leaking confidential answers."""
        session = db.query(GameSession).filter(GameSession.id == session_id).first()
        if not session:
            return {}

        live_state = self.get_or_create_live_state(db, session)
        ordered_sqs = (
            db.query(SessionQuestion)
            .filter(SessionQuestion.session_id == session.id)
            .order_by(SessionQuestion.question_order.asc())
            .all()
        )

        current_q = None
        if live_state.current_question_id and live_state.is_question_unlocked:
            current_q = db.query(Question).filter(Question.id == live_state.current_question_id).first()

        is_explaining_team = (
            session.game_type == "explain-without-naming"
            and live_state.explaining_team_id == team_id
        )

        # Team's own buzzer status
        buzzer_entry = None
        if live_state.current_question_id:
            buzzer_entry = (
                db.query(BuzzerPosition)
                .filter(
                    BuzzerPosition.session_id == session_id,
                    BuzzerPosition.question_id == live_state.current_question_id,
                    BuzzerPosition.team_id == team_id,
                )
                .first()
            )

        # Team's own submission
        submission = None
        if live_state.current_question_id:
            submission = (
                db.query(AnswerSubmission)
                .filter(
                    AnswerSubmission.session_id == session_id,
                    AnswerSubmission.question_id == live_state.current_question_id,
                    AnswerSubmission.team_id == team_id,
                )
                .first()
            )

        # Base public question payload (strictly NO correct_answer or explanation)
        public_q = None
        if current_q:
            public_q = {
                "id": current_q.id,
                "title": current_q.title,
                "content_type": current_q.content_type,
                "text_content": current_q.text_content,
                "images": current_q.images,
                "instructions": current_q.instructions,
                "difficulty": current_q.difficulty,
                "is_explaining_team": is_explaining_team,
            }
            # Only reveal secret topic to explaining team
            if is_explaining_team:
                public_q["secret_topic"] = current_q.secret_topic
                public_q["prohibited_words"] = current_q.prohibited_words
            else:
                public_q["secret_topic"] = None
                public_q["prohibited_words"] = None

        queue = self.get_buzzer_queue(db, session_id, live_state.current_question_id)

        # After reveal: include answer results if configured
        revealed_results = None
        if live_state.is_answer_revealed and current_q:
            revealed_results = {
                "correct_answer": current_q.correct_answer,
                "explanation": current_q.explanation,
                "team_is_correct": submission.is_correct if submission else False,
            }

        return {
            "session_id": session.id,
            "session_code": session.session_code,
            "session_name": session.session_name,
            "game_type": session.game_type,
            "status": session.status,
            "total_questions": len(ordered_sqs),
            "current_question_number": live_state.current_question_index + 1,
            "is_question_unlocked": live_state.is_question_unlocked,
            "is_buzzer_open": live_state.is_buzzer_open,
            "is_answer_revealed": live_state.is_answer_revealed,
            "is_question_completed": live_state.is_question_completed,
            "question": public_q,
            "is_explaining_team": is_explaining_team,
            "my_buzzer_position": buzzer_entry.position if buzzer_entry else None,
            "is_eligible": buzzer_entry is not None,
            "my_submission": {
                "answer_text": submission.answer_text,
                "is_correct": submission.is_correct if live_state.is_answer_revealed else None,
                "submitted_at": submission.submitted_at.isoformat(),
            }
            if submission
            else None,
            "eligible_teams_count": len(queue),
            "max_eligible_teams": self._get_max_eligible_teams(session),
            "revealed_results": revealed_results,
        }

    def build_reveal_results(
        self,
        db: Session,
        session_id: str,
        question: Question,
    ) -> dict[str, Any]:
        """Build public reveal payload sent after admin authorization."""
        submissions = (
            db.query(AnswerSubmission)
            .filter(
                AnswerSubmission.session_id == session_id,
                AnswerSubmission.question_id == question.id,
            )
            .all()
        )
        team_results = []
        for s in submissions:
            t = db.query(Team).filter(Team.id == s.team_id).first()
            team_results.append(
                {
                    "team_id": s.team_id,
                    "team_name": t.team_name if t else s.team_id,
                    "is_correct": s.is_correct,
                    "answer_text": s.answer_text,
                }
            )

        return {
            "question_id": question.id,
            "correct_answer": question.correct_answer,
            "explanation": question.explanation,
            "team_results": team_results,
        }

    async def _broadcast_participant_state(
        self,
        db: Session,
        session: GameSession,
        live_state: LiveGameState,
        question: Question,
    ) -> None:
        """Send scoped question clues to each participant team."""
        for st in session.session_teams:
            p_state = self.build_participant_state(db, session.id, st.team_id)
            await ws_manager.send_to_team(session.id, st.team_id, "question_unlocked", p_state)


# Global singleton engine
game_engine = GameEngine()
