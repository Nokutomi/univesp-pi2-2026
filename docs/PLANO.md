# Plano do protótipo – Aplicação de estímulo à educação financeira

Protótipo **em modo de desenvolvimento** (não produtivo), baseado no Relatório Parcial do PI II.
O objetivo é ter algo executável localmente e demonstrável, com dados fictícios (mocks/seed).

## 1. Escopo (os 4 pilares do relatório)

| Pilar | Funcionalidades no protótipo |
|---|---|
| **Dashboard financeiro** | Saldo, receitas e despesas do mês, taxa de poupança, gastos por categoria, evolução dos últimos 6 meses, alertas de limite, resumo das metas, dica do dia |
| **Controle financeiro** | Cadastro/edição/exclusão de receitas e despesas, categorização, filtro por mês/categoria, histórico; orçamento mensal com limite por categoria |
| **Alertas** | Aviso quando uma categoria passa de 80% do limite (atenção) ou de 100% (estourado) |
| **Metas financeiras** | Criar meta (nome, valor-alvo, prazo), registrar depósitos, barra de progresso |
| **Educação financeira** | Conteúdos/dicas por tema, quiz com explicação da resposta, desafios com pontuação |

**Fora do escopo por enquanto:** deploy em nuvem, recuperação de senha, integração bancária, Redis
(o relatório cita "sessões do timer", o que parece ser resto de outro projeto; vale revisar o texto).

## 2. Arquitetura

```
┌────────────┐   HTTP/JSON   ┌──────────────┐   SQL   ┌──────────────┐
│  frontend  │ ────────────▶ │   backend    │ ──────▶ │  PostgreSQL  │
│ React+Vite │  :5173        │   FastAPI    │  :8000  │     :5432    │
└────────────┘               └──────────────┘         └──────────────┘
```

- **Backend:** Python 3.12, FastAPI, SQLAlchemy 2, autenticação JWT simples. Documentação automática em `/docs` (Swagger).
- **Frontend:** React + Vite, React Router, Recharts (gráficos). Layout responsivo.
- **Banco:** PostgreSQL 16. As tabelas são criadas na inicialização (sem migrações, por ser protótipo).
- **Docker Compose:** 3 serviços (`db`, `backend`, `frontend`), com volumes montados e *hot-reload*
  nos dois lados: editar o código reflete na hora, sem rebuild.

## 3. Modelo de dados

- `users`: nome, e-mail, senha (hash), pontos
- `categories`: nome, tipo (receita/despesa), cor
- `transactions`: usuário, categoria, tipo, descrição, valor, data
- `budgets`: usuário, categoria, mês (AAAA-MM), limite
- `goals`: usuário, nome, valor-alvo, valor atual, prazo
- `contents`: título, tema, resumo, texto, tempo de leitura
- `quiz_questions`: pergunta, alternativas, índice correto, explicação
- `challenges` + `user_challenges`: desafio, pontos, duração, status do usuário

## 4. API REST (principais rotas)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/auth/login`, `/auth/register` | Autenticação (retorna JWT) |
| GET | `/auth/me` | Usuário logado |
| GET | `/dashboard?month=AAAA-MM` | Dados agregados do dashboard |
| GET | `/categories` | Lista de categorias |
| GET/POST/PUT/DELETE | `/transactions` | CRUD de receitas/despesas |
| GET/PUT/DELETE | `/budgets` | Limites do mês e quanto já foi gasto |
| GET | `/alerts?month=` | Alertas de limite |
| GET/POST/PUT/DELETE | `/goals`, POST `/goals/{id}/deposit` | Metas |
| GET | `/contents`, `/contents/{id}` | Conteúdos educativos |
| GET | `/quiz`, POST `/quiz/answer` | Quiz |
| GET | `/challenges`, POST `/challenges/{id}/join` e `/complete` | Desafios |

## 5. Telas (seguindo o mapa de navegação)

1. **Login/Cadastro**, já com o usuário demo sugerido
2. **Dashboard**
3. **Transações**: lista + formulário
4. **Orçamento**: limites por categoria com barras de progresso e status
5. **Metas**: cartões com progresso e botão de depósito
6. **Educação**: abas Conteúdos, Quiz e Desafios

**Acessibilidade (requisito do relatório):** widget VLibras, HTML semântico, link "pular para o conteúdo",
navegação por teclado com foco visível, `label` em todos os campos, contraste adequado, status nunca
indicado só por cor (ícone + texto), tabela alternativa aos gráficos.

## 6. Dados de demonstração (seed)

Script `backend/app/seed.py`, executado automaticamente ao subir o backend (só popula se o banco estiver vazio):
- Usuário demo: `demo@univesp.br` / `demo123`
- ~6 meses de transações realistas, relativas à data atual (salário, aluguel, mercado, transporte, lazer…)
- Orçamentos do mês atual, com 1 ou 2 categorias em atenção/estouradas para demonstrar os alertas
- 3 metas (reserva de emergência, viagem, curso)
- ~6 conteúdos, ~8 perguntas de quiz, ~5 desafios

## 7. Testes

Testes automatizados com `pytest` no backend (SQLite em memória): login, CRUD de transações,
cálculo de orçamento/alertas e dashboard. Comando: `docker compose exec backend pytest`.

## 8. Estrutura do repositório

```
univesp-pi2-2026/
├── docker-compose.yml
├── README.md            # como rodar localmente
├── docs/PLANO.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/  (main.py, models.py, schemas.py, services.py, seed.py, routers/)
│   └── tests/
└── frontend/
    ├── Dockerfile
    ├── package.json
    └── src/  (pages/, components/, api.js)
```

## 9. Etapas de construção

1. Backend: modelos, rotas, seed e testes
2. Docker Compose com banco e backend (validar pelo Swagger em `/docs`)
3. Frontend: layout, login, dashboard e depois as demais telas
4. Acessibilidade e ajustes visuais
5. README com instruções e roteiro de demonstração
6. Subir tudo do zero com `docker compose up` e conferir o fluxo completo
