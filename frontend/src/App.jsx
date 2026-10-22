import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth.jsx'
import Layout from './components/Layout.jsx'
import Budget from './pages/Budget.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Education from './pages/Education.jsx'
import Goals from './pages/Goals.jsx'
import Login from './pages/Login.jsx'
import Transactions from './pages/Transactions.jsx'

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <p className="loading">Carregando…</p>
  return user ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="transacoes" element={<Transactions />} />
        <Route path="orcamento" element={<Budget />} />
        <Route path="metas" element={<Goals />} />
        <Route path="educacao" element={<Education />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
