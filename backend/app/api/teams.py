"""Team Management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import SessionTeam, Team, TeamMember, User
from app.schemas.schemas import TeamCreate, TeamResponse, TeamStatusUpdate, TeamUpdate

router = APIRouter(prefix="/teams", tags=["Teams"])


def generate_team_id(db: Session) -> str:
    """Generate next T01 style team identifier."""
    teams = db.query(Team.id).all()
    nums = []
    for (t_id,) in teams:
        digits = "".join(ch for ch in t_id if ch.isdigit())
        if digits:
            nums.append(int(digits))
    next_num = max(nums, default=0) + 1
    return f"T{next_num:02d}"


def serialize_team(team: Team) -> TeamResponse:
    """Convert Team model into TeamResponse schema with member names and session tally."""
    member_names = [m.member_name for m in team.members] if team.members else []
    sessions_participated = len(team.session_participations) if team.session_participations else 0

    return TeamResponse(
        id=team.id,
        team_name=team.team_name,
        team_code=team.team_code,
        description=team.description,
        team_leader=team.team_leader,
        member_count=team.member_count,
        status=team.status,
        created_at=team.created_at,
        updated_at=team.updated_at,
        member_names=member_names,
        sessions_participated=sessions_participated,
    )


@router.get("", response_model=list[TeamResponse])
def list_teams(
    status_filter: str | None = Query(None, alias="status", description="Filter by active/inactive"),
    search: str | None = Query(None, description="Search by name or code"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List all teams with optional status filter and search (Admin only)."""
    query = db.query(Team)

    if status_filter:
        query = query.filter(Team.status == status_filter)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            Team.team_name.ilike(search_term) | Team.team_code.ilike(search_term)
        )

    teams = query.order_by(Team.created_at.desc()).offset(skip).limit(limit).all()
    return [serialize_team(t) for t in teams]


@router.get("/{team_id}", response_model=TeamResponse)
def get_team(
    team_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Retrieve full details of a specific team (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team '{team_id}' not found",
        )
    return serialize_team(team)


@router.post("", response_model=TeamResponse, status_code=status.HTTP_201_CREATED)
def create_team(
    data: TeamCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Register a new team with unique code enforcement (Admin only)."""
    t_code = data.team_code.strip().toUpperCase() if hasattr(data.team_code.strip(), "toUpperCase") else data.team_code.strip().upper()

    # Enforce unique code
    if db.query(Team).filter(Team.team_code == t_code).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team code '{t_code}' is already registered",
        )

    t_id = data.id or generate_team_id(db)
    if db.query(Team).filter(Team.id == t_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Team ID '{t_id}' already exists",
        )

    new_team = Team(
        id=t_id,
        team_name=data.team_name.strip(),
        team_code=t_code,
        description=data.description.strip() if data.description else None,
        team_leader=data.team_leader.strip() if data.team_leader else None,
        member_count=data.member_count,
        status=data.status,
    )

    if data.members:
        for m_name in data.members:
            if m_name.strip():
                new_team.members.append(TeamMember(member_name=m_name.strip()))

    db.add(new_team)
    db.commit()
    db.refresh(new_team)
    return serialize_team(new_team)


@router.put("/{team_id}", response_model=TeamResponse)
def update_team(
    team_id: str,
    data: TeamUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update team profile, leader, or roster (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team '{team_id}' not found",
        )

    if data.team_code is not None:
        t_code = data.team_code.strip().upper()
        conflict = db.query(Team).filter(Team.team_code == t_code, Team.id != team_id).first()
        if conflict:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Team code '{t_code}' already used by '{conflict.team_name}'",
            )
        team.team_code = t_code

    if data.team_name is not None:
        team.team_name = data.team_name.strip()
    if data.description is not None:
        team.description = data.description.strip() or None
    if data.team_leader is not None:
        team.team_leader = data.team_leader.strip() or None
    if data.member_count is not None:
        team.member_count = data.member_count
    if data.status is not None:
        team.status = data.status

    if data.members is not None:
        # Replace roster
        db.query(TeamMember).filter(TeamMember.team_id == team_id).delete()
        for m_name in data.members:
            if m_name.strip():
                team.members.append(TeamMember(member_name=m_name.strip()))

    db.commit()
    db.refresh(team)
    return serialize_team(team)


@router.patch("/{team_id}/status", response_model=TeamResponse)
def update_team_status(
    team_id: str,
    data: TeamStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Toggle or update team active status (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team '{team_id}' not found",
        )

    team.status = data.status
    db.commit()
    db.refresh(team)
    return serialize_team(team)


@router.delete("/{team_id}", status_code=status.HTTP_200_OK)
def delete_team(
    team_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Delete a team or safely deactivate if historical participation exists (Admin only)."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Team '{team_id}' not found",
        )

    participations_count = (
        db.query(SessionTeam).filter(SessionTeam.team_id == team_id).count()
    )

    if participations_count > 0:
        # Safe deletion: preserve history, deactivate team
        team.status = "inactive"
        db.commit()
        return {
            "message": f"Team '{team.team_name}' has participated in {participations_count} session(s). It was deactivated to preserve historical participation records.",
            "action": "deactivated",
            "team_id": team_id,
        }

    db.delete(team)
    db.commit()
    return {"message": "Team deleted successfully", "action": "deleted", "team_id": team_id}
