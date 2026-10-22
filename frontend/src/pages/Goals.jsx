import { useState } from 'react'
import { api } from '../api.js'
import { ErrorMessage, Loading } from '../components/Feedback.jsx'
import ProgressBar from '../components/ProgressBar.jsx'
import { dateBR, money, percent } from '../format.js'
import { useApi } from '../useApi.js'

function monthsUntil(iso) {
  const [y, m] = iso.split('-').map(Number)
  const now = new Date()
  return (y - now.getFullYear()) * 12 + (m - 1 - now.getMonth())
}

function GoalCard({ goal, onChange }) {
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)
  const p = goal.current_amount / goal.target_amount
  const remaining = Math.max(0, goal.target_amount - goal.current_amount)
  const months = goal.deadline ? monthsUntil(goal.deadline) : null
  const done = remaining === 0

  async function deposit(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post(`/goals/${goal.id}/deposit`, { amount: Number(amount) })
      setAmount('')
      onChange()
    } catch (err) {
      setError(err.message)
    }
  }

  async function remove() {
    if (!window.confirm(`Excluir a meta "${goal.name}"?`)) return
    await api.del(`/goals/${goal.id}`)
    onChange()
  }

  return (
    <article className="card goal-card" aria-labelledby={`goal-${goal.id}`}>
      <div className="card-header">
        <h2 id={`goal-${goal.id}`}>{goal.name}</h2>
        {done && (
          <span className="badge badge-ok">
            <span aria-hidden="true">🏆</span> Meta atingida
          </span>
        )}
      </div>
      <p className="goal-amount">
        <strong>{money(goal.current_amount)}</strong> <span className="muted">de {money(goal.target_amount)}</span>
      </p>
      <ProgressBar value={p} label={`Progresso da meta ${goal.name}: ${percent(p)}`} />
      <p className="muted">
        {percent(p)} concluído
        {goal.deadline && <> · Prazo: {dateBR(goal.deadline)}</>}
      </p>
      {!done && months > 0 && (
        <p className="goal-hint">
          <span aria-hidden="true">💡</span> Guardando <strong>{money(remaining / months)}</strong> por mês você atinge a meta no prazo.
        </p>
      )}
      <form className="inline-edit" onSubmit={deposit}>
        <label>
          <span className="sr-only">Valor a guardar na meta {goal.name}</span>
          <input type="number" min="0.01" step="0.01" required placeholder="Valor (R$)" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </label>
        <button type="submit" className="btn btn-primary btn-sm">
          Guardar
        </button>
        <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={remove} aria-label={`Excluir meta ${goal.name}`}>
          Excluir
        </button>
      </form>
      <ErrorMessage>{error}</ErrorMessage>
    </article>
  )
}

export default function Goals() {
  const goals = useApi('/goals')
  const [form, setForm] = useState({ name: '', target_amount: '', deadline: '' })
  const [error, setError] = useState(null)

  async function create(e) {
    e.preventDefault()
    setError(null)
    try {
      await api.post('/goals', {
        name: form.name,
        target_amount: Number(form.target_amount),
        deadline: form.deadline || null,
      })
      setForm({ name: '', target_amount: '', deadline: '' })
      goals.reload()
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <>
      <div className="page-header">
        <h1>Metas financeiras</h1>
      </div>
      <p className="muted">Defina objetivos, guarde dinheiro aos poucos e acompanhe seu progresso.</p>
      <ErrorMessage>{goals.error}</ErrorMessage>
      {goals.loading && !goals.data ? (
        <Loading />
      ) : (
        <div className="goal-grid">
          {goals.data?.map((g) => (
            <GoalCard key={g.id} goal={g} onChange={goals.reload} />
          ))}
        </div>
      )}

      <section className="card" aria-labelledby="nova-meta-title">
        <h2 id="nova-meta-title">Nova meta</h2>
        <form className="form form-inline" onSubmit={create}>
          <label>
            Nome da meta
            <input required maxLength={120} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex.: Trocar de celular" />
          </label>
          <label>
            Valor-alvo (R$)
            <input type="number" required min="1" step="0.01" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          </label>
          <label>
            Prazo (opcional)
            <input type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
          </label>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">
              Criar meta
            </button>
          </div>
          <ErrorMessage>{error}</ErrorMessage>
        </form>
      </section>
    </>
  )
}
