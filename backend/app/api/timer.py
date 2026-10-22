"""Synchronized Dynamic Game Timer API endpoints for Fun Friday Activities Platform.

Allows Admin to start, pause, resume, reset, and configure timer duration (1m, 2m, custom)
for both Game 1 (Tech Detective) and Game 2 (Lightning Talks), with live synchronization
reflected across all participant views.
"""

from datetime import datetime, timezone
import time
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import GameState, User
from app.schemas.schemas import GameTimerControlRequest, GameTimerResponse

router = APIRouter(prefix="/timer", tags=["Synchronized Dynamic Timer"])


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def get_or_create_game_state(db: Session) -> GameState:
    state = db.query(GameState).filter(GameState.id == 1).first()
    if not state:
        state = GameState(
            id=1,
            current_game="lobby",
            is_buzzer_open=False,
            timer_total_duration=60,
            timer_seconds_remaining=60.0,
            timer_is_running=False,
            timer_end_time=None,
            timer_game="all",
        )
        db.add(state)
        db.commit()
        db.refresh(state)
    return state


@router.get("", response_model=GameTimerResponse)
def get_timer_state(db: Session = Depends(get_db)):
    """Fetch current synchronized game timer state.
    
    Accessible by both Admin and all Participants.
    Accurately computes seconds_remaining based on current server epoch time.
    """
    state = get_or_create_game_state(db)
    now = time.time()

    rem = state.timer_seconds_remaining
    if state.timer_is_running:
        if state.timer_end_time is not None:
            rem = max(0.0, state.timer_end_time - now)
            if rem <= 0.0:
                # Timer naturally expired
                state.timer_is_running = False
                state.timer_seconds_remaining = 0.0
                state.timer_end_time = None
                db.commit()
                rem = 0.0
        else:
            state.timer_is_running = False
            state.timer_end_time = None
            db.commit()

    return GameTimerResponse(
        total_duration=state.timer_total_duration,
        seconds_remaining=round(rem, 1),
        is_running=state.timer_is_running,
        end_time=state.timer_end_time,
        game=state.timer_game,
        current_game=state.current_game,
    )


@router.post("/control", response_model=GameTimerResponse)
def control_timer(
    payload: GameTimerControlRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint to dynamically control the game timer:
    - 'start': start countdown from current remaining or specified duration
    - 'pause': halt countdown, holding current second
    - 'resume': continue countdown from paused point
    - 'reset': return to initial total duration (stopped)
    - 'set_duration': set new total duration (e.g. 60 for 1m, 120 for 2m)
    - 'add_time': adjust remaining seconds (e.g. +30s, -10s)
    """
    state = get_or_create_game_state(db)
    now = time.time()

    if payload.game:
        state.timer_game = payload.game

    if payload.action == "set_duration":
        dur = payload.duration_seconds if payload.duration_seconds and payload.duration_seconds > 0 else 60
        state.timer_total_duration = dur
        state.timer_seconds_remaining = float(dur)
        state.timer_is_running = False
        state.timer_end_time = None

    elif payload.action in ("start", "resume"):
        if payload.duration_seconds and payload.duration_seconds > 0:
            state.timer_total_duration = payload.duration_seconds
            state.timer_seconds_remaining = float(payload.duration_seconds)
        elif state.timer_seconds_remaining <= 0.0:
            # Auto-restart from full duration if previously finished
            state.timer_seconds_remaining = float(state.timer_total_duration)

        state.timer_is_running = True
        state.timer_end_time = now + state.timer_seconds_remaining

    elif payload.action == "pause":
        if state.timer_is_running and state.timer_end_time is not None:
            state.timer_seconds_remaining = max(0.0, state.timer_end_time - now)
        state.timer_is_running = False
        state.timer_end_time = None

    elif payload.action == "reset":
        if payload.duration_seconds and payload.duration_seconds > 0:
            state.timer_total_duration = payload.duration_seconds
        state.timer_is_running = False
        state.timer_seconds_remaining = float(state.timer_total_duration)
        state.timer_end_time = None

    elif payload.action == "add_time":
        delta = payload.duration_seconds if payload.duration_seconds is not None else 30
        if state.timer_is_running and state.timer_end_time is not None:
            current_rem = max(0.0, state.timer_end_time - now)
            new_rem = max(0.0, current_rem + delta)
            state.timer_seconds_remaining = new_rem
            state.timer_end_time = now + new_rem
        else:
            state.timer_seconds_remaining = max(0.0, state.timer_seconds_remaining + delta)

    state.updated_at = utc_now()
    db.commit()
    db.refresh(state)

    rem = state.timer_seconds_remaining
    if state.timer_is_running and state.timer_end_time is not None:
        rem = max(0.0, state.timer_end_time - now)

    return GameTimerResponse(
        total_duration=state.timer_total_duration,
        seconds_remaining=round(rem, 1),
        is_running=state.timer_is_running,
        end_time=state.timer_end_time,
        game=state.timer_game,
        current_game=state.current_game,
    )
