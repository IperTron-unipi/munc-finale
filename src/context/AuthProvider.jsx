import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { AuthContext } from './AuthContext'

function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    //chiamo onAuthStateChanged per creare un listener che quando cambia
    //lo stato dell'utente (login/logout) aggiorna lo stato del contesto
    //restituisce una funzione di cleanup che rimuove il listener quando il componente si smonta
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
      setLoading(false)
    })
    return unsubscribe
  }, [])            //nessuna dipendenza si esegue solo all'avvio

  const value = useMemo(() => ({ user, loading }), [user, loading])     //mantiene i dati tra i render

  //salvo value nel contesto e renderizzo la componente, che potra accedere al contesto
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export default AuthProvider
