"""Popula o banco com dados fictícios para demonstração.

Executado automaticamente ao subir o backend (só popula se o banco estiver vazio).
Uso manual:
    python -m app.seed          # popula se vazio
    python -m app.seed --reset  # apaga tudo e popula novamente
"""

import random
import sys
from datetime import date

from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine
from .models import Budget, Category, Challenge, Content, Goal, QuizQuestion, Transaction, User, UserChallenge
from .security import hash_password
from .services import current_month, month_bounds, shift_month

DEMO_EMAIL = "demo@univesp.br"
DEMO_PASSWORD = "demo123"

# Cores das despesas seguem uma paleta categórica validada para daltonismo (ordem fixa).
EXPENSE_CATEGORIES = [
    ("Moradia", "#2a78d6"),
    ("Alimentação", "#eb6834"),
    ("Transporte", "#1baf7a"),
    ("Contas e serviços", "#eda100"),
    ("Lazer", "#e87ba4"),
    ("Saúde", "#008300"),
    ("Educação", "#6250d6"),
    ("Outros", "#e34948"),
]
INCOME_CATEGORIES = [
    ("Salário", "#0ca30c"),
    ("Renda extra", "#1baf7a"),
    ("Outras receitas", "#898781"),
]

# Despesas recorrentes: (categoria, descrição, dia, valor base, variação)
RECURRING = [
    ("Moradia", "Aluguel", 10, 1200.00, 0),
    ("Contas e serviços", "Conta de luz", 12, 145.00, 35),
    ("Contas e serviços", "Conta de água", 12, 68.00, 15),
    ("Contas e serviços", "Internet e celular", 15, 119.90, 0),
    ("Educação", "Mensalidade curso de inglês", 8, 189.00, 0),
    ("Saúde", "Farmácia", 18, 75.00, 40),
]
# Despesas variáveis: (categoria, descrições possíveis, qtd por mês, faixa de valor)
VARIABLE = [
    ("Alimentação", ["Supermercado", "Feira", "Padaria", "Açougue"], 9, (35, 180)),
    ("Alimentação", ["Delivery", "Lanchonete", "Restaurante"], 4, (25, 75)),
    ("Transporte", ["Bilhete único", "Combustível", "App de transporte"], 6, (20, 90)),
    ("Lazer", ["Cinema", "Streaming", "Passeio", "Bar com amigos"], 3, (30, 90)),
    ("Outros", ["Presente", "Roupas", "Utilidades domésticas"], 2, (40, 150)),
]

# Gastos do mês atual definidos à mão para que a demonstração mostre alertas
# (Alimentação perto do limite e Lazer estourado).
CURRENT_MONTH_EXTRA = [
    ("Alimentação", "Supermercado (compra do mês)", 3, 420.00),
    ("Alimentação", "Feira", 9, 86.50),
    ("Alimentação", "Delivery", 14, 64.90),
    ("Alimentação", "Supermercado", 17, 158.30),
    ("Alimentação", "Padaria", 19, 32.40),
    ("Transporte", "Bilhete único", 2, 110.00),
    ("Transporte", "App de transporte", 16, 38.70),
    ("Lazer", "Show", 11, 180.00),
    ("Lazer", "Streaming", 5, 55.90),
    ("Lazer", "Bar com amigos", 18, 96.00),
    ("Outros", "Presente de aniversário", 13, 89.90),
]

BUDGETS = {
    "Moradia": 1600,
    "Alimentação": 900,
    "Transporte": 350,
    "Contas e serviços": 380,
    "Lazer": 300,
    "Saúde": 150,
    "Educação": 250,
}

GOALS = [
    ("Reserva de emergência", 10000, 3850, (12, 31)),
    ("Viagem de férias", 4500, 1200, (7, 15)),
    ("Notebook para estudos", 3200, 2650, (3, 1)),
]

CONTENTS = [
    (
        "O que é educação financeira?",
        "Conceitos básicos",
        "Entenda por que aprender a lidar com dinheiro muda a sua relação com o consumo.",
        "Educação financeira é o processo de desenvolver conhecimentos e, principalmente, comportamentos "
        "que ajudam a tomar boas decisões com o dinheiro: gastar com consciência, poupar, evitar dívidas "
        "caras e planejar o futuro.\n\nMais do que fórmulas, ela envolve autocontrole: a capacidade de adiar "
        "uma gratificação imediata em troca de um benefício maior lá na frente. Pequenos hábitos, como anotar "
        "os gastos, já fazem muita diferença.",
        3,
    ),
    (
        "Monte seu orçamento com a regra 50-30-20",
        "Orçamento",
        "Um jeito simples de dividir a renda entre necessidades, desejos e futuro.",
        "A regra 50-30-20 sugere dividir a renda líquida assim:\n\n• 50% para necessidades (moradia, "
        "alimentação, transporte, contas);\n• 30% para desejos (lazer, restaurantes, compras);\n• 20% para "
        "o futuro (reserva de emergência, metas e investimentos).\n\nOs percentuais são um ponto de partida: "
        "ajuste à sua realidade. O importante é ter um plano e acompanhá-lo todo mês.",
        4,
    ),
    (
        "Reserva de emergência: por onde começar",
        "Poupança",
        "Quanto guardar, onde deixar o dinheiro e por que ela vem antes de investir.",
        "A reserva de emergência protege você de imprevistos como perda de emprego, problemas de saúde ou "
        "consertos urgentes, evitando recorrer ao cheque especial ou ao cartão.\n\nUma referência comum é "
        "juntar de 3 a 6 meses do seu custo de vida. Comece com metas pequenas (por exemplo, R$ 50 por "
        "semana) e deixe o dinheiro em uma aplicação de baixo risco e resgate rápido.",
        4,
    ),
    (
        "Cartão de crédito sem sustos",
        "Dívidas",
        "Como usar o cartão a seu favor e fugir dos juros do rotativo.",
        "O rotativo do cartão está entre as linhas de crédito mais caras do país. Algumas dicas:\n\n• Pague "
        "sempre o valor total da fatura;\n• Anote as compras parceladas: elas comprometem os meses seguintes;\n"
        "• Defina um limite menor que o oferecido pelo banco;\n• Se não conseguir pagar, procure renegociar "
        "ou trocar a dívida por uma mais barata.",
        3,
    ),
    (
        "Consumo consciente no dia a dia",
        "Consumo consciente",
        "Perguntas rápidas para evitar compras por impulso e desperdícios.",
        "Antes de comprar, pergunte-se: eu preciso disso? Posso esperar 48 horas? Já tenho algo parecido? "
        "Quanto do meu salário isso representa em horas de trabalho?\n\nEm casa, planejar o cardápio da "
        "semana, fazer lista de compras e reaproveitar alimentos reduz gastos e desperdício.",
        3,
    ),
    (
        "Juros compostos: o tempo a seu favor",
        "Investimentos",
        "Por que começar cedo, mesmo com pouco, faz tanta diferença.",
        "Nos juros compostos, o rendimento de cada mês passa a render também. Por isso o tempo é o maior "
        "aliado de quem poupa.\n\nExemplo: guardando R$ 200 por mês a 0,8% ao mês, em 10 anos você terá "
        "aportado R$ 24.000, mas o saldo será de cerca de R$ 40.000. O mesmo efeito funciona contra você "
        "nas dívidas, por isso quitar juros altos é prioridade.",
        4,
    ),
]

QUIZ = [
    (
        "Qual é a primeira prioridade de quem quer começar a organizar as finanças?",
        ["Investir em ações", "Anotar e conhecer os próprios gastos", "Pedir um empréstimo", "Trocar de banco"],
        1,
        "Sem saber para onde o dinheiro vai, não dá para planejar. Registrar os gastos é o primeiro passo.",
    ),
    (
        "Na regra 50-30-20, qual parte da renda vai para o futuro (poupança e metas)?",
        ["50%", "30%", "20%", "10%"],
        2,
        "20% da renda líquida é destinado ao futuro: reserva de emergência, metas e investimentos.",
    ),
    (
        "Qual é o tamanho recomendado de uma reserva de emergência?",
        ["1 salário", "De 3 a 6 meses do custo de vida", "10% do salário", "Não é necessária"],
        1,
        "De 3 a 6 meses do custo de vida costuma ser suficiente para cobrir a maioria dos imprevistos.",
    ),
    (
        "O que acontece ao pagar apenas o valor mínimo da fatura do cartão?",
        [
            "Nada, é a forma ideal de pagamento",
            "O restante entra no rotativo, com juros muito altos",
            "O banco perdoa a diferença",
            "O limite do cartão aumenta",
        ],
        1,
        "O saldo restante vai para o crédito rotativo, uma das linhas de crédito mais caras do mercado.",
    ),
    (
        "Qual atitude ajuda a evitar compras por impulso?",
        ["Comprar sempre na promoção", "Esperar um tempo antes de decidir", "Parcelar tudo", "Usar mais o cartão"],
        1,
        "Dar um intervalo (por exemplo, 48 horas) ajuda a perceber se a compra é realmente necessária.",
    ),
    (
        "O que são juros compostos?",
        [
            "Juros cobrados só uma vez",
            "Juros que incidem também sobre os juros acumulados",
            "Juros sem correção",
            "Taxa fixa do banco",
        ],
        1,
        "Nos juros compostos o rendimento de um período passa a render no período seguinte (\"juros sobre juros\").",
    ),
    (
        "Qual destes gastos é considerado uma necessidade?",
        ["Assinatura de streaming", "Aluguel", "Jantar fora", "Roupa nova de marca"],
        1,
        "Moradia é uma necessidade básica. Os demais são desejos, que cabem nos 30% do orçamento.",
    ),
    (
        "Sua renda é R$ 3.000 e seus gastos R$ 2.700. Qual é a sua taxa de poupança?",
        ["5%", "10%", "27%", "30%"],
        1,
        "Sobram R$ 300, que correspondem a 10% da renda (300 ÷ 3.000).",
    ),
]

CHALLENGES = [
    ("7 dias anotando tudo", "Registre todas as suas despesas durante 7 dias seguidos, até as pequenas.", 50, 7),
    ("Semana sem delivery", "Fique 7 dias sem pedir comida por aplicativo e cozinhe em casa.", 40, 7),
    ("Desafio das 52 semanas", "Guarde R$ 1 na 1ª semana, R$ 2 na 2ª e assim por diante.", 150, 364),
    ("Corte uma assinatura", "Revise suas assinaturas e cancele pelo menos uma que você usa pouco.", 30, 3),
    ("Leia 3 conteúdos", "Leia três conteúdos da área de Educação Financeira do app.", 20, 7),
]


def _money(rng: random.Random, low: float, high: float) -> float:
    return round(rng.uniform(low, high), 2)


def _month_days(month: str, until: date | None) -> list[int]:
    start, end = month_bounds(month)
    last = (end - start).days
    if until is not None and start <= until < end:
        last = until.day
    return list(range(1, last + 1))


def _build_transactions(user: User, cats: dict[str, Category]) -> list[Transaction]:
    rng = random.Random(2026)
    today = date.today()
    this_month = current_month()
    txs: list[Transaction] = []

    def add(cat_name: str, desc: str, month: str, day: int, amount: float):
        y, m = map(int, month.split("-"))
        d = date(y, m, day)
        if d > today:
            return
        cat = cats[cat_name]
        txs.append(
            Transaction(user_id=user.id, category_id=cat.id, kind=cat.kind, description=desc, amount=amount, date=d)
        )

    for delta in range(-5, 1):
        month = shift_month(this_month, delta)
        days = _month_days(month, today)
        is_current = delta == 0

        add("Salário", "Salário", month, 5, 3850.00)
        if delta % 2 == 0:
            add("Renda extra", rng.choice(["Freelance", "Venda de artesanato", "Aulas particulares"]), month,
                min(20, days[-1]), _money(rng, 250, 600))

        for cat, desc, day, base, var in RECURRING:
            add(cat, desc, month, day, round(base + rng.uniform(-var, var), 2) if var else base)

        if is_current:
            for cat, desc, day, amount in CURRENT_MONTH_EXTRA:
                add(cat, desc, month, day, amount)
            continue

        for cat, options, qty, (low, high) in VARIABLE:
            for _ in range(qty):
                add(cat, rng.choice(options), month, rng.choice(days), _money(rng, low, high))

    return txs


def seed(db: Session) -> None:
    cats = {}
    for name, color in EXPENSE_CATEGORIES:
        cats[name] = Category(name=name, kind="despesa", color=color)
    for name, color in INCOME_CATEGORIES:
        cats[name] = Category(name=name, kind="receita", color=color)
    db.add_all(cats.values())

    user = User(name="Maria Demo", email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD), points=60)
    db.add(user)
    db.flush()

    db.add_all(_build_transactions(user, cats))

    this_month = current_month()
    for month in (shift_month(this_month, -1), this_month):
        for name, limit in BUDGETS.items():
            db.add(Budget(user_id=user.id, category_id=cats[name].id, month=month, limit_amount=limit))

    year = date.today().year + 1
    for name, target, current, (m, d) in GOALS:
        db.add(Goal(user_id=user.id, name=name, target_amount=target, current_amount=current, deadline=date(year, m, d)))

    db.add_all(
        Content(title=t, topic=topic, summary=s, body=b, reading_minutes=mins) for t, topic, s, b, mins in CONTENTS
    )
    db.add_all(QuizQuestion(question=q, options=o, correct_index=c, explanation=e) for q, o, c, e in QUIZ)
    challenges = [Challenge(title=t, description=d, points=p, duration_days=days) for t, d, p, days in CHALLENGES]
    db.add_all(challenges)
    db.flush()

    # O usuário demo já concluiu um desafio e está participando de outro
    db.add(UserChallenge(user_id=user.id, challenge_id=challenges[0].id, status="concluido",
                         started_at=date.today(), completed_at=date.today()))
    db.add(UserChallenge(user_id=user.id, challenge_id=challenges[1].id, started_at=date.today()))

    db.commit()


def main() -> None:
    reset = "--reset" in sys.argv
    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.scalar(select(User).limit(1)) is not None:
            print("Banco já possui dados; seed ignorado (use --reset para recriar).")
            return
        seed(db)
        print(f"Seed concluído. Usuário demo: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
