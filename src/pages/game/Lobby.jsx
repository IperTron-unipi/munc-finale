import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { iniziaPartita, messaggioErroreGioco } from '../../lib/games'

function Lobby({ gameId, partita, giocatori, sonoHost }) {
  const { user } = useAuth()
  const [copiato, setCopiato] = useState(false)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // "Copiato" torna da solo a "Copia" dopo due secondi.
  // Il clearTimeout serve se si esce dalla pagina prima che scada.
  useEffect(() => {
    if (!copiato) return
    const attesa = setTimeout(() => setCopiato(false), 2000)
    return () => clearTimeout(attesa)
  }, [copiato])

  // navigator.clipboard c'è solo in contesto sicuro: manca su
  // http://192.168.x.x, cioè proprio quando si prova dal telefono. Senza,
  // il bottone non compare: un comando che non fa niente è peggio di uno
  // che manca.
  const puoiCopiare = Boolean(navigator.clipboard)

  async function copiaCodice() {
    try {
      await navigator.clipboard.writeText(gameId)
      setCopiato(true)
    } catch {
      // Permesso negato dal browser: il codice resta comunque a schermo.
    }
  }

  async function inizia() {
    setError(null)
    setSubmitting(true)
    try {
      await iniziaPartita(gameId)
      // Nessun navigate: l'update cambia status, onSnapshot lo rimanda a
      // tutti e Game.jsx passa alla vista Playing su ogni dispositivo.
    } catch (err) {
      setError(messaggioErroreGioco(err.code))
      setSubmitting(false)
    }
  }

  return (
    <section className="colonna">
      <h1>Sala d'attesa</h1>

      <p>Passa questo codice agli altri giocatori:</p>
      <p>
        <strong className="codice">{gameId}</strong>{' '}
        {puoiCopiare && (
          <button type="button" className="link" onClick={copiaCodice}>
            {copiato ? 'Copiato' : 'Copia il codice'}
          </button>
        )}
      </p>

      <h2>Giocatori ({giocatori.length})</h2>
      <ul>
        {giocatori.map((g) => (
          <li key={g.uid}>
            {g.name}
            {g.uid === partita.hostUid && ' — host'}
            {g.uid === user.uid && ' — tu'}
          </li>
        ))}
      </ul>

      {/* Da solo in lobby non c'è ancora una partita: dirlo evita l'attesa
          di qualcosa che non sta per succedere. */}
      {giocatori.length === 1 && (
        <p className="stato">Sei il primo. Aspetta che gli altri entrino.</p>
      )}

      {error && (
        <p className="errore" role="alert">
          {error}
        </p>
      )}

      {sonoHost ? (
        <button type="button" onClick={inizia} disabled={submitting}>
          {submitting ? 'Avvio la partita…' : 'Inizia partita'}
        </button>
      ) : (
        <p className="stato">
          Aspetta che l'host avvii la partita. Il tabellone si apre da solo.
        </p>
      )}

      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default Lobby
