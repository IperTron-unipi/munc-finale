import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { totale, BONUS_MIN, LIVELLO_MAX } from '../../lib/games'

// Schermata di fine partita. Props { gameId, partita, giocatori } — vedi
// Game.jsx. Ci si arriva senza navigare: il vincitore scrive
// `status: 'finished'` e l'onSnapshot cambia vista su ogni dispositivo.
function Finished({ gameId, partita, giocatori }) {
  const { user } = useAuth()
  const hoVinto = partita.winnerUid === user.uid

  // A parità di livello decide la forza. La copia serve perché `sort`
  // ordinerebbe sul posto l'array dello snapshot.
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
        <p>Livello {LIVELLO_MAX} raggiunto. La partita è chiusa e non si riapre.</p>
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
                {g.isFighter && ' — combattente'}
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

      <Link to="/create">Crea una nuova partita</Link>
      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default Finished
