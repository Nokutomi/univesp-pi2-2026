import { useState } from 'react'
import { api } from '../api.js'
import { ErrorMessage, Loading } from '../components/Feedback.jsx'
import MonthPicker from '../components/MonthPicker.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { currentMonth, money, percent } from '../format.js'
import { useApi } from '../useApi.js'

function LimitEditor({ budget, onSave, onCancel }) {
  const [value, setValue] = useState(budget.limit_amount)
  return (
    <form
      className="inline-edit"
      onSubmit={(e) => {
        e.preventDefault()
        onSave(Number(value))
      }}
    >
      <label>
        <span className="sr-only">Novo limite para {budget.category.name}</span>
        <input type="number" min="1" step="0.01" required value={value} onChange={(e) => setValue(e.target.value)} autoFocus />
      </label>
      <button type="submit" className="btn btn-primary btn-sm">
        Salvar
      </button>
      <button type="button" className="btn btn-ghost btn-sm" onClick={onCancel}>
        Cancelar
      </button>
    </form>
  )
}

export default function Budget() {
  const [month, setMonth] = useState(currentMonth())
  const [editingId, setEditingId] = useState(null)
  const [newBudget, setNewBudget] = useState({ category_id: '', limit_amount: '' })
  const [error, setError] = useState(null)
  const budgets = useApi(`/budgets?month=${month}`)
  const categories = useApi('/categories')

  const list = budgets.data || []
  const used = new Set(list.map((b) => b.category.id))
  const available = (categories.data || []).filter((c) => c.kind === 'despesa' && !used.has(c.id))
  const totalLimit = list.reduce((a, b) => a + b.limit_amount, 0)
  const totalSpent = list.reduce((a, b) => a + b.spent, 0)

  async function run(promise) {
    setError(null)
    try {
      budgets.setData(await promise)
    } catch (err) {
      setError(err.message)
    }
  }

  const save = (categoryId, limit) => run(api.put('/budgets', { category_id: categoryId, month, limit_amount: limit }))

  async function remove(b) {
    if (!window.confirm(`Remover o limite de ${b.category.name}?`)) return
    await api.del(`/budgets/${b.id}`)
    budgets.reload()
  }

  return (
    <>
      <div className="page-header">
        <h1>Orçamento mensal</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>
      <p className="muted">
        Defina um limite de gasto por categoria. Você recebe um alerta ao atingir 80% do limite.
      </p>
      <ErrorMessage>{error || budgets.error}</ErrorMessage>

      {list.length > 0 && (
        <section className="stats" aria-label="Resumo do orçamento">
          <div className="stat">
            <span className="stat-label">Total planejado</span>
            <span className="stat-value">{money(totalLimit)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Total gasto</span>
            <span className="stat-value">{money(totalSpent)}</span>
          </div>
          <div className="stat">
            <span className="stat-label">Disponível</span>
            <span className={`stat-value ${totalLimit - totalSpent < 0 ? 'tone-bad' : 'tone-good'}`}>
              {money(totalLimit - totalSpent)}
            </span>
          </div>
        </section>
      )}

      <section className="card" aria-labelledby="limites-title">
        <h2 id="limites-title">Limites por categoria</h2>
        {budgets.loading && !budgets.data ? (
          <Loading />
        ) : list.length === 0 ? (
          <div className="empty">
            <p className="muted">Nenhum limite definido para este mês.</p>
            <button type="button" className="btn btn-primary" onClick={() => run(api.post(`/budgets/copy-previous?month=${month}`))}>
              Copiar limites do mês anterior
            </button>
          </div>
        ) : (
          <ul className="budget-list">
            {list.map((b) => (
              <li key={b.id} className="budget-item">
                <div className="budget-head">
                  <span className="cat-chip">
                    <span className="swatch" style={{ background: b.category.color }} aria-hidden="true" />
                    <strong>{b.category.name}</strong>
                  </span>
                  <StatusBadge status={b.status} />
                </div>
                <ProgressBar value={b.percent} tone={b.status} label={`${b.category.name}: ${percent(b.percent)} do limite usado`} />
                <div className="budget-foot">
                  <span className="num">
                    {money(b.spent)} de {money(b.limit_amount)} ({percent(b.percent)})
                  </span>
                  {editingId === b.id ? (
                    <LimitEditor
                      budget={b}
                      onCancel={() => setEditingId(null)}
                      onSave={async (v) => {
                        await save(b.category.id, v)
                        setEditingId(null)
                      }}
                    />
                  ) : (
                    <span className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(b.id)} aria-label={`Alterar limite de ${b.category.name}`}>
                        Alterar limite
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(b)} aria-label={`Remover limite de ${b.category.name}`}>
                        Remover
                      </button>
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {available.length > 0 && (
        <section className="card" aria-labelledby="add-limite-title">
          <h2 id="add-limite-title">Adicionar limite</h2>
          <form
            className="form form-inline"
            onSubmit={async (e) => {
              e.preventDefault()
              await save(Number(newBudget.category_id), Number(newBudget.limit_amount))
              setNewBudget({ category_id: '', limit_amount: '' })
            }}
          >
            <label>
              Categoria
              <select required value={newBudget.category_id} onChange={(e) => setNewBudget({ ...newBudget, category_id: e.target.value })}>
                <option value="">Selecione…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Limite (R$)
              <input
                type="number"
                required
                min="1"
                step="0.01"
                value={newBudget.limit_amount}
                onChange={(e) => setNewBudget({ ...newBudget, limit_amount: e.target.value })}
              />
            </label>
            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Adicionar
              </button>
            </div>
          </form>
        </section>
      )}
    </>
  )
}
