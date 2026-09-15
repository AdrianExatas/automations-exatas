import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  AUTH_STORAGE_KEY,
  DEMO_USERS,
  type AuthUser,
} from '../constants/users'

interface AuthContextValue {
  user: AuthUser | null
  login: (usuario: string, senha: string) => { ok: true } | { ok: false; erro: string }
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function lerUsuarioPersistido(): AuthUser | null {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AuthUser
    if (!parsed?.usuario || !parsed?.nome) return null
    return parsed
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => lerUsuarioPersistido())

  const login = useCallback((usuario: string, senha: string) => {
    const found = DEMO_USERS.find(
      (u) => u.usuario.toLowerCase() === usuario.trim().toLowerCase() && u.senha === senha,
    )
    if (!found) {
      return { ok: false as const, erro: 'Usuário ou senha inválidos.' }
    }
    const authUser: AuthUser = {
      usuario: found.usuario,
      nome: found.nome,
      cargo: found.cargo,
    }
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authUser))
    setUser(authUser)
    return { ok: true as const }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    setUser(null)
  }, [])

  const value = useMemo(() => ({ user, login, logout }), [user, login, logout])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider')
  }
  return ctx
}
