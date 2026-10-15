"""Real-time WebSocket and HTTP endpoints for game engine controls, buzzer, and answer submission.

Protocol:
Client to Server Events:
  - join_session: { token: string }
  - buzz: { idempotency_key?: string }
  - submit_answer: { answer_text: string }
  - request_game_state: {}

Server to Client Events:
  - session_started
  - question_unlocked
  - buzzer_opened
  - buzzer_position_confirmed
  - buzzer_closed
  - answer_submitted
  - answers_ready
  - answer_revealed
  - question_completed
  - session_completed
  - game_state_updated
  - error
"""

import json
import logging
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.core.security import decode_access_token
from app.models.models import GameSession, User
from app.services.connection_manager import ws_manager
from app.services.game_engine import game_engine

logger = logging.getLogger("live_game_api")

router = APIRouter(prefix="/live", tags=["Live Game Engine"])


# ── Pydantic Request Models ────────────────────────────────────────────────────

class UnlockQuestionRequest(BaseModel):
    explaining_team_id: str | None = Field(
        None, description="Optional explaining team ID for Explain Without Naming"
    )


class BuzzerRequest(BaseModel):
    idempotency_key: str | None = Field(None, description="Client-provided idempotency key")


class SubmitAnswerRequest(BaseModel):
    answer_text: str = Field(..., min_length=1, max_length=2000, description="Submitted answer text")


# ── HTTP Control Endpoints (Admin & REST Fallbacks) ────────────────────────────

@router.get("/sessions/{session_id}/state")
def get_session_live_state(
    session_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Retrieve full authoritative game state for Admin Game Control Panel."""
    state = game_engine.build_admin_state(db, session_id)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found")
    return state


@router.post("/sessions/{session_id}/start")
async def start_session_live(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin starts a Ready session into Live."""
    return await game_engine.start_game(db, session_id)


@router.post("/sessions/{session_id}/unlock")
async def unlock_current_question(
    session_id: str,
    data: UnlockQuestionRequest,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin unlocks the current question and opens buzzer."""
    return await game_engine.unlock_question(db, session_id, explaining_team_id=data.explaining_team_id)


@router.post("/sessions/{session_id}/close-buzzer")
async def close_question_buzzer(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin closes buzzer queue."""
    return await game_engine.close_buzzer(db, session_id)


@router.post("/sessions/{session_id}/reveal")
async def reveal_question_answer(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin reveals the correct answer and evaluation."""
    return await game_engine.reveal_answer(db, session_id)


@router.post("/sessions/{session_id}/next")
async def advance_to_next_question(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin advances to next configured question."""
    return await game_engine.next_question(db, session_id)


@router.post("/sessions/{session_id}/complete")
async def complete_live_session(
    session_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Admin completes the game session."""
    return await game_engine.complete_session(db, session_id)


# ── Participant REST Fallbacks (Concurrent-Safe) ───────────────────────────────

@router.get("/sessions/{session_id}/participant-state")
def get_participant_live_state(
    session_id: str,
    team_id: str,
    db: Session = Depends(get_db),
):
    """Retrieve scoped participant state without answer clues."""
    state = game_engine.build_participant_state(db, session_id, team_id)
    if not state:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Session '{session_id}' not found")
    return state


@router.post("/sessions/{session_id}/buzz")
async def participant_press_buzzer(
    session_id: str,
    team_id: str,
    data: BuzzerRequest,
    db: Session = Depends(get_db),
):
    """Participant presses buzzer via REST call."""
    res = await game_engine.handle_buzz(
        db, session_id, team_id, idempotency_key=data.idempotency_key
    )
    if not res.get("success"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=res.get("reason", "Buzzer rejected"))
    return res


@router.post("/sessions/{session_id}/submit-answer")
async def participant_submit_answer(
    session_id: str,
    team_id: str,
    data: SubmitAnswerRequest,
    db: Session = Depends(get_db),
):
    """Eligible team submits answer via REST call."""
    return await game_engine.submit_answer(db, session_id, team_id, data.answer_text)


# ── Real-Time WebSocket Endpoint ──────────────────────────────────────────────

@router.websocket("/ws/{session_id}")
async def game_websocket_endpoint(
    websocket: WebSocket,
    session_id: str,
    token: str | None = None,
    db: Session = Depends(get_db),
):
    """Authenticated bi-directional WebSocket connection for admins and participants."""
    # 1. Authenticate token query param or first message
    claims = None
    if token:
        claims = decode_access_token(token)

    metadata: dict[str, Any] = {
        "role": claims.get("role", "anonymous") if claims else "anonymous",
        "team_id": claims.get("team_id") if claims else None,
        "team_name": claims.get("team_name") if claims else None,
        "user_id": claims.get("sub") if claims else None,
    }

    await ws_manager.connect(session_id, websocket, metadata)

    try:
        # Send initial state recovery immediately on connect
        if metadata["role"] == "admin":
            initial_state = game_engine.build_admin_state(db, session_id)
            await ws_manager.send_direct(websocket, "game_state_updated", initial_state)
        elif metadata["role"] == "participant" and metadata["team_id"]:
            initial_state = game_engine.build_participant_state(db, session_id, metadata["team_id"])
            await ws_manager.send_direct(websocket, "game_state_updated", initial_state)

        # Event loop
        while True:
            text = await websocket.receive_text()
            try:
                msg = json.loads(text)
            except Exception:
                await ws_manager.send_direct(websocket, "error", {"message": "Invalid JSON format"})
                continue

            event = msg.get("event")
            payload = msg.get("data", {})

            # ── Client Auth Re-negotiation ──
            if event == "join_session":
                client_token = payload.get("token")
                c_claims = decode_access_token(client_token) if client_token else None
                if c_claims:
                    metadata["role"] = c_claims.get("role", "anonymous")
                    metadata["team_id"] = c_claims.get("team_id")
                    metadata["team_name"] = c_claims.get("team_name")
                    metadata["user_id"] = c_claims.get("sub")

                    if metadata["role"] == "admin":
                        s = game_engine.build_admin_state(db, session_id)
                        await ws_manager.send_direct(websocket, "game_state_updated", s)
                    elif metadata["team_id"]:
                        s = game_engine.build_participant_state(db, session_id, metadata["team_id"])
                        await ws_manager.send_direct(websocket, "game_state_updated", s)
                else:
                    await ws_manager.send_direct(websocket, "error", {"message": "Invalid token"})

            # ── Client State Request ──
            elif event == "request_game_state":
                if metadata["role"] == "admin":
                    s = game_engine.build_admin_state(db, session_id)
                    await ws_manager.send_direct(websocket, "game_state_updated", s)
                elif metadata["team_id"]:
                    s = game_engine.build_participant_state(db, session_id, metadata["team_id"])
                    await ws_manager.send_direct(websocket, "game_state_updated", s)

            # ── Buzzer Press ──
            elif event == "buzz":
                team_id = metadata.get("team_id")
                if not team_id or metadata["role"] != "participant":
                    await ws_manager.send_direct(
                        websocket, "error", {"message": "Unauthorized: only participating teams can buzz"}
                    )
                    continue

                idempotency_key = payload.get("idempotency_key")
                res = await game_engine.handle_buzz(db, session_id, team_id, idempotency_key=idempotency_key)
                if not res.get("success"):
                    await ws_manager.send_direct(
                        websocket, "error", {"message": res.get("reason", "Buzzer press rejected")}
                    )

            # ── Submit Answer ──
            elif event == "submit_answer":
                team_id = metadata.get("team_id")
                if not team_id or metadata["role"] != "participant":
                    await ws_manager.send_direct(
                        websocket, "error", {"message": "Unauthorized: only participating teams can submit answers"}
                    )
                    continue

                answer_text = payload.get("answer_text", "")
                try:
                    await game_engine.submit_answer(db, session_id, team_id, answer_text)
                    await ws_manager.send_direct(
                        websocket,
                        "answer_submitted",
                        {"team_id": team_id, "status": "submitted", "message": "Answer received by server"},
                    )
                except Exception as e:
                    await ws_manager.send_direct(websocket, "error", {"message": str(e)})

    except WebSocketDisconnect:
        await ws_manager.disconnect(session_id, websocket)
    except Exception as e:
        logger.error(f"WebSocket error in session {session_id}: {e}")
        await ws_manager.disconnect(session_id, websocket)
