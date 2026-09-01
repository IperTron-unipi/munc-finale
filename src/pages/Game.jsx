import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { usePartita } from '../hooks/usePartita'
import { useNotificaVittoria } from '../hooks/useNotificaVittoria'
import { messaggioErroreGioco } from '../lib/games'
import AvvisoNotifiche from '../components/AvvisoNotifiche'
import Lobby from './game/Lobby'
import Playing from './game/Playing'
import Finished from './game/Finished'

function Game() {
  const { gameId } = useParams()
  const { user } = useAuth()
  const { partita, giocatori, loading, error } = usePartita(gameId)

  // Qui e non dentro le viste: quando qualcuno vince si passa da `Playing`
  // a `Finished`, e l'hook si smonterebbe proprio nel momento che deve
  // riconoscere. Inoltre gli hook vanno chiamati prima dei return qui sotto.
  useNotificaVittoria(gameId, partita, user.uid)

  if (loading) return <p className="stato">Carico la partita…</p>

  if (error) {
    return (
      <section className="colonna">
        <p className="errore" role="alert">{messaggioErroreGioco(error)}</p>
        <Link to="/">Torna alla home</Link>
      </section>
    )
  }

  // Il codice nell'URL non corrisponde a nessuna partita. Senza questo
  // controllo si entrerebbe in una lobby fantasma: vuota, con un codice
  // che non si può condividere perché non esiste niente dall'altra parte.
  if (partita === null) {
    return (
      <section className="colonna">
        <h1>Partita non trovata</h1>
        <p className="errore" role="alert">
          {messaggioErroreGioco('gioco/codice-inesistente')}
        </p>
        <Link to="/join">Prova con un altro codice</Link>
        <Link to="/">Torna alla home</Link>
      </section>
    )
  }

  // La partita esiste ma tu non ci sei dentro: sei arrivato da un link
  // condiviso senza passare da /join. Vedresti la lobby degli altri
  // senza comparire nella lista, che è il modo peggiore di scoprirlo.
  const sonoDentro = giocatori.some((g) => g.uid === user.uid)
  if (!sonoDentro) {
    return (
      <section className="colonna">
        <h1>Non fai parte di questa partita</h1>
        <p>
          La partita {gameId} esiste, ma non sei fra i suoi giocatori. Per
          giocare devi unirti con il codice.
        </p>
        <Link to={`/join?codice=${gameId}`}>Unisciti a {gameId}</Link>
        <Link to="/">Torna alla home</Link>
      </section>
    )
  }

  const viste = { lobby: Lobby, playing: Playing, finished: Finished }
  const Vista = viste[partita.status] ?? Lobby

  return (
    <>
      {/* A partita finita non c'è più niente da annunciare. */}
      {partita.status !== 'finished' && <AvvisoNotifiche />}

      <Vista
        gameId={gameId}
        partita={partita}
        giocatori={giocatori}
        sonoHost={partita.hostUid === user.uid}
      />
    </>
  )
}

export default Game
