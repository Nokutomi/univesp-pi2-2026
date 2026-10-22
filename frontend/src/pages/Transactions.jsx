import { useMemo, useState } from 'react'
import { api } from '../api.js'
import { ErrorMessage, Loading } from '../components/Feedback.jsx'
import MonthPicker from '../components/MonthPicker.jsx'
import { currentMonth, dateBR, money, todayISO } from '../format.js'
import { useApi } from '../useApi.js'

const EMPTY = { kind: 'despesa', category_id: '', description: '', amount: '', date: todayISO() }

function TransactionForm({ categories, initial, onSaved, onCancel }) {
  const [form, setForm] = useState(initial)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const options = categories.filter((c) => c.kind === form.kind)
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const payload = { ...form, category_id: Number(form.category_id), amount: Number(form.amount) }
    try {
      if (form.id) await api.put(`/transactions/${form.id}`, payload)
      else await api.post('/transactions', payload)
      onSaved()
      if (!form.id) setForm({ ...EMPTY, kind: form.kind, date: form.date })
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="form form-inline" onSubmit={submit} aria-label={form.id ? 'Editar transação' : 'Nova transação'}>
      <fieldset className="segmented">
        <legend className="sr-only">Tipo</legend>
        {['despesa', 'receita'].map((k) => (
          <label key={k} className={form.kind === k ? 'active' : ''}>
            <input
              type="radio"
              name="kind"
              value={k}
              checked={form.kind === k}
              onChange={() => setForm({ ...form, kind: k, category_id: '' })}
            />
            {k === 'despesa' ? 'Despesa' : 'Receita'}
          </label>
        ))}
      </fieldset>
      <label>
        Descrição
        <input required maxLength={200} value={form.description} onChange={set('description')} placeholder="Ex.: Supermercado" />
      </label>
      <label>
        Categoria
        <select required value={form.category_id} onChange={set('category_id')}>
          <option value="">Selecione…</option>
          {options.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Valor (R$)
        <input type="number" required min="0.01" step="0.01" inputMode="decimal" value={form.amount} onChange={set('amount')} />
      </label>
      <label>
        Data
        <input type="date" required value={form.date} onChange={set('date')} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {form.id ? 'Salvar alterações' : 'Adicionar'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
      <ErrorMessage>{error}</ErrorMessage>
    </form>
  )
}

export default function Transactions() {
  const [month, setMonth] = useState(currentMonth())
  const [kind, setKind] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [editing, setEditing] = useState(null)
  const [status, setStatus] = useState('')

  const categories = useApi('/categories')
  const query = new URLSearchParams({ month, ...(kind && { kind }), ...(categoryId && { category_id: categoryId }) })
  const txs = useApi(`/transactions?${query}`)

  const totals = useMemo(() => {
    const list = txs.data || []
    const sum = (k) => list.filter((t) => t.kind === k).reduce((acc, t) => acc + t.amount, 0)
    return { receita: sum('receita'), despesa: sum('despesa') }
  }, [txs.data])

  async function remove(tx) {
    if (!window.confirm(`Excluir "${tx.description}"?`)) return
    await api.del(`/transactions/${tx.id}`)
    setStatus(`Transação "${tx.description}" excluída.`)
    txs.reload()
  }

  function saved() {
    setStatus(editing ? 'Transação atualizada.' : 'Transação adicionada.')
    setEditing(null)
    txs.reload()
  }

  const cats = categories.data || []

  return (
    <>
      <div className="page-header">
        <h1>Transações</h1>
        <MonthPicker value={month} onChange={setMonth} />
      </div>

      <section className="card" aria-labelledby="nova-title">
        <h2 id="nova-title">{editing ? 'Editar transação' : 'Nova transação'}</h2>
        {cats.length > 0 && (
          <TransactionForm
            key={editing?.id ?? 'new'}
            categories={cats}
            initial={editing ? { ...editing, category_id: String(editing.category_id) } : EMPTY}
            onSaved={saved}
            onCancel={editing ? () => setEditing(null) : null}
          />
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {status}
        </p>
      </section>

      <section className="card" aria-labelledby="hist-title">
        <div className="card-header">
          <h2 id="hist-title">Histórico</h2>
          <div className="filters">
            <label>
              Tipo
              <select value={kind} onChange={(e) => setKind(e.target.value)}>
                <option value="">Todos</option>
                <option value="despesa">Despesas</option>
                <option value="receita">Receitas</option>
              </select>
            </label>
            <label>
              Categoria
              <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
                <option value="">Todas</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <p className="totals">
          Receitas: <strong className="tone-good">{money(totals.receita)}</strong> · Despesas:{' '}
          <strong>{money(totals.despesa)}</strong>
        </p>

        <ErrorMessage>{txs.error}</ErrorMessage>
        {txs.loading && !txs.data ? (
          <Loading />
        ) : txs.data?.length === 0 ? (
          <p className="muted">Nenhuma transação encontrada para os filtros selecionados.</p>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="sr-only">Transações do mês</caption>
              <thead>
                <tr>
                  <th scope="col">Data</th>
                  <th scope="col">Descrição</th>
                  <th scope="col">Categoria</th>
                  <th scope="col" className="num">Valor</th>
                  <th scope="col">
                    <span className="sr-only">Ações</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {txs.data?.map((t) => (
                  <tr key={t.id}>
                    <td>{dateBR(t.date)}</td>
                    <td>{t.description}</td>
                    <td>
                      <span className="cat-chip">
                        <span className="swatch" style={{ background: t.category.color }} aria-hidden="true" />
                        {t.category.name}
                      </span>
                    </td>
                    <td className={`num ${t.kind === 'receita' ? 'tone-good' : ''}`}>
                      {t.kind === 'receita' ? '+ ' : '− '}
                      {money(t.amount)}
                    </td>
                    <td className="row-actions">
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(t)} aria-label={`Editar ${t.description}`}>
                        Editar
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm btn-danger" onClick={() => remove(t)} aria-label={`Excluir ${t.description}`}>
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
