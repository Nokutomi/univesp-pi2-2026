"""Controle financeiro: categorias, transações, orçamentos e alertas."""

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Budget, Category, Transaction, User
from ..schemas import AlertOut, BudgetIn, BudgetOut, CategoryOut, TransactionIn, TransactionOut
from ..security import get_current_user
from ..services import alerts_for, budgets_with_spending, current_month, month_bounds, shift_month

router = APIRouter(tags=["finance"])
MonthParam = Query(default=None, pattern=r"^\d{4}-\d{2}$", description="Mês no formato AAAA-MM")


@router.get("/categories", response_model=list[CategoryOut])
def list_categories(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    return db.scalars(select(Category).order_by(Category.kind, Category.id)).all()


def _get_category(db: Session, category_id: int, kind: str) -> Category:
    cat = db.get(Category, category_id)
    if cat is None:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Categoria inexistente")
    if cat.kind != kind:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"A categoria '{cat.name}' não é do tipo {kind}")
    return cat


def _get_own(db: Session, model, obj_id: int, user: User):
    obj = db.get(model, obj_id)
    if obj is None or obj.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Registro não encontrado")
    return obj


# --- Transações ---
@router.get("/transactions", response_model=list[TransactionOut])
def list_transactions(
    month: str | None = MonthParam,
    category_id: int | None = None,
    kind: str | None = Query(default=None, pattern="^(receita|despesa)$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Transaction).where(Transaction.user_id == user.id)
    if month:
        start, end = month_bounds(month)
        query = query.where(Transaction.date >= start, Transaction.date < end)
    if category_id:
        query = query.where(Transaction.category_id == category_id)
    if kind:
        query = query.where(Transaction.kind == kind)
    return db.scalars(query.order_by(Transaction.date.desc(), Transaction.id.desc())).all()


@router.post("/transactions", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
def create_transaction(data: TransactionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    _get_category(db, data.category_id, data.kind)
    tx = Transaction(user_id=user.id, **data.model_dump())
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return tx


@router.put("/transactions/{tx_id}", response_model=TransactionOut)
def update_transaction(
    tx_id: int, data: TransactionIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    tx = _get_own(db, Transaction, tx_id, user)
    _get_category(db, data.category_id, data.kind)
    for field, value in data.model_dump().items():
        setattr(tx, field, value)
    db.commit()
    db.refresh(tx)
    return tx


@router.delete("/transactions/{tx_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_transaction(tx_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_get_own(db, Transaction, tx_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


# --- Orçamento ---
@router.get("/budgets", response_model=list[BudgetOut])
def list_budgets(month: str | None = MonthParam, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return budgets_with_spending(db, user.id, month or current_month())


@router.put("/budgets", response_model=list[BudgetOut])
def upsert_budget(data: BudgetIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Cria ou atualiza o limite de uma categoria em um mês."""
    _get_category(db, data.category_id, "despesa")
    budget = db.scalar(
        select(Budget).where(
            Budget.user_id == user.id, Budget.category_id == data.category_id, Budget.month == data.month
        )
    )
    if budget is None:
        db.add(Budget(user_id=user.id, **data.model_dump()))
    else:
        budget.limit_amount = data.limit_amount
    db.commit()
    return budgets_with_spending(db, user.id, data.month)


@router.delete("/budgets/{budget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_budget(budget_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.delete(_get_own(db, Budget, budget_id, user))
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/budgets/copy-previous", response_model=list[BudgetOut])
def copy_previous_budgets(
    month: str = Query(pattern=r"^\d{4}-\d{2}$"), db: Session = Depends(get_db), user: User = Depends(get_current_user)
):
    """Copia os limites do mês anterior para as categorias ainda sem limite no mês informado."""
    prev = shift_month(month, -1)
    existing = set(db.scalars(select(Budget.category_id).where(Budget.user_id == user.id, Budget.month == month)))
    for b in db.scalars(select(Budget).where(Budget.user_id == user.id, Budget.month == prev)):
        if b.category_id not in existing:
            db.add(Budget(user_id=user.id, category_id=b.category_id, month=month, limit_amount=b.limit_amount))
    db.commit()
    return budgets_with_spending(db, user.id, month)


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(month: str | None = MonthParam, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return alerts_for(db, user.id, month or current_month())
