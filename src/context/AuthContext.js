import { createContext, useContext } from 'react'

// { user, loading } — vedi AuthProvider
export const AuthContext = createContext(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth va usato dentro <AuthProvider>')
  }
  return value
}
