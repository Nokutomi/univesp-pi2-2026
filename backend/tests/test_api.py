from datetime import date

from app.services import current_month, shift_month


def test_login_invalido(client):
    res = client.post("/auth/login", json={"email": "demo@univesp.br", "password": "errada"})
    assert res.status_code == 401


def test_rotas_protegidas_exigem_token(client):
    assert client.get("/dashboard").status_code == 401


def test_cadastro_e_login(client):
    res = client.post("/auth/register", json={"name": "Ana", "email": "ana@exemplo.com", "password": "123456"})
    assert res.status_code == 201
    assert res.json()["user"]["email"] == "ana@exemplo.com"
    dup = client.post("/auth/register", json={"name": "Ana", "email": "ANA@exemplo.com", "password": "123456"})
    assert dup.status_code == 409


def test_crud_transacao(client, auth):
    cats = client.get("/categories", headers=auth).json()
    lazer = next(c for c in cats if c["name"] == "Lazer")
    payload = {"category_id": lazer["id"], "kind": "despesa", "description": "Teatro", "amount": 50, "date": str(date.today())}

    created = client.post("/transactions", json=payload, headers=auth)
    assert created.status_code == 201
    tx_id = created.json()["id"]

    updated = client.put(f"/transactions/{tx_id}", json={**payload, "amount": 75.5}, headers=auth)
    assert updated.json()["amount"] == 75.5

    assert client.delete(f"/transactions/{tx_id}", headers=auth).status_code == 204
    assert client.put(f"/transactions/{tx_id}", json=payload, headers=auth).status_code == 404


def test_transacao_valida_tipo_da_categoria(client, auth):
    cats = client.get("/categories", headers=auth).json()
    salario = next(c for c in cats if c["name"] == "Salário")
    res = client.post(
        "/transactions",
        json={"category_id": salario["id"], "kind": "despesa", "description": "x", "amount": 10, "date": str(date.today())},
        headers=auth,
    )
    assert res.status_code == 422


def test_transacao_rejeita_valor_negativo(client, auth):
    res = client.post(
        "/transactions",
        json={"category_id": 1, "kind": "despesa", "description": "x", "amount": -5, "date": str(date.today())},
        headers=auth,
    )
    assert res.status_code == 422


def test_orcamento_gera_alertas(client, auth):
    month = current_month()
    budgets = client.get(f"/budgets?month={month}", headers=auth).json()
    lazer = next(b for b in budgets if b["category"]["name"] == "Lazer")

    # Reduz o limite de Lazer para garantir que fique estourado
    client.put("/budgets", json={"category_id": lazer["category"]["id"], "month": month, "limit_amount": 1}, headers=auth)
    alerts = client.get(f"/alerts?month={month}", headers=auth).json()
    lazer_alert = next(a for a in alerts if a["category"] == "Lazer")
    assert lazer_alert["level"] == "estourado"


def test_copiar_orcamento_do_mes_anterior(client, auth):
    next_month = shift_month(current_month(), 1)
    assert client.get(f"/budgets?month={next_month}", headers=auth).json() == []
    copied = client.post(f"/budgets/copy-previous?month={next_month}", headers=auth).json()
    assert len(copied) == 7


def test_dashboard(client, auth):
    data = client.get("/dashboard", headers=auth).json()
    assert data["month"] == current_month()
    assert data["receitas"] > 0
    assert round(data["receitas"] - data["despesas"], 2) == data["saldo"]
    assert len(data["evolucao"]) == 6
    assert len(data["metas"]) == 3
    assert data["dica"] is not None


def test_deposito_em_meta(client, auth):
    goal = client.get("/goals", headers=auth).json()[0]
    res = client.post(f"/goals/{goal['id']}/deposit", json={"amount": 100}, headers=auth)
    assert res.json()["current_amount"] == goal["current_amount"] + 100


def test_quiz_soma_pontos_ao_acertar(client, auth):
    question = client.get("/quiz", headers=auth).json()[0]
    assert "correct_index" not in question
    before = client.get("/auth/me", headers=auth).json()["points"]
    wrong = client.post("/quiz/answer", json={"question_id": question["id"], "selected_index": 0}, headers=auth).json()
    assert wrong["correct"] is False
    right = client.post(
        "/quiz/answer", json={"question_id": question["id"], "selected_index": wrong["correct_index"]}, headers=auth
    ).json()
    assert right["correct"] is True
    assert right["points"] == before + 10


def test_fluxo_de_desafio(client, auth):
    challenges = client.get("/challenges", headers=auth).json()
    available = next(c for c in challenges if c["status"] == "disponivel")
    assert client.post(f"/challenges/{available['id']}/complete", headers=auth).status_code == 409
    client.post(f"/challenges/{available['id']}/join", headers=auth)
    after = client.post(f"/challenges/{available['id']}/complete", headers=auth).json()
    assert next(c for c in after if c["id"] == available["id"])["status"] == "concluido"
