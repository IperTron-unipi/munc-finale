import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

// Traduce i code di Firebase. Il default copre i casi non previsti
// (rete assente, troppi tentativi): mai lasciare il form muto.
function messaggioErrore(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Email già registrata'
    case 'auth/invalid-email':
      return 'Email non valida'
    case 'auth/weak-password':
      return 'Password troppo corta (minimo 6 caratteri)'
    case 'auth/invalid-credential':
      return 'Email o password errati'
    default:
      return 'Qualcosa è andato storto. Riprova.'
  }
}

function Login() {
  const { user, loading } = useAuth()                           // user è null se non autenticato, altrimenti è l'oggetto User di Firebase
  const [mode, setMode] = useState('accedi')                    // 'accedi' o 'registrati'
  const [email, setEmail] = useState('')                        // contiene l'email inserita dall'utente
  const [password, setPassword] = useState('')                  // contiene la password inserita dall'utente
  const [passwordConfirm, setPasswordConfirm] = useState('')    // contiene la conferma della password, solo in registrazione
  const [error, setError] = useState(null)                      // flag per mostrare un messaggio di errore, null se non c'è errore
  const [submitting, setSubmitting] = useState(false)           // flag per disabilitare il form durante la chiamata a Firebase

  if (loading) return <p className="stato">Caricamento…</p>
  // È anche il redirect dopo un accesso riuscito: user cambia e questa riga scatta.
  if (user) return <Navigate to="/" replace />

  const registrazione = mode === 'registrati'

  function cambiaModalita() {
    setMode(registrazione ? 'accedi' : 'registrati')
    setPasswordConfirm('')
    setError(null)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    // Il minimo di 6 caratteri (lo impone Firebase)
    // quindi evito di fare la chiamata se non è rispettato, così l'utente vede subito il messaggio.
    if (password.length < 6) {
      setError(messaggioErrore('auth/weak-password'))
      return
    }

    // La conferma è un controllo implementato da me: Firebase non lo prevede.
    if (registrazione && password !== passwordConfirm) {
      setError('Le due password non coincidono')
      return
    }

    setSubmitting(true)
    try {
      if (registrazione) {
        await createUserWithEmailAndPassword(auth, email, password)
      } else {
        await signInWithEmailAndPassword(auth, email, password)
      }
      // Nessun navigate(): quando onAuthStateChanged scatta, il redirect
      // qui sopra porta l'utente su "/".
    } catch (err) {
      setError(messaggioErrore(err.code))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="colonna">
      <h1>Munchkin Tracker</h1>
      <h2>{registrazione ? 'Registrati' : 'Accedi'}</h2>

      <form className="colonna" onSubmit={handleSubmit}>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />

        <label htmlFor="password">Password</label>
        {/* autoComplete dice al gestore password se proporne una nuova o riempire quella salvata */}
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={registrazione ? 'new-password' : 'current-password'}
          required
        />

        {registrazione && (
          <>
            <label htmlFor="password-confirm">Conferma password</label>
            <input
              id="password-confirm"
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </>
        )}

        {error && (
          <p className="errore" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Attendi…' : registrazione ? 'Registrati' : 'Accedi'}
        </button>
      </form>

      <p>
        {registrazione ? 'Hai già un account?' : 'Non hai un account?'}{' '}
        <button type="button" className="link" onClick={cambiaModalita}>
          {registrazione ? 'Accedi' : 'Registrati'}
        </button>
      </p>
    </section>
  )
}

export default Login
