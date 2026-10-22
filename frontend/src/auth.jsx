import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, tokenStore } from './api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(tokenStore.get()))

  useEffect(() => {
    if (!tokenStore.get()) return
    api
      .get('/auth/me')
      .then(setUser)
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const authenticate = useCallback(async (path, payload) => {
    const data = await api.post(path, payload)
    tokenStore.set(data.access_token)
    setUser(data.user)
  }, [])

  const login = useCallback((email, password) => authenticate('/auth/login', { email, password }), [authenticate])
  const register = useCallback((name, email, password) => authenticate('/auth/register', { name, email, password }), [authenticate])
  const logout = useCallback(() => {
    tokenStore.clear()
    setUser(null)
  }, [])
  const refreshUser = useCallback(() => api.get('/auth/me').then(setUser), [])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
