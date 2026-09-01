import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

// Traduce i code di Firebase. Il default copre i casi non previsti:
// il form non resta mai muto.
function messaggioErrore(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Questa email è già registrata. Passa ad Accedi.'
    case 'auth/invalid-email':
      return 'Questa email non è valida. Controlla la scrittura.'
    case 'auth/weak-password':
      return 'La password deve avere almeno 6 caratteri.'
    case 'auth/invalid-credential':
      return 'Email o password non corrispondono. Controlla e riprova.'
    case 'auth/network-request-failed':
      return 'Nessuna connessione. Controlla la rete e riprova.'
    case 'auth/too-many-requests':
      return 'Troppi tentativi. Aspetta qualche minuto e riprova.'
    default:
      return 'Qualcosa è andato storto. Riprova.'
  }
}

function Login() {
  const { user, loading } = useAuth()               // null se non autenticato
  const [mode, setMode] = useState('accedi')        // 'accedi' o 'registrati'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')  // solo in registrazione
  const [error, setError] = useState(null)          // null se non c'è niente da dire
  const [submitting, setSubmitting] = useState(false)  // form disabilitato durante la chiamata

  if (loading) return <p className="stato">Apro la sessione…</p>
  // È anche il redirect dopo l'accesso: user cambia e questa riga scatta.
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

    // Il minimo di 6 caratteri lo impone Firebase: controllarlo qui evita
    // il giro di rete e mostra subito il messaggio.
    if (password.length < 6) {
      setError(messaggioErrore('auth/weak-password'))
      return
    }

    // La conferma è un controllo mio: Firebase non la prevede.
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
      // Nessun navigate: quando onAuthStateChanged scatta, il redirect
      // qui sopra porta su "/".
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
        {/* autoComplete: nuova password in registrazione, quella salvata in accesso */}
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={registrazione ? 'new-password' : 'current-password'}
          required
        />
        {registrazione && <p className="aiuto">Almeno 6 caratteri.</p>}

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
          {submitting
            ? registrazione
              ? 'Registrazione…'
              : 'Accesso…'
            : registrazione
              ? 'Registrati'
              : 'Accedi'}
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
