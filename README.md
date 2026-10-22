# univesp-pi2-2026 – Finanças em Dia

Projeto Integrador II – Univesp, 2º semestre de 2026.
**Desenvolvimento de uma aplicação para o estímulo da educação financeira.**

Protótipo de aplicação web para organizar as finanças domésticas e estimular bons hábitos financeiros.
É uma versão **de desenvolvimento/demonstração**, com dados fictícios. O planejamento está em [docs/PLANO.md](docs/PLANO.md).

## Funcionalidades

| Pilar | O que dá para fazer |
|---|---|
| **Dashboard** | Saldo, receitas, despesas e taxa de poupança do mês; gastos por categoria; evolução dos últimos 6 meses; alertas; metas; dica do dia |
| **Controle financeiro** | Cadastrar, editar e excluir receitas e despesas; filtrar por mês, tipo e categoria |
| **Orçamento e alertas** | Limite mensal por categoria; aviso ao atingir 80% (atenção) e 100% (estourado); copiar limites do mês anterior |
| **Metas** | Criar metas com valor-alvo e prazo, guardar dinheiro e acompanhar o progresso (com sugestão de quanto guardar por mês) |
| **Educação financeira** | Conteúdos curtos, quiz com explicações e desafios que dão pontos |

**Acessibilidade:** widget VLibras, link "Pular para o conteúdo", navegação por teclado com foco visível,
rótulos em todos os campos, contraste adequado, status sempre com ícone e texto (nunca só cor),
tabela alternativa para cada gráfico e layout responsivo.

## Tecnologias

- **Frontend:** React 18 + Vite, React Router, Recharts
- **Backend:** Python 3.12 + FastAPI, SQLAlchemy 2, autenticação JWT
- **Banco de dados:** PostgreSQL 16
- **Infra:** Docker e Docker Compose
- **Testes:** pytest

```
frontend (React, :5173) ──/api──▶ backend (FastAPI, :8000) ──▶ PostgreSQL (:5432)
```

## Como rodar localmente

### Pré-requisitos

Basta ter o [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado e **aberto**.
Não é preciso instalar Python, Node ou PostgreSQL.

### Passo a passo

```bash
git clone https://github.com/Nokutomi/univesp-pi2-2026.git
cd univesp-pi2-2026
docker compose up --build
```

Na primeira execução o download das imagens e das dependências leva alguns minutos.
Quando aparecer `Seed concluído` e `VITE ... ready` nos logs, acesse:

| O quê | Endereço |
|---|---|
| **Aplicação** | http://localhost:5173 |
| Documentação da API (Swagger) | http://localhost:8000/docs |
| Banco de dados | `localhost:5432`, banco/usuário/senha: `financas` |

**Usuário de demonstração:** `demo@univesp.br` / `demo123` (já vem preenchido na tela de login).
Também é possível criar uma conta nova em "Cadastre-se".

### Comandos úteis

```bash
docker compose up -d                 # sobe em segundo plano
docker compose logs -f backend       # acompanha os logs do backend
docker compose down                  # para os containers (mantém os dados)
docker compose down -v               # para e APAGA o banco (o seed roda de novo na próxima subida)

docker compose exec backend python -m app.seed --reset   # recria os dados de demonstração
docker compose exec backend pytest                       # roda os testes automatizados
```

O código é montado nos containers com *hot-reload*: alterações em `backend/` ou `frontend/src/`
aparecem na hora, sem precisar reconstruir. Só é preciso rodar `docker compose up --build` de novo
ao mudar dependências (`requirements.txt` ou `package.json`).

> Se alguma porta (5173, 8000 ou 5432) já estiver em uso no seu computador, altere o lado esquerdo
> do mapeamento em `docker-compose.yml` (ex.: `"5433:5432"`).

## Dados de demonstração

O script [backend/app/seed.py](backend/app/seed.py) roda automaticamente quando o backend sobe
e só popula o banco se ele estiver vazio. Ele cria:

- a usuária demo "Maria Demo", com 60 pontos;
- cerca de 6 meses de receitas e despesas, **relativas à data atual** (os gráficos sempre têm dados recentes);
- limites de orçamento para o mês atual e o anterior. No mês atual, **Lazer está estourado** e
  **Alimentação está em atenção**, para mostrar os alertas;
- 3 metas (reserva de emergência, viagem, notebook);
- 6 conteúdos educativos, 8 perguntas de quiz e 5 desafios.

## Roteiro sugerido para a demonstração

1. **Login** com o usuário demo.
2. **Dashboard:** mostrar o resumo do mês, os alertas de Lazer e Alimentação, os gráficos
   (passe o mouse para ver os valores, ou abra "Ver como tabela") e as metas.
3. **Transações:** cadastrar uma despesa de Lazer (ex.: "Cinema", R$ 40) e filtrar por categoria.
4. **Orçamento:** ver o Lazer ainda mais estourado; alterar o limite e ver o status mudar.
   Avançar para o próximo mês e usar "Copiar limites do mês anterior".
5. **Metas:** guardar um valor em uma meta e ver a barra de progresso; criar uma meta nova.
6. **Educação:** ler um conteúdo, responder ao quiz (os pontos no topo aumentam) e participar de um desafio.
7. **Acessibilidade:** navegar usando só o teclado (Tab / Shift+Tab / setas nas abas) e abrir o VLibras (ícone azul à direita).

## Estrutura do projeto

```
├── docker-compose.yml
├── docs/PLANO.md               # plano do protótipo
├── backend/
│   ├── app/
│   │   ├── main.py             # aplicação FastAPI
│   │   ├── models.py           # tabelas (SQLAlchemy)
│   │   ├── schemas.py          # validação de entrada/saída (Pydantic)
│   │   ├── services.py         # regras de negócio (orçamento, alertas)
│   │   ├── security.py         # senha (PBKDF2) e JWT
│   │   ├── seed.py             # dados de demonstração
│   │   └── routers/            # auth, dashboard, finance, goals, education
│   └── tests/                  # testes automatizados (pytest)
└── frontend/
    └── src/
        ├── pages/              # Login, Dashboard, Transações, Orçamento, Metas, Educação
        ├── components/         # Layout, gráficos, barra de progresso etc.
        ├── api.js              # cliente HTTP
        └── styles.css
```

## Limitações conhecidas (protótipo)

- Ambiente de desenvolvimento apenas: chave JWT e senhas do banco fixas, sem HTTPS e sem deploy em nuvem.
- Tabelas criadas automaticamente (sem migrações).
- Os pontos do quiz podem ser ganhos de novo ao refazê-lo, e os desafios são concluídos manualmente pelo usuário.
