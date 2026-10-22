import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ExpensesByCategoryChart, MonthlyEvolutionChart } from '../components/Charts.jsx'
import { ErrorMessage, Loading } from '../components/Feedback.jsx'
import MonthPicker from '../components/MonthPicker.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { currentMonth, money, monthShort, percent } from '../format.js'
import { useApi } from '../useApi.js'

function StatTile({ label, value, tone }) {
  return (
    <div className="stat">
      <span className="stat-label">{label}</span>
      <span className={`stat-value ${tone ? `tone-${tone}` : ''}`}>{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const [month, setMonth] = useState(currentMonth())
  const { data, error, loading } = useApi(`/dashboard?month=${month}`)

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <ErrorMessage>{error}</ErrorMessage>
      {loading && !data ? (
        <Loading />
      ) : (
        data && (
          <>
            <section className="stats" aria-label="Resumo do mês">
              <StatTile label="Receitas" value={money(data.receitas)} />
              <StatTile label="Despesas" value={money(data.despesas)} />
              <StatTile label="Saldo do mês" value={money(data.saldo)} tone={data.saldo >= 0 ? 'good' : 'bad'} />
              <StatTile label="Taxa de poupança" value={percent(data.taxa_poupanca)} />
            </section>

            {data.alertas.length > 0 && (
              <section className="card" aria-labelledby="alertas-title">
                <h2 id="alertas-title">Alertas de gastos</h2>
                <ul className="alerts">
                  {data.alertas.map((a) => (
                    <li key={a.category} className={`alert alert-${a.level}`}>
                      <span aria-hidden="true">{a.level === 'estourado' ? '✕' : '⚠'}</span> {a.message}
                    </li>
                  ))}
                </ul>
                <Link to="/orcamento">Ver orçamento</Link>
              </section>
            )}

            <div className="grid-2">
              <section className="card" aria-labelledby="cat-title">
                <h2 id="cat-title">Despesas por categoria</h2>
                <ExpensesByCategoryChart data={data.despesas_por_categoria} />
                <details>
                  <summary>Ver como tabela</summary>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Categoria</th>
                        <th scope="col" className="num">Total</th>
                        <th scope="col" className="num">% das despesas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.despesas_por_categoria.map((c) => (
                        <tr key={c.category}>
                          <td>{c.category}</td>
                          <td className="num">{money(c.total)}</td>
                          <td className="num">{percent(data.despesas ? c.total / data.despesas : 0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>

              <section className="card" aria-labelledby="evo-title">
                <h2 id="evo-title">Receitas e despesas nos últimos 6 meses</h2>
                <MonthlyEvolutionChart data={data.evolucao} />
                <details>
                  <summary>Ver como tabela</summary>
                  <table className="table">
                    <thead>
                      <tr>
                        <th scope="col">Mês</th>
                        <th scope="col" className="num">Receitas</th>
                        <th scope="col" className="num">Despesas</th>
                        <th scope="col" className="num">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.evolucao.map((m) => (
                        <tr key={m.month}>
                          <td>{monthShort(m.month)}</td>
                          <td className="num">{money(m.receitas)}</td>
                          <td className="num">{money(m.despesas)}</td>
                          <td className="num">{money(m.saldo)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </details>
              </section>
            </div>

            <div className="grid-2">
              <section className="card" aria-labelledby="metas-title">
                <h2 id="metas-title">Minhas metas</h2>
                {data.metas.length === 0 && <p className="muted">Você ainda não tem metas.</p>}
                <ul className="goal-list">
                  {data.metas.map((g) => {
                    const p = g.current_amount / g.target_amount
                    return (
                      <li key={g.id}>
                        <div className="goal-row">
                          <span>{g.name}</span>
                          <span className="muted num">
                            {money(g.current_amount)} de {money(g.target_amount)} ({percent(p)})
                          </span>
                        </div>
                        <ProgressBar value={p} label={`Progresso da meta ${g.name}`} />
                      </li>
                    )
                  })}
                </ul>
                <Link to="/metas">Gerenciar metas</Link>
              </section>

              {data.dica && (
                <section className="card tip" aria-labelledby="dica-title">
                  <h2 id="dica-title">
                    <span aria-hidden="true">💡</span> Dica do dia
                  </h2>
                  <h3>{data.dica.title}</h3>
                  <p>{data.dica.summary}</p>
                  <Link to="/educacao">Ler mais conteúdos</Link>
                </section>
              )}
            </div>
          </>
        )
      )}
    </>
  )
}
