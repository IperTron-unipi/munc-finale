import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

// I due listener realtime di una partita: il documento game e la
// sottocollezione players. Restituisce { partita, giocatori, loading, error }.
//
// `partita` ha tre valori: undefined finché il primo snapshot non arriva,
// null se il documento non esiste, altrimenti i campi della partita.
export function usePartita(gameId) {
  const [partita, setPartita] = useState(undefined)
  const [giocatori, setGiocatori] = useState(undefined)
  const [error, setError] = useState(null)
  const [partitaPrecedente, setPartitaPrecedente] = useState(gameId)

  // Cambiata partita, si riparte da zero: senza, si vedrebbero per un
  // istante i dati della precedente. Il reset durante il render, e non in
  // un effetto, evita un render coi dati vecchi già a schermo.
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

    // In StrictMode l'effetto parte due volte: senza cleanup resterebbero
    // quattro listener aperti, cioè letture doppie a ogni modifica.
    return () => {
      stopPartita()
      stopGiocatori()
    }
  }, [gameId])

  const loading = partita === undefined || giocatori === undefined

  return { partita, giocatori, loading, error }
}
