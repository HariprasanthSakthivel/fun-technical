"""Team formation and management for Fun Friday Activities Platform.

Implements random division of logged-in participants:
- Even participant count: teams of 2 members each.
- Odd participant count: teams of 2 members each, with one team containing 3 members.
- Editable team names.
"""

import random
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user, require_admin
from app.models.models import Team, User
from app.schemas.schemas import RandomizeTeamsRequest, TeamMemberInfo, TeamNameUpdate, TeamResponse

router = APIRouter(prefix="/teams", tags=["Teams"])

DEFAULT_TEAM_NAMES = [
    "Cyber Titans",
    "Code Mavericks",
    "Byte Busters",
    "Binary Bandits",
    "Pixel Pioneers",
    "Logic Legends",
    "Kernel Knights",
    "Syntax Strikers",
    "Quantum Quarks",
    "Vector Voyagers",
    "Data Dynamos",
    "Cloud Crusaders",
]


def serialize_team(team: Team) -> TeamResponse:
    member_infos = [
        TeamMemberInfo(id=m.id, username=m.username, display_name=m.display_name)
        for m in team.members
    ]
    return TeamResponse(
        id=team.id,
        team_name=team.team_name,
        team_code=team.team_code,
        tech_detective_score=team.tech_detective_score,
        lightning_talks_score=team.lightning_talks_score,
        total_score=team.total_score,
        rank=team.rank,
        members=member_infos,
    )


@router.get("", response_model=list[TeamResponse])
def list_teams(db: Session = Depends(get_db)):
    """List all formed teams with members and scores."""
    teams = db.query(Team).order_by(Team.id.asc()).all()
    return [serialize_team(t) for t in teams]


@router.get("/my-team", response_model=TeamResponse)
def get_my_team(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get the assigned team details for the currently authenticated participant."""
    if not current_user.team_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="You have not been assigned to a team yet. Please wait for the admin to form teams.",
        )

    team = db.query(Team).filter(Team.id == current_user.team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assigned team not found")

    return serialize_team(team)


@router.post("/randomize", response_model=list[TeamResponse])
def randomize_teams(
    payload: RandomizeTeamsRequest | None = None,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin endpoint: Randomly divide participants into balanced teams.
    
    Dynamically balances teams based on `team_size` (default: 2, but supports 3, 4, 5, etc.):
    - Shuffles participants randomly.
    - Forms at least 2 teams whenever there are >= 2 participants.
    - If include_all is False, prioritizes logged-in participants; if True, includes all registered participants.
    """
    from app.api.games import recalculate_all_team_totals

    target_size = payload.team_size if (payload and payload.team_size and payload.team_size >= 2) else 2
    include_all = payload.include_all if (payload and payload.include_all is not None) else False

    # 1. Fetch participants
    if include_all:
        participants = (
            db.query(User)
            .filter(User.role == "participant", User.is_active.is_(True))
            .all()
        )
    else:
        participants = (
            db.query(User)
            .filter(User.role == "participant", User.is_logged_in.is_(True))
            .all()
        )
        if len(participants) < 2:
            participants = (
                db.query(User)
                .filter(User.role == "participant", User.is_active.is_(True))
                .all()
            )

    n = len(participants)
    if n < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"At least 2 participants are required to form teams. Currently found {n}.",
        )

    # 2. Shuffle participants randomly
    shuffled = list(participants)
    random.shuffle(shuffled)

    # 3. Clear existing team assignments
    db.query(User).filter(User.role == "participant").update({User.team_id: None})
    db.query(Team).delete()
    db.commit()

    # 4. Dynamically determine team count and sizes
    # We want teams of `target_size` (e.g. 2).
    # If there is an odd person (e.g. 11 participants with target_size 2),
    # they must NOT form a lonely 1-person team.
    # Instead, we form exactly n // target_size teams (5 teams) and distribute the extra person
    # into one of the teams to make a team of 3.
    num_teams = max(2, n // target_size)
    num_teams = min(n, num_teams)

    base_size = n // num_teams
    remainder = n % num_teams

    # Distribute: the first `remainder` teams get base_size + 1 (e.g. 3), and the rest get base_size (e.g. 2)
    team_sizes = [base_size + (1 if i < remainder else 0) for i in range(num_teams)]

    teams_created: list[Team] = []
    names_pool = list(DEFAULT_TEAM_NAMES)
    random.shuffle(names_pool)

    current_idx = 0
    for i, size in enumerate(team_sizes):
        t_id = f"T{i + 1:02d}"
        t_name = names_pool[i % len(names_pool)] if i < len(names_pool) else f"Team {i + 1}"
        t_code = f"TEAM{i + 1}"

        team = Team(
            id=t_id,
            team_name=t_name,
            team_code=t_code,
            tech_detective_score=0,
            lightning_talks_score=0,
            total_score=0,
            rank=i + 1,
        )
        db.add(team)
        db.flush()

        for m_offset in range(size):
            member = shuffled[current_idx + m_offset]
            member.team_id = team.id

        current_idx += size
        teams_created.append(team)

    db.commit()
    recalculate_all_team_totals(db)

    for t in teams_created:
        db.refresh(t)

    return [serialize_team(t) for t in teams_created]


@router.put("/{team_id}/name", response_model=TeamResponse)
def update_team_name(
    team_id: str,
    payload: TeamNameUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update team name. Allowed by Admin OR members of that team."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if current_user.role != "admin" and current_user.team_id != team_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only edit your own team's name",
        )

    team.team_name = payload.team_name.strip()
    db.commit()
    db.refresh(team)
    return serialize_team(team)
