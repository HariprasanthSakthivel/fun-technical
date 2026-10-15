"""Question Management API endpoints."""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.models import Question, User
from app.schemas.schemas import AdminQuestionResponse, QuestionCreate, QuestionUpdate

router = APIRouter(prefix="/questions", tags=["Questions"])


def generate_question_id(db: Session) -> str:
    """Generate next Q001 style identifier."""
    questions = db.query(Question.id).all()
    nums = []
    for (q_id,) in questions:
        digits = "".join(ch for ch in q_id if ch.isdigit())
        if digits:
            nums.append(int(digits))
    next_num = max(nums, default=0) + 1
    return f"Q{str(next_num).padStart(3, '0')}" if hasattr(str(next_num), "padStart") else f"Q{next_num:03d}"


@router.get("", response_model=list[AdminQuestionResponse])
def list_questions(
    game_type: str | None = Query(None, description="Filter by game type"),
    difficulty: str | None = Query(None, description="Filter by difficulty"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    search: str | None = Query(None, description="Search by title or ID"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=200),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """List questions with filtering, search, and pagination (Admin only)."""
    query = db.query(Question)

    if game_type:
        query = query.filter(Question.game_type == game_type)
    if difficulty:
        query = query.filter(Question.difficulty == difficulty)
    if status_filter:
        query = query.filter(Question.status == status_filter)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            Question.title.ilike(search_term) | Question.id.ilike(search_term)
        )

    return query.order_by(Question.question_order.asc()).offset(skip).limit(limit).all()


@router.get("/{question_id}", response_model=AdminQuestionResponse)
def get_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Retrieve full details of a specific question (Admin only)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question '{question_id}' not found",
        )
    return question


@router.post("", response_model=AdminQuestionResponse, status_code=status.HTTP_201_CREATED)
def create_question(
    data: QuestionCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Create a new question in the Question Bank (Admin only)."""
    q_id = data.id or generate_question_id(db)

    # Check ID conflict
    if db.query(Question).filter(Question.id == q_id).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Question with ID '{q_id}' already exists",
        )

    # Validate game-specific content
    if data.game_type == "guess-tech":
        if data.content_type in ("image", "multiple-images", "text-images"):
            if not data.images_data or len(data.images_data) == 0:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Images required for image-based question type",
                )

    new_q = Question(
        id=q_id,
        game_type=data.game_type,
        title=data.title.strip(),
        instructions=data.instructions,
        content_type=data.content_type,
        text_content=data.text_content,
        images_data=data.images_data,
        secret_topic=data.secret_topic,
        topic_description=data.topic_description,
        prohibited_words=data.prohibited_words,
        admin_instructions=data.admin_instructions,
        estimated_time=data.estimated_time,
        technology_category=data.technology_category,
        correct_answer=data.correct_answer.strip(),
        accepted_answers=data.accepted_answers,
        explanation=data.explanation,
        difficulty=data.difficulty,
        question_order=data.question_order,
        status=data.status,
    )

    db.add(new_q)
    db.commit()
    db.refresh(new_q)
    return new_q


@router.put("/{question_id}", response_model=AdminQuestionResponse)
def update_question(
    question_id: str,
    data: QuestionUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Update question content, answer configuration, or status (Admin only)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question '{question_id}' not found",
        )

    update_dict = data.model_dump(exclude_unset=True)
    for field, val in update_dict.items():
        setattr(question, field, val)

    db.commit()
    db.refresh(question)
    return question


@router.delete("/{question_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_question(
    question_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Delete a question from the Question Bank (Admin only)."""
    question = db.query(Question).filter(Question.id == question_id).first()
    if not question:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question '{question_id}' not found",
        )

    db.delete(question)
    db.commit()
    return None
