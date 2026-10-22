"""Educação financeira: conteúdos, quiz e desafios."""

from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Challenge, Content, QuizQuestion, User, UserChallenge
from ..schemas import ChallengeOut, ContentOut, QuizAnswerIn, QuizAnswerOut, QuizQuestionOut
from ..security import get_current_user

router = APIRouter(tags=["education"])
QUIZ_POINTS = 10


@router.get("/contents", response_model=list[ContentOut])
def list_contents(topic: str | None = None, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    query = select(Content).order_by(Content.id)
    if topic:
        query = query.where(Content.topic == topic)
    return db.scalars(query).all()


@router.get("/contents/{content_id}", response_model=ContentOut)
def get_content(content_id: int, db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    content = db.get(Content, content_id)
    if content is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conteúdo não encontrado")
    return content


@router.get("/quiz", response_model=list[QuizQuestionOut])
def list_quiz(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(QuizQuestion).order_by(QuizQuestion.id)).all()


@router.post("/quiz/answer", response_model=QuizAnswerOut)
def answer_quiz(data: QuizAnswerIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    question = db.get(QuizQuestion, data.question_id)
    if question is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Pergunta não encontrada")
    correct = data.selected_index == question.correct_index
    if correct:
        user.points += QUIZ_POINTS
        db.commit()
    return QuizAnswerOut(
        correct=correct,
        correct_index=question.correct_index,
        explanation=question.explanation,
        points=user.points,
    )


def _challenges_for(db: Session, user: User) -> list[ChallengeOut]:
    progress = {
        uc.challenge_id: uc.status
        for uc in db.scalars(select(UserChallenge).where(UserChallenge.user_id == user.id))
    }
    return [
        ChallengeOut(
            id=c.id,
            title=c.title,
            description=c.description,
            points=c.points,
            duration_days=c.duration_days,
            status=progress.get(c.id, "disponivel"),
        )
        for c in db.scalars(select(Challenge).order_by(Challenge.id))
    ]


@router.get("/challenges", response_model=list[ChallengeOut])
def list_challenges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return _challenges_for(db, user)


@router.post("/challenges/{challenge_id}/join", response_model=list[ChallengeOut])
def join_challenge(challenge_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if db.get(Challenge, challenge_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Desafio não encontrado")
    exists = db.scalar(
        select(UserChallenge).where(UserChallenge.user_id == user.id, UserChallenge.challenge_id == challenge_id)
    )
    if exists is None:
        db.add(UserChallenge(user_id=user.id, challenge_id=challenge_id, started_at=date.today()))
        db.commit()
    return _challenges_for(db, user)


@router.post("/challenges/{challenge_id}/complete", response_model=list[ChallengeOut])
def complete_challenge(challenge_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    uc = db.scalar(
        select(UserChallenge).where(UserChallenge.user_id == user.id, UserChallenge.challenge_id == challenge_id)
    )
    if uc is None:
        raise HTTPException(status.HTTP_409_CONFLICT, "Participe do desafio antes de concluí-lo")
    if uc.status != "concluido":
        uc.status = "concluido"
        uc.completed_at = date.today()
        user.points += db.get(Challenge, challenge_id).points
        db.commit()
    return _challenges_for(db, user)
