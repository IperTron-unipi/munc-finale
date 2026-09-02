import { createContext, useContext } from 'react'

// { user: User | null, loading: boolean } — vedi AuthProvider.
// null è il valore fuori dal provider, non un utente assente.
export const AuthContext = createContext(null)

// () -> { user, loading }. Lancia se usato fuori da <AuthProvider>.
export function useAuth() {
  const value = useContext(AuthContext)
  if (value === null) {
    throw new Error('useAuth va usato dentro <AuthProvider>')
  }
  return value
}
