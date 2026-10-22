"""Regras de negócio compartilhadas entre rotas (cálculos de orçamento, alertas, etc.)."""

from datetime import date

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .config import ALERT_THRESHOLD
from .models import Budget, Category, Transaction


def month_bounds(month: str) -> tuple[date, date]:
    """Retorna [início, início do mês seguinte) para um mês 'AAAA-MM'."""
    year, mon = map(int, month.split("-"))
    start = date(year, mon, 1)
    end = date(year + 1, 1, 1) if mon == 12 else date(year, mon + 1, 1)
    return start, end


def current_month() -> str:
    return date.today().strftime("%Y-%m")


def shift_month(month: str, delta: int) -> str:
    year, mon = map(int, month.split("-"))
    idx = year * 12 + (mon - 1) + delta
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def totals_by_kind(db: Session, user_id: int, month: str) -> dict[str, float]:
    start, end = month_bounds(month)
    rows = db.execute(
        select(Transaction.kind, func.sum(Transaction.amount))
        .where(Transaction.user_id == user_id, Transaction.date >= start, Transaction.date < end)
        .group_by(Transaction.kind)
    ).all()
    result = {"receita": 0.0, "despesa": 0.0}
    for kind, total in rows:
        result[kind] = float(total or 0)
    return result


def expenses_by_category(db: Session, user_id: int, month: str) -> list[tuple[Category, float]]:
    start, end = month_bounds(month)
    rows = db.execute(
        select(Category, func.sum(Transaction.amount))
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            Transaction.user_id == user_id,
            Transaction.kind == "despesa",
            Transaction.date >= start,
            Transaction.date < end,
        )
        .group_by(Category.id)
        .order_by(func.sum(Transaction.amount).desc())
    ).all()
    return [(cat, float(total)) for cat, total in rows]


def budget_status(percent: float) -> str:
    if percent >= 1:
        return "estourado"
    if percent >= ALERT_THRESHOLD:
        return "atencao"
    return "ok"


def budgets_with_spending(db: Session, user_id: int, month: str) -> list[dict]:
    spent = {cat.id: total for cat, total in expenses_by_category(db, user_id, month)}
    budgets = db.scalars(
        select(Budget).where(Budget.user_id == user_id, Budget.month == month).order_by(Budget.id)
    ).all()
    result = []
    for b in budgets:
        limit = float(b.limit_amount)
        s = spent.get(b.category_id, 0.0)
        pct = s / limit if limit else 0.0
        result.append(
            {
                "id": b.id,
                "category": b.category,
                "month": b.month,
                "limit_amount": limit,
                "spent": round(s, 2),
                "percent": round(pct, 4),
                "status": budget_status(pct),
            }
        )
    return result


def alerts_for(db: Session, user_id: int, month: str) -> list[dict]:
    alerts = []
    for b in budgets_with_spending(db, user_id, month):
        name = b["category"].name
        pct = b["percent"]
        if b["status"] == "estourado":
            msg = f"Você ultrapassou o limite de {name} ({pct:.0%} do orçamento)."
        elif b["status"] == "atencao":
            msg = f"Atenção: você já usou {pct:.0%} do orçamento de {name}."
        else:
            continue
        alerts.append({"category": name, "level": b["status"], "message": msg, "percent": pct})
    alerts.sort(key=lambda a: a["percent"], reverse=True)
    return alerts
