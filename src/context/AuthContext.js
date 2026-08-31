import { createContext, useContext } from 'react'

// { user, loading } — vedi AuthProvider
export const AuthContext = createContext(null)

//Hook per leggere il contesto.
//Se usato fuori da <AuthProvider> lancia un errore.
export function useAuth() {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth va usato dentro <AuthProvider>')
  }
  return value
}
