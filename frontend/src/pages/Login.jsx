import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'
import { ErrorMessage } from '../components/Feedback.jsx'

export default function Login() {
  const { user, login, register } = useAuth()
  const [mode, setMode] = useState('login')
  const [form, setForm] = useState({ name: '', email: 'demo@univesp.br', password: 'demo123' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to="/" replace />

  const isLogin = mode === 'login'
  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  async function submit(e) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      if (isLogin) await login(form.email, form.password)
      else await register(form.name, form.email, form.password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  function switchMode() {
    setError(null)
    setMode(isLogin ? 'register' : 'login')
    setForm(isLogin ? { name: '', email: '', password: '' } : { name: '', email: 'demo@univesp.br', password: 'demo123' })
  }

  return (
    <main className="login-page" id="conteudo">
      <section className="login-card" aria-labelledby="login-title">
        <p className="brand brand-lg">
          <span aria-hidden="true">💰</span> Finanças em Dia
        </p>
        <h1 id="login-title">{isLogin ? 'Entrar' : 'Criar conta'}</h1>
        <p className="muted">Organize seus gastos, defina metas e aprenda sobre educação financeira.</p>

        <form onSubmit={submit} className="form">
          {!isLogin && (
            <label>
              Nome
              <input required minLength={2} value={form.name} onChange={set('name')} autoComplete="name" />
            </label>
          )}
          <label>
            E-mail
            <input type="email" required value={form.email} onChange={set('email')} autoComplete="email" />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              minLength={isLogin ? 1 : 6}
              value={form.password}
              onChange={set('password')}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
            />
            {!isLogin && <small className="muted">Mínimo de 6 caracteres.</small>}
          </label>
          <ErrorMessage>{error}</ErrorMessage>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Aguarde…' : isLogin ? 'Entrar' : 'Cadastrar'}
          </button>
        </form>

        {isLogin && (
          <p className="hint">
            Usuário de demonstração já preenchido: <strong>demo@univesp.br</strong> / <strong>demo123</strong>
          </p>
        )}
        <button type="button" className="btn btn-link" onClick={switchMode}>
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
        </button>
      </section>
    </main>
  )
}
