import { useEffect, useRef } from 'react'
import { mostraNotifica } from '../lib/notifiche'

// Notifica il momento in cui la partita finisce (quando passa da "playing" a "finished"), non lo stato `finished`
// Il vincitore è escluso, ha appena premuto lui il bottone.
export function useNotificaVittoria(gameId, partita, mioUid) {
  // Lo stato precedente serve a distinguere «è finita adesso» da «era già finita».
  // useRef mantiene il valore tra i render senza causare un render aggiuntivo.
  const precedente = useRef({ gameId: null, status: null })

  const status = partita?.status ?? null
  const vincitoreUid = partita?.winnerUid ?? null
  const vincitoreNome = partita?.winnerName ?? null

  useEffect(() => {
    const ricordo = precedente.current
    precedente.current = { gameId, status }

    // Primo snapshot, o prima volta su questa partita
    if (ricordo.gameId !== gameId || ricordo.status === null) return

    // Era già finita, o non è finita 
    if (ricordo.status === 'finished' || status !== 'finished') return

    // Il vincitore non riceve la notifica
    if (vincitoreUid === mioUid) return

    mostraNotifica('Partita finita', {
      body: vincitoreNome
        ? `${vincitoreNome} è arrivato a livello 10 e ha vinto.`
        : 'Qualcuno è arrivato a livello 10 e ha vinto.',
      tag: `vittoria-${gameId}`, // due snapshot ravvicinati, una notifica sola
      data: { percorso: `/game/${gameId}` },
    })
  }, [gameId, status, vincitoreUid, vincitoreNome, mioUid])
}
