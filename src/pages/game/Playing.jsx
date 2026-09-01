import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import {
  cambiaBonus,
  cambiaCombattente,
  cambiaLivello,
  dichiaraVittoria,
  messaggioErroreGioco,
  totale,
  BONUS_MAX,
  BONUS_MIN,
  LIVELLO_MAX,
  LIVELLO_MIN,
} from '../../lib/games'

function Playing({ gameId, partita, giocatori }) {
  const { user } = useAuth()
  const [error, setError] = useState(null)

  // Solo il secondo passo della conferma è uno stato: il primo si deduce
  // dal livello, così un refresh a 10 ritrova la domanda.
  const [secondaConferma, setSecondaConferma] = useState(false)

  // C'è di sicuro: Game.jsx non monta questa vista se non sei fra i giocatori.
  const io = giocatori.find((g) => g.uid === user.uid)
  const mioLivello = io.level
  const mioBonus = io.bonus ?? BONUS_MIN

  // Nessun `submitting`: Firestore aggiorna prima la copia locale, quindi
  // il numero cambia al tocco. Se la scrittura fallisce lo snapshot torna
  // indietro da solo, e qui resta da mostrare il perché.
  function mostraErrore(err) {
    setError(messaggioErroreGioco(err.code))
  }

  function modificaLivello(delta) {
    const nuovo = mioLivello + delta
    if (nuovo < LIVELLO_MIN || nuovo > LIVELLO_MAX) return
    setError(null)
    cambiaLivello(gameId, user.uid, nuovo).catch(mostraErrore)
  }

  function modificaBonus(delta) {
    const nuovo = mioBonus + delta
    if (nuovo < BONUS_MIN || nuovo > BONUS_MAX) return
    setError(null)
    cambiaBonus(gameId, user.uid, nuovo).catch(mostraErrore)
  }

  function modificaCombattente(event) {
    setError(null)
    cambiaCombattente(gameId, user.uid, event.target.checked).catch(mostraErrore)
  }

  function confermaVittoria() {
    setError(null)
    dichiaraVittoria(gameId, user.uid, io.name).catch(mostraErrore)
  }

  // Un "no" riporta il livello a 9: a 10 la domanda ricomparirebbe subito.
  function rifiutaVittoria() {
    setSecondaConferma(false)
    modificaLivello(-1)
  }

  return (
    <section className="colonna">
      <h1>Partita in corso</h1>
      <p className="stato">
        Codice <strong>{gameId}</strong> — si vince a livello {LIVELLO_MAX}.
      </p>

      {error && (
        <p className="errore" role="alert">
          {error}
        </p>
      )}

      {/* La domanda compare e sparisce col livello, non con un click. */}
      {mioLivello === LIVELLO_MAX && (
        <div className="conferma">
          {secondaConferma ? (
            <>
              <p>
                <strong>Chiudi la partita per tutti.</strong> La classifica si
                blocca e non si torna indietro.
              </p>
              <button type="button" onClick={confermaVittoria}>
                Chiudi, ho vinto
              </button>
              <button type="button" onClick={rifiutaVittoria}>
                Annulla, torno a {LIVELLO_MAX - 1}
              </button>
            </>
          ) : (
            <>
              <p>
                Sei a livello <strong>{LIVELLO_MAX}</strong>, il massimo. Hai
                vinto la partita?
              </p>
              <button type="button" onClick={() => setSecondaConferma(true)}>
                Ho vinto
              </button>
              <button type="button" onClick={rifiutaVittoria}>
                Non ancora, torno a {LIVELLO_MAX - 1}
              </button>
            </>
          )}
        </div>
      )}

      {/* Ordine d'ingresso, come in lobby: ordinare per livello farebbe
          saltare le righe sotto il dito mentre si preme il +. */}
      <ul className="tabellone">
        {giocatori.map((g) => {
          const sonoIo = g.uid === user.uid
          const bonus = g.bonus ?? BONUS_MIN

          return (
            // --livello disegna in CSS la scala dei dieci livelli sotto la riga.
            <li
              key={g.uid}
              className={sonoIo ? 'giocatore mio' : 'giocatore'}
              style={{ '--livello': g.level }}
            >
              <span className="nome">
                {g.name}
                {g.uid === partita.hostUid && ' — host'}
                {sonoIo && ' — tu'}
                {g.isFighter && ' — combattente'}
              </span>

              {/* Livello e forza pesano uguale: il primo fa vincere la
                  partita, la seconda i combattimenti. Il bonus si legge, ma
                  è solo l'addendo che porta dall'uno all'altra. */}
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

              {sonoIo && (
                <span className="comandi">
                  <span className="gruppo">
                    <span className="etichetta">Livello</span>
                    <button
                      type="button"
                      onClick={() => modificaLivello(-1)}
                      disabled={mioLivello <= LIVELLO_MIN}
                      aria-label="Scendi di un livello"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => modificaLivello(+1)}
                      disabled={mioLivello >= LIVELLO_MAX}
                      aria-label="Sali di un livello"
                    >
                      +
                    </button>
                  </span>

                  <span className="gruppo">
                    <span className="etichetta">Bonus</span>
                    <button
                      type="button"
                      onClick={() => modificaBonus(-1)}
                      disabled={mioBonus <= BONUS_MIN}
                      aria-label="Togli un bonus"
                    >
                      −
                    </button>
                    <button
                      type="button"
                      onClick={() => modificaBonus(+1)}
                      disabled={mioBonus >= BONUS_MAX}
                      aria-label="Aggiungi un bonus"
                    >
                      +
                    </button>
                  </span>

                  <label htmlFor="combattente">
                    <input
                      id="combattente"
                      type="checkbox"
                      checked={g.isFighter}
                      onChange={modificaCombattente}
                    />{' '}
                    Combattente
                  </label>
                </span>
              )}
            </li>
          )
        })}
      </ul>

      <h2>Come si legge</h2>
      <p className="nota">
        Il livello fa vincere la partita: si arriva a {LIVELLO_MAX}. Il bonus
        viene dagli oggetti e non fa salire di livello. Livello più bonus
        danno la forza, che serve a battere i mostri. Combattente vale +1 in
        combattimento e vince i pareggi: l'app lo segna, i conti li fate al
        tavolo.
      </p>
    </section>
  )
}

export default Playing
