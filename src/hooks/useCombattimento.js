import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'
import { riferimentoCombattimento } from '../lib/combat'

// Il terzo listener realtime della partita, montato solo mentre si gioca.
//
// (gameId: string) -> {
//   combattimento: null quando non ce n'è uno aperto, altrimenti i campi
//                  del documento (vedi lib/combat.js)
//   error:         string | null, il `code` Firebase dell'ultimo errore
// }
export function useCombattimento(gameId) {
  const [combattimento, setCombattimento] = useState(null)
  const [error, setError] = useState(null)
  const [partitaPrecedente, setPartitaPrecedente] = useState(gameId)

  // Stesso azzeramento in render di usePartita, per non mostrare un istante
  // il combattimento della partita precedente.
  if (partitaPrecedente !== gameId) {
    setPartitaPrecedente(gameId)
    setCombattimento(null)
    setError(null)
  }

  useEffect(() => {
    return onSnapshot(
      riferimentoCombattimento(gameId),
      (istantanea) =>
        setCombattimento(istantanea.exists() ? istantanea.data() : null),
      (err) => setError(err.code),
    )
  }, [gameId])

  return { combattimento, error }
}
