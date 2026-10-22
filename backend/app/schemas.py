from datetime import date
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

Kind = Literal["receita", "despesa"]


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# --- Autenticação ---
class LoginIn(BaseModel):
    email: str
    password: str


class RegisterIn(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=180, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=6)


class UserOut(ORM):
    id: int
    name: str
    email: str
    points: int


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# --- Categorias / Transações ---
class CategoryOut(ORM):
    id: int
    name: str
    kind: Kind
    color: str


class TransactionIn(BaseModel):
    category_id: int
    kind: Kind
    description: str = Field(min_length=1, max_length=200)
    amount: float = Field(gt=0)
    date: date


class TransactionOut(ORM):
    id: int
    category_id: int
    kind: Kind
    description: str
    amount: float
    date: date
    category: CategoryOut


# --- Orçamento ---
class BudgetIn(BaseModel):
    category_id: int
    month: str = Field(pattern=r"^\d{4}-\d{2}$")
    limit_amount: float = Field(gt=0)


class BudgetOut(BaseModel):
    id: int
    category: CategoryOut
    month: str
    limit_amount: float
    spent: float
    percent: float
    status: Literal["ok", "atencao", "estourado"]


class AlertOut(BaseModel):
    category: str
    level: Literal["atencao", "estourado"]
    message: str
    percent: float


# --- Metas ---
class GoalIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    target_amount: float = Field(gt=0)
    current_amount: float = Field(default=0, ge=0)
    deadline: date | None = None


class GoalOut(ORM):
    id: int
    name: str
    target_amount: float
    current_amount: float
    deadline: date | None


class DepositIn(BaseModel):
    amount: float = Field(gt=0)


# --- Educação ---
class ContentOut(ORM):
    id: int
    title: str
    topic: str
    summary: str
    body: str
    reading_minutes: int


class QuizQuestionOut(ORM):
    id: int
    question: str
    options: list[str]


class QuizAnswerIn(BaseModel):
    question_id: int
    selected_index: int


class QuizAnswerOut(BaseModel):
    correct: bool
    correct_index: int
    explanation: str
    points: int


class ChallengeOut(BaseModel):
    id: int
    title: str
    description: str
    points: int
    duration_days: int
    status: Literal["disponivel", "em_andamento", "concluido"]


# --- Dashboard ---
class CategoryTotal(BaseModel):
    category: str
    color: str
    total: float


class MonthPoint(BaseModel):
    month: str
    receitas: float
    despesas: float
    saldo: float


class DashboardOut(BaseModel):
    month: str
    receitas: float
    despesas: float
    saldo: float
    taxa_poupanca: float
    despesas_por_categoria: list[CategoryTotal]
    evolucao: list[MonthPoint]
    alertas: list[AlertOut]
    metas: list[GoalOut]
    dica: ContentOut | None
