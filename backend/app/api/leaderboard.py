"""Final Combined Leaderboard API endpoints for Fun Friday Activities Platform.

Displays combined scores:
| Rank | Team Name | Tech Detective Score | Lightning Talks Score | Total Score |

- Combines Game 1 (Tech Detective) and Game 2 (Lightning Talks) points.
- Ranks teams by combined total scores.
- Admin has permission to view & edit any score.
- Participants have view-only access.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import Team, TeamGameScore, User
from app.schemas.schemas import EditFinalScoreRequest, FinalLeaderboardEntry

router = APIRouter(prefix="/leaderboard", tags=["Final Leaderboard"])


def recalculate_ranks(db: Session) -> list[Team]:
    teams = db.query(Team).all()
    all_custom_scores = db.query(TeamGameScore).all()
    custom_score_map: dict[str, int] = {}
    for cs in all_custom_scores:
        custom_score_map[cs.team_id] = custom_score_map.get(cs.team_id, 0) + cs.score

    for t in teams:
        custom_pts = custom_score_map.get(t.id, 0)
        t.total_score = t.tech_detective_score + t.lightning_talks_score + custom_pts
    db.commit()

    sorted_teams = db.query(Team).order_by(Team.total_score.desc(), Team.id.asc()).all()
    for idx, team in enumerate(sorted_teams):
        team.rank = idx + 1
    db.commit()
    return sorted_teams


@router.get("/final", response_model=list[FinalLeaderboardEntry])
def get_final_leaderboard(db: Session = Depends(get_db)):
    """Both Admin and Participants view the final combined leaderboard."""
    teams = recalculate_ranks(db)
    return [
        FinalLeaderboardEntry(
            rank=t.rank,
            team_id=t.id,
            team_name=t.team_name,
            tech_detective_score=t.tech_detective_score,
            lightning_talks_score=t.lightning_talks_score,
            total_score=t.total_score,
        )
        for t in teams
    ]


@router.put("/edit/{team_id}", response_model=FinalLeaderboardEntry)
def edit_final_leaderboard_score(
    team_id: str,
    payload: EditFinalScoreRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Admin has permission to directly edit or override any team's scores."""
    team = db.query(Team).filter(Team.id == team_id).first()
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")

    if payload.tech_detective_score is not None:
        team.tech_detective_score = payload.tech_detective_score
    if payload.lightning_talks_score is not None:
        team.lightning_talks_score = payload.lightning_talks_score

    all_custom = db.query(TeamGameScore).filter(TeamGameScore.team_id == team.id).all()
    custom_sum = sum(cs.score for cs in all_custom)
    team.total_score = team.tech_detective_score + team.lightning_talks_score + custom_sum
    db.commit()

    recalculate_ranks(db)
    db.refresh(team)

    return FinalLeaderboardEntry(
        rank=team.rank,
        team_id=team.id,
        team_name=team.team_name,
        tech_detective_score=team.tech_detective_score,
        lightning_talks_score=team.lightning_talks_score,
        total_score=team.total_score,
    )
