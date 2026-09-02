import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query } from 'firebase/firestore'
import { db } from '../lib/firebase'

// I due listener realtime di una partita: il documento game e la
// sottocollezione players.
//
// (gameId: string) -> {
//   partita:   undefined finché il primo snapshot non arriva,
//              null se il documento non esiste, altrimenti i campi (vedi lib/games.js)
//   giocatori: undefined finché non arriva, poi giocatore[] con `uid`, in ordine d'ingresso
//   loading:   boolean, vero finché manca uno dei due
//   error:     string | null, il `code` Firebase dell'ultimo errore
// }
export function usePartita(gameId) {
  const [partita, setPartita] = useState(undefined)
  const [giocatori, setGiocatori] = useState(undefined)
  const [error, setError] = useState(null)
  const [partitaPrecedente, setPartitaPrecedente] = useState(gameId)

  // Azzeramento durante il render e non in un useEffect: cambiando partita
  // evita il render coi dati della precedente già a schermo.
  if (partitaPrecedente !== gameId) {
    setPartitaPrecedente(gameId)
    setPartita(undefined)
    setGiocatori(undefined)
    setError(null)
  }

  useEffect(() => {
    const stopPartita = onSnapshot(
      doc(db, 'games', gameId),
      // exists() distingue "non c'è" da "non è ancora arrivato".
      (istantanea) => setPartita(istantanea.exists() ? istantanea.data() : null),
      (err) => setError(err.code),
    )

    const stopGiocatori = onSnapshot(
      query(collection(db, 'games', gameId, 'players'), orderBy('joinedAt')),
      (istantanea) =>
        setGiocatori(istantanea.docs.map((d) => ({ uid: d.id, ...d.data() }))),
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
