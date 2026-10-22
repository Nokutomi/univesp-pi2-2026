from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Goal, User
from ..schemas import DepositIn, GoalIn, GoalOut
from ..security import get_current_user

router = APIRouter(prefix="/goals", tags=["goals"])


def _get_goal(db: Session, goal_id: int, user: User) -> Goal:
    goal = db.get(Goal, goal_id)
    if goal is None or goal.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Meta não encontrada")
    return goal


@router.get("", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.id)).all()


@router.post("", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
def create_goal(data: GoalIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = Goal(user_id=user.id, **data.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, data: GoalIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _get_goal(db, goal_id, user)
    for field, value in data.model_dump().items():
        setattr(goal, field, value)
    db.commit()
    db.refresh(goal)
    return goal


@router.post("/{goal_id}/deposit", response_model=GoalOut)
def deposit(goal_id: int, data: DepositIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = _get_goal(db, goal_id, user)
    goal.current_amount = float(goal.current_amount) + data.amount
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_get_goal(db, goal_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
