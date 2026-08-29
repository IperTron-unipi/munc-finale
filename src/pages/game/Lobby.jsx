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

  async function copiaCodice() {
    // navigator.clipboard esiste solo in contesto sicuro: c'è su https
    // e su localhost, non su http://192.168.x.x — cioè proprio quando
    // si prova dal telefono in rete locale. Se manca, si legge a voce.
    if (!navigator.clipboard) return
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
      // Nessun navigate: l'update cambia status, onSnapshot lo rimanda
      // indietro e Game.jsx passa da solo alla vista Playing.
      // Succede su tutti i dispositivi insieme, non solo su quello dell'host.
    } catch (err) {
      setError(messaggioErroreGioco(err.code))
      setSubmitting(false)
    }
  }

  return (
    <section className="colonna">
      <h1>Sala d'attesa</h1>

      <p>Condividi questo codice con gli altri giocatori:</p>
      <p>
        <strong className="codice">{gameId}</strong>{' '}
        <button type="button" className="link" onClick={copiaCodice}>
          {copiato ? 'Copiato' : 'Copia'}
        </button>
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

      {error && (
        <p className="errore" role="alert">
          {error}
        </p>
      )}

      {sonoHost ? (
        <button type="button" onClick={inizia} disabled={submitting}>
          {submitting ? 'Attendi…' : 'Inizia partita'}
        </button>
      ) : (
        <p className="stato">In attesa che l'host faccia iniziare la partita…</p>
      )}

      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default Lobby
