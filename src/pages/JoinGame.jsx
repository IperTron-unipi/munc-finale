import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  unisciti,
  messaggioErroreGioco,
  LUNGHEZZA_NOME_MAX,
} from '../lib/games'
import {
  normalizzaCodice,
  codiceValido,
  LUNGHEZZA_CODICE,
} from '../lib/gameCode'

function JoinGame() {
  const { user } = useAuth()
  const navigate = useNavigate()

  // Chi arriva da /game/XXXXXX senza essere in partita trova il campo
  // già compilato.
  const [parametri] = useSearchParams()
  const [codice, setCodice] = useState(() =>
    normalizzaCodice(parametri.get('codice') ?? ''),
  )                                         // già normalizzato: vedi onChange
  const [nome, setNome] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    if (!codiceValido(codice)) {
      setError(`Il codice è di ${LUNGHEZZA_CODICE} caratteri. Controllalo e riprova.`)
      return
    }

    const nomePulito = nome.trim()
    if (nomePulito === '') {
      setError('Scrivi il nome del personaggio')
      return
    }

    setSubmitting(true)
    try {
      await unisciti(codice, user.uid, nomePulito)
      navigate(`/game/${codice}`, { replace: true })
    } catch (err) {
      setError(messaggioErroreGioco(err.code))
      setSubmitting(false)
    }
  }

  return (
    <section className="colonna">
      <h1>Unisciti a una partita</h1>

      <form className="colonna" onSubmit={handleSubmit}>
        <label htmlFor="codice">Codice partita</label>
        {/* Normalizzato nell'onChange e non al submit: il campo si
            corregge mentre si scrive. */}
        <input
          id="codice"
          type="text"
          value={codice}
          onChange={(e) => setCodice(normalizzaCodice(e.target.value))}
          maxLength={LUNGHEZZA_CODICE}
          autoComplete="off"
          autoCapitalize="characters"
          required
        />
        <p className="aiuto">
          {LUNGHEZZA_CODICE} caratteri, te lo passa chi ha creato la partita.
        </p>

        <label htmlFor="nome">Nome del personaggio</label>
        <input
          id="nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={LUNGHEZZA_NOME_MAX}
          autoComplete="off"
          required
        />
        <p className="aiuto">
          È il nome con cui ti vedono gli altri sul tabellone.
        </p>

        {error && (
          <p className="errore" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Entro nella partita…' : 'Unisciti a una partita'}
        </button>
      </form>

      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default JoinGame
