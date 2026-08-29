import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

/**
 * I due listener realtime di una partita: il documento game e la
 * sottocollezione players. Sono i soli della Fase 3, e bastano.
 *
 * Restituisce { partita, giocatori, loading, error }.
 *
 * `partita` ha tre valori, non due — stesso schema di AuthProvider:
 *   undefined  il primo snapshot non è ancora arrivato, non si sa niente
 *   null       il documento non esiste: codice sbagliato o partita cancellata
 *   oggetto    la partita, con i suoi campi
 *
 * `loading` è derivato, non è uno stato a sé: così non può
 * desincronizzarsi dai dati che dovrebbe descrivere.
 */
export function usePartita(gameId) {
  const [partita, setPartita] = useState(undefined)
  const [giocatori, setGiocatori] = useState(undefined)
  const [error, setError] = useState(null)
  const [partitaPrecedente, setPartitaPrecedente] = useState(gameId)

  // Se gameId cambia si riparte da zero, altrimenti si vedrebbero per un
  // istante i dati della partita precedente. Il reset sta qui e non
  // nell'effetto: React prevede lo setState durante il render proprio per
  // questo caso, e riesegue subito senza toccare il DOM. Fatto dentro
  // useEffect sarebbe un render in più, con i dati vecchi già a schermo.
  if (partitaPrecedente !== gameId) {
    setPartitaPrecedente(gameId)
    setPartita(undefined)
    setGiocatori(undefined)
    setError(null)
  }

  useEffect(() => {
    const riferimentoPartita = doc(db, 'games', gameId)
    const richiestaGiocatori = query(
      collection(db, 'games', gameId, 'players'),
      orderBy('joinedAt'),
    )

    const stopPartita = onSnapshot(
      riferimentoPartita,
      (istantanea) => {
        // exists() distingue "non c'è" da "non è ancora arrivato".
        setPartita(istantanea.exists() ? istantanea.data() : null)
      },
      (err) => setError(err.code),
    )

    const stopGiocatori = onSnapshot(
      richiestaGiocatori,
      (istantanea) => {
        setGiocatori(
          istantanea.docs.map((d) => ({ uid: d.id, ...d.data() })),
        )
      },
      (err) => setError(err.code),
    )

    // Il cleanup vale doppio qui: in StrictMode l'effetto parte due volte
    // e senza queste due chiamate resterebbero quattro listener aperti,
    // cioè letture pagate due volte e render doppi a ogni modifica.
    return () => {
      stopPartita()
      stopGiocatori()
    }
  }, [gameId])

  const loading = partita === undefined || giocatori === undefined

  return { partita, giocatori, loading, error }
}
