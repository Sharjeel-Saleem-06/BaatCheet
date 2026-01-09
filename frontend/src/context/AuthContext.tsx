import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { api } from '../utils/api'

interface User {
  id: string
  email: string
  name: string
  preferences?: {
    theme: string
    defaultModel: string
    language: string
  }
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, password: string, name: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'))
  const [isLoading, setIsLoading] = useState(true)

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me')
          if (response.success) {
            setUser(response.data)
          } else {
            // Token invalid
            localStorage.removeItem('token')
            setToken(null)
          }
        } catch {
          localStorage.removeItem('token')
          setToken(null)
        }
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [token])

  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password })
    
    if (response.success) {
      setToken(response.data.token)
      setUser(response.data.user)
      localStorage.setItem('token', response.data.token)
    } else {
      throw new Error(response.error || 'Login failed')
    }
  }

  const register = async (email: string, password: string, name: string) => {
    const response = await api.post('/auth/register', { email, password, name })
    
    if (response.success) {
      setToken(response.data.token)
      setUser(response.data.user)
      localStorage.setItem('token', response.data.token)
    } else {
      throw new Error(response.error || 'Registration failed')
    }
  }

  const logout = () => {
    setUser(null)
    setToken(null)
    localStorage.removeItem('token')
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
