import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useCombattimento } from '../hooks/useCombattimento'
import Errore from './Errore'
import Passo from './Passo'
import { messaggioErroreGioco } from '../lib/games'
import {
  aggiungiMostro,                    // fun che aggiunge un mostro
  apriCombattimento,                 // fun che apre lo scontro (scrive il documento)
  cambiaAiutante,                    // fun che fa entrare/uscire chi aiuta
  cambiaBonusMostro,                 // fun che somma un delta al bonus di un mostro
  cambiaModificatoreGiocatore,       // fun che somma un delta al modificatore di un giocatore
  cambiaSdoppiamento,                // fun che accende/spegne lo sdoppiamento di un mostro
  chiudiCombattimento,               // fun che cancella il documento dello scontro
  forzaGiocatore,                    // fun che calcola la forza di un giocatore col suo modificatore
  forzaGiocatori,                    // fun che somma la forza di tutti gli schierati
  forzaMostri,                       // fun che somma la forza di tutti i mostri
  forzaMostro,                       // fun che calcola la forza di un singolo mostro
  listaMostri,                       // fun che estrae i mostri dalla mappa e li ordina
  modificatoreGiocatore,             // fun che legge il modificatore di un giocatore
  schieramento,                      // fun che estrae sfidante e aiutante come giocatori
  togliMostro,                       // fun che elimina un mostro
  vincono,                           // fun che decide chi vince a parità o meno
  LUNGHEZZA_NOME_MOSTRO_MAX,         // costante, tetto di caratteri per il nome del mostro
  MODIFICATORE_MAX,                  // costante, tetto del modificatore giocatore/mostro
  MODIFICATORE_MIN,                  // costante, minimo del modificatore giocatore/mostro
  MOSTRI_MAX,                        // costante, numero massimo di mostri in campo
  MOSTRO_LIVELLO_MAX,                // costante, livello massimo assegnabile a un mostro
  MOSTRO_LIVELLO_MIN,                // costante, livello minimo assegnabile a un mostro
} from '../lib/combat'

// (valore: number) -> string. Il segno va scritto sempre: un modificatore è
// un bonus o un malus, e al tavolo si legge di sfuggita.
function conSegno(valore) {
  if (valore > 0) return `+${valore}`
  if (valore < 0) return `−${Math.abs(valore)}`
  return '0'
}

// Il pannello dello scontro in corso: schierati, mostri e verdetto.
//
// Props
//   gameId    string
//   hostUid   string     l'host può chiudere lo scontro anche se non l'ha aperto
//   giocatori giocatore[] tutti quelli in partita, non solo gli schierati
//
// Lo stato vero sta su Firestore e arriva da useCombattimento: qui restano
// solo i campi del modulo "aggiungi mostro" e l'errore dell'ultima scrittura.
function Combattimento({ gameId, hostUid, giocatori }) {
  const { user } = useAuth()
  const { combattimento, error: erroreListener } = useCombattimento(gameId)
  const [error, setError] = useState(null)
  const [nomeMostro, setNomeMostro] = useState('')

  // Il livello si sceglie prima che il mostro entri: è un campo del modulo.
  const [livelloMostro, setLivelloMostro] = useState(MOSTRO_LIVELLO_MIN)

  // (promessa: Promise) -> void. Nessuno stato di invio: Firestore aggiorna
  // prima la copia locale, e se la scrittura viene rifiutata lo snapshot
  // torna indietro da solo.
  function esegui(promessa) {
    setError(null)
    promessa.catch((err) => setError(messaggioErroreGioco(err.code)))
  }

  const messaggio =
    error ?? (erroreListener && messaggioErroreGioco(erroreListener))

  if (!combattimento) {
    return (
      <div className="combattimento chiuso">
        <h2>Combattimento</h2>
        <p className="nota">
          Chi pesca la porta apre lo scontro. Un altro giocatore può entrare in
          aiuto.
        </p>
        <Errore messaggio={messaggio} />
        <button
          type="button"
          onClick={() => esegui(apriCombattimento(gameId, user.uid))}
        >
          Apri un combattimento
        </button>
      </div>
    )
  }

  const schierati = schieramento(combattimento, giocatori)
  const mostri = listaMostri(combattimento)
  const forzaNostra = forzaGiocatori(combattimento, giocatori)
  const forzaLoro = forzaMostri(combattimento)
  const conCombattente = schierati.some((g) => g.isFighter)
  const vinciamo = vincono(forzaNostra, forzaLoro, conCombattente)

  const sonoSfidante = combattimento.sfidanteUid === user.uid
  const sonoAiutante = combattimento.aiutanteUid === user.uid
  const postoLibero = !combattimento.aiutanteUid

  // Quale comando mostrare: 'entra' | 'ritirati' | 'togli' | 'occupato' |
  // null (chi ha aperto e non ha ancora nessuno accanto). I casi si escludono,
  // quindi si sceglie qui invece di ripetere le tre bandiere nel markup.
  let aiuto = 'occupato'
  if (postoLibero) aiuto = sonoSfidante ? null : 'entra'
  else if (sonoAiutante) aiuto = 'ritirati'
  else if (sonoSfidante) aiuto = 'togli'

  function aggiungi(event) {
    event.preventDefault()
    if (mostri.length >= MOSTRI_MAX) return
    esegui(aggiungiMostro(gameId, nomeMostro, livelloMostro))
    setNomeMostro('')
    setLivelloMostro(MOSTRO_LIVELLO_MIN)
  }

  return (
    <div className="combattimento">
      <h2>Combattimento</h2>

      <Errore messaggio={messaggio} />

      {mostri.length === 0 ? (
        <p className="stato">
          Aggiungi il mostro che avete pescato: senza, non c&apos;è niente da
          battere.
        </p>
      ) : (
        <p
          className={vinciamo ? 'verdetto vinto' : 'verdetto perso'}
          aria-live="polite"
        >
          <strong>{forzaNostra}</strong> contro <strong>{forzaLoro}</strong>
          <em>{vinciamo ? 'vincete' : 'perdete'}</em>
        </p>
      )}

      <div className="lato">
        <h3>In campo</h3>

        {schierati.length === 0 ? (
          <p className="stato">Nessuno in campo.</p>
        ) : (
          <ul className="schierati">
            {schierati.map((g) => {
              const modificatore = modificatoreGiocatore(combattimento, g.uid)

              return (
                <li key={g.uid}>
                  <span className="nome">
                    {g.name}
                    {g.uid === combattimento.aiutanteUid && ' — in aiuto'}
                    {g.isFighter && ' — combattente'}
                  </span>

                  {/* La forza di partenza è già nel tabellone qui sotto: in
                      riga stanno il modificatore e quello che ne resta. */}
                  <span className="statistiche">
                    <span className="valore bonus">
                      <span className="etichetta">Bonus</span>
                      <strong>{conSegno(modificatore)}</strong>
                    </span>
                    <span className="valore forza">
                      <span className="etichetta">Forza</span>
                      <strong>{forzaGiocatore(g, modificatore)}</strong>
                    </span>
                  </span>

                  <span className="comandi">
                    <Passo
                      etichetta="Bonus"
                      valore={modificatore}
                      min={MODIFICATORE_MIN}
                      max={MODIFICATORE_MAX}
                      onCambia={(delta) =>
                        esegui(cambiaModificatoreGiocatore(gameId, g.uid, delta))
                      }
                    />
                  </span>
                </li>
              )
            })}
          </ul>
        )}

        {conCombattente && (
          <p className="somma">
            Combattente in campo: non porta punti, ma a parità di forza il
            mostro lo battete lo stesso.
          </p>
        )}

        {aiuto && (
          <p className="azioni">
            {aiuto === 'entra' ? (
              <button
                type="button"
                onClick={() => esegui(cambiaAiutante(gameId, user.uid))}
              >
                Scendo in aiuto
              </button>
            ) : aiuto === 'occupato' ? (
              <span className="stato">
                Il posto di chi aiuta è occupato: si combatte al massimo in due.
              </span>
            ) : (
              <button
                type="button"
                className="link"
                onClick={() =>
                  esegui(
                    cambiaAiutante(gameId, null, combattimento.aiutanteUid),
                  )
                }
              >
                {aiuto === 'ritirati' ? 'Mi ritiro' : 'Togli chi aiuta'}
              </button>
            )}
          </p>
        )}
      </div>

      <div className="lato">
        <h3>Mostri</h3>

        <ul className="mostri">
          {mostri.map((mostro) => {
            const bonus = mostro.bonus ?? 0

            return (
              <li key={mostro.id}>
                <span className="nome">
                  {mostro.nome}
                  {mostro.doppio && ' — sdoppiato'}
                </span>

                {/* Le tre colonne del tabellone. Il "+" fra livello e bonus
                    qui è tolto in CSS: il segno sta già nel numero. */}
                <span className="statistiche">
                  <span className="valore">
                    <span className="etichetta">Livello</span>
                    <strong>{mostro.livello}</strong>
                  </span>
                  <span className="valore bonus">
                    <span className="etichetta">Bonus</span>
                    <strong>{conSegno(bonus)}</strong>
                  </span>
                  <span className="valore forza">
                    <span className="etichetta">Forza</span>
                    <strong>{forzaMostro(mostro)}</strong>
                  </span>
                </span>

                <span className="comandi">
                  <Passo
                    etichetta="Bonus"
                    valore={bonus}
                    min={MODIFICATORE_MIN}
                    max={MODIFICATORE_MAX}
                    onCambia={(delta) =>
                      esegui(cambiaBonusMostro(gameId, mostro.id, delta))
                    }
                  />

                  <label htmlFor={`doppio-${mostro.id}`}>
                    <input
                      id={`doppio-${mostro.id}`}
                      type="checkbox"
                      checked={Boolean(mostro.doppio)}
                      onChange={(e) =>
                        esegui(
                          cambiaSdoppiamento(gameId, mostro.id, e.target.checked),
                        )
                      }
                    />{' '}
                    Sdoppiato
                  </label>

                  <button
                    type="button"
                    className="link"
                    onClick={() => esegui(togliMostro(gameId, mostro.id))}
                  >
                    Togli
                  </button>
                </span>
              </li>
            )
          })}
        </ul>

        <form className="aggiungi" onSubmit={aggiungi}>
          <input
            type="text"
            value={nomeMostro}
            onChange={(e) => setNomeMostro(e.target.value)}
            maxLength={LUNGHEZZA_NOME_MOSTRO_MAX}
            placeholder="Nome del mostro"
            aria-label="Nome del mostro"
          />
          <span className="comandi">
            <Passo
              etichetta="Livello"
              valore={livelloMostro}
              min={MOSTRO_LIVELLO_MIN}
              max={MOSTRO_LIVELLO_MAX}
              onCambia={(delta) => setLivelloMostro((l) => l + delta)}
            >
              <strong>{livelloMostro}</strong>
            </Passo>
          </span>
          <button type="submit" disabled={mostri.length >= MOSTRI_MAX}>
            Aggiungi
          </button>
        </form>

        {mostri.length >= MOSTRI_MAX && (
          <p className="stato">Più di {MOSTRI_MAX} mostri non ci stanno.</p>
        )}
      </div>

      {sonoSfidante || hostUid === user.uid ? (
        <button
          type="button"
          className="chiudi"
          onClick={() => esegui(chiudiCombattimento(gameId))}
        >
          Chiudi il combattimento
        </button>
      ) : (
        <p className="stato">
          Chiude chi ha aperto lo scontro, oppure l&apos;host.
        </p>
      )}

      <p className="nota">
        Il livello del mostro si sceglie prima che entri e poi non si tocca: se
        sbagli, puoi eliminarlo e aggiungerlo di nuovo. Nessuno scende sotto
        forza 1, per quanto grosso sia il malus.
      </p>
    </div>
  )
}

export default Combattimento
