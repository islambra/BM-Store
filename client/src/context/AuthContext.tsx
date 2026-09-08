import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import * as api from '../services/api'
import type { User } from '../services/api'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<User>
  register: (name: string, email: string, password: string) => Promise<User>
  logout: () => Promise<void>
  becomeMarketer: () => Promise<User>
  isMarketer: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    api
      .getMe()
      .then(({ user }) => {
        if (active) setUser(user)
      })
      .catch(() => {
        if (active) setUser(null)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user } = await api.login(email, password)
    setUser(user)
    return user
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user } = await api.register(name, email, password)
    setUser(user)
    return user
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const becomeMarketer = useCallback(async () => {
    const { user } = await api.becomeMarketer()
    setUser(user)
    return user
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      login,
      register,
      logout,
      becomeMarketer,
      isMarketer: !!user && (user.role === 'MARKETER' || user.role === 'ADMIN'),
      isAdmin: !!user && user.role === 'ADMIN',
    }),
    [user, loading, login, register, logout, becomeMarketer]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}