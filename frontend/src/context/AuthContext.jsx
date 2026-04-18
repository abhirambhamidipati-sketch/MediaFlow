import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import api from '../api/axios'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)      // { id, username, email, role, is_verified, verification_status }
  const [loading, setLoading] = useState(true)

  // Fetch current user profile using stored access token
  const fetchMe = useCallback(async () => {
    const token = localStorage.getItem('access')
    if (!token) { setLoading(false); return }
    try {
      const { data } = await api.get('/users/me/')
      setUser(data)
    } catch {
      localStorage.removeItem('access')
      localStorage.removeItem('refresh')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (username, password) => {
    const { data } = await api.post('/token/', { username, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    await fetchMe()
  }

  const register = async (username, password, email) => {
    await api.post('/users/register/', { username, password, email })
    await login(username, password)
  }

  const logout = useCallback(() => {
    localStorage.removeItem('access')
    localStorage.removeItem('refresh')
    setUser(null)
  }, [])

  const refreshUser = useCallback(() => fetchMe(), [fetchMe])

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
