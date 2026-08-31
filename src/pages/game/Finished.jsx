import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { totale, BONUS_MIN, LIVELLO_MAX } from '../../lib/games'

// Schermata di fine partita. Ci si arriva senza navigare: il vincitore
// scrive `status: 'finished'`, l'onSnapshot lo rimanda a tutti e `Game.jsx`
// cambia vista su ogni dispositivo insieme.
function Finished({ gameId, partita, giocatori }) {
  const { user } = useAuth()
  const hoVinto = partita.winnerUid === user.uid

  // Qui si ordina per livello, mentre il tabellone resta in ordine
  // d'ingresso: lì riordinare farebbe scappare le righe sotto il dito.
  // La copia serve perché `sort` ordina sul posto lo snapshot.
  const classifica = [...giocatori].sort(
    (a, b) => b.level - a.level || totale(b) - totale(a),
  )

  return (
    <section className="colonna">
      <div className="vittoria">
        <p className="occhiello">Partita {gameId} — finita</p>
        <h1>
          {hoVinto ? 'Hai vinto!' : `Ha vinto ${partita.winnerName}`}
        </h1>
        <p>
          Livello {LIVELLO_MAX} raggiunto. Da qui non si torna indietro: per
          rigiocare si crea una partita nuova.
        </p>
      </div>

      <h2>Come è finita</h2>
      <ol className="classifica">
        {classifica.map((g) => {
          const bonus = g.bonus ?? BONUS_MIN
          const vincitore = g.uid === partita.winnerUid

          return (
            <li
              key={g.uid}
              className={vincitore ? 'giocatore vincitore' : 'giocatore'}
              style={{ '--livello': g.level }}
            >
              <span className="nome">
                {g.name}
                {g.uid === partita.hostUid && ' — host'}
                {g.uid === user.uid && ' — tu'}
                {g.isFighter && ' ⚔'}
              </span>

              <span className="statistiche">
                <span className="valore">
                  <span className="etichetta">Livello</span>
                  <strong>{g.level}</strong>
                </span>
                <span className="valore bonus">
                  <span className="etichetta">Bonus</span>
                  <strong>{bonus}</strong>
                </span>
                <span className="valore forza">
                  <span className="etichetta">Forza</span>
                  <strong>{totale(g)}</strong>
                </span>
              </span>
            </li>
          )
        })}
      </ol>

      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default Finished
