import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

const LINKS = [
  { to: '/', label: 'Dashboard', icon: '📊', end: true },
  { to: '/transacoes', label: 'Transações', icon: '💸' },
  { to: '/orcamento', label: 'Orçamento', icon: '🧾' },
  { to: '/metas', label: 'Metas', icon: '🎯' },
  { to: '/educacao', label: 'Educação', icon: '📚' },
]

export default function Layout() {
  const { user, logout } = useAuth()

  return (
    <div className="app">
      <a href="#conteudo" className="skip-link">
        Pular para o conteúdo
      </a>
      <header className="topbar">
        <span className="brand">
          <span aria-hidden="true">💰</span> Finanças em Dia
        </span>
        <div className="userbox">
          <span className="points" title="Pontos ganhos em quizzes e desafios">
            <span aria-hidden="true">⭐</span> {user.points} pontos
          </span>
          <span className="username">Olá, {user.name.split(' ')[0]}</span>
          <button type="button" className="btn btn-ghost" onClick={logout}>
            Sair
          </button>
        </div>
      </header>
      <nav className="sidenav" aria-label="Navegação principal">
        <ul>
          {LINKS.map((l) => (
            <li key={l.to}>
              <NavLink to={l.to} end={l.end}>
                <span aria-hidden="true">{l.icon}</span> {l.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      <main id="conteudo" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  )
}
