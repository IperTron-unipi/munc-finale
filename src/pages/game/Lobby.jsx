import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useInvio } from '../../hooks/useInvio'
import Errore from '../../components/Errore'
import { iniziaPartita } from '../../lib/games'

// La sala d'attesa: mostra il codice da passare agli altri e, all'host,
// il bottone per iniziare. Props { gameId, partita, giocatori } — vedi Game.jsx.
function Lobby({ gameId, partita, giocatori }) {
  const { user } = useAuth()
  const [copiato, setCopiato] = useState(false)
  const { error, submitting, invia } = useInvio()

  const sonoHost = partita.hostUid === user.uid

  // "Copiato" torna da solo a "Copia" dopo due secondi. Il clearTimeout
  // serve se si esce dalla pagina prima che scada.
  useEffect(() => {
    if (!copiato) return
    const attesa = setTimeout(() => setCopiato(false), 2000)
    return () => clearTimeout(attesa)
  }, [copiato])

  // navigator.clipboard c'è solo in contesto sicuro: manca su
  // http://192.168.x.x, cioè proprio quando si prova dal telefono. Lì il
  // bottone non compare, invece di non fare niente.
  const puoiCopiare = Boolean(navigator.clipboard)

  async function copiaCodice() {
    try {
      await navigator.clipboard.writeText(gameId)
      setCopiato(true)
    } catch {
      // Permesso negato dal browser: il codice resta comunque a schermo.
    }
  }

  // Nessun navigate: l'update cambia status, onSnapshot lo rimanda a tutti
  // e Game.jsx passa alla vista Playing su ogni dispositivo.
  function inizia() {
    invia(() => iniziaPartita(gameId))
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

      {/* Da solo in lobby non c'è ancora una partita. */}
      {giocatori.length === 1 && (
        <p className="stato">Sei il primo. Aspetta che gli altri entrino.</p>
      )}

      <Errore messaggio={error} />

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
