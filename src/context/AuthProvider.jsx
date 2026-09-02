import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from './AuthContext'

// Tiene il listener di Firebase Auth e mette { user, loading } nel contesto.
//
//   user    User | null — null se nessuno è autenticato
//   loading boolean — vero finché il primo onAuthStateChanged non risponde
function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Scatta a ogni login e logout, e una prima volta al ripristino della
    // sessione salvata. Restituisce la funzione che stacca il listener.
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Senza useMemo l'oggetto sarebbe nuovo a ogni render e 
  // rifarebbe renderizzare tutti i componenti che leggono il contesto.
  const value = useMemo(() => ({ user, loading }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
