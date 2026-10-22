from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Content, Goal, User
from ..schemas import CategoryTotal, ContentOut, DashboardOut, GoalOut, MonthPoint
from ..security import get_current_user
from ..services import alerts_for, current_month, expenses_by_category, shift_month, totals_by_kind

router = APIRouter(tags=["dashboard"])
HISTORY_MONTHS = 6


@router.get("/dashboard", response_model=DashboardOut)
def dashboard(
    month: str | None = Query(default=None, pattern=r"^\d{4}-\d{2}$"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    month = month or current_month()
    totals = totals_by_kind(db, user.id, month)
    receitas, despesas = totals["receita"], totals["despesa"]
    saldo = receitas - despesas

    evolucao = []
    for delta in range(-(HISTORY_MONTHS - 1), 1):
        m = shift_month(month, delta)
        t = totals_by_kind(db, user.id, m)
        evolucao.append(
            MonthPoint(month=m, receitas=t["receita"], despesas=t["despesa"], saldo=round(t["receita"] - t["despesa"], 2))
        )

    # "Dica do dia": rotaciona os conteúdos de acordo com o dia do ano
    n_contents = db.scalar(select(func.count(Content.id))) or 0
    dica = None
    if n_contents:
        offset = date.today().timetuple().tm_yday % n_contents
        dica = db.scalar(select(Content).order_by(Content.id).offset(offset).limit(1))

    goals = db.scalars(select(Goal).where(Goal.user_id == user.id).order_by(Goal.id)).all()

    return DashboardOut(
        month=month,
        receitas=round(receitas, 2),
        despesas=round(despesas, 2),
        saldo=round(saldo, 2),
        taxa_poupanca=round(saldo / receitas, 4) if receitas else 0.0,
        despesas_por_categoria=[
            CategoryTotal(category=c.name, color=c.color, total=round(t, 2))
            for c, t in expenses_by_category(db, user.id, month)
        ],
        evolucao=evolucao,
        alertas=alerts_for(db, user.id, month),
        metas=[GoalOut.model_validate(g) for g in goals],
        dica=ContentOut.model_validate(dica) if dica else None,
    )
