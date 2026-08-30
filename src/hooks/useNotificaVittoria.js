import { useEffect, useRef } from 'react'
import { mostraNotifica } from '../lib/notifiche'

// Notifica il momento in cui la partita finisce, non lo stato `finished`:
// aprire il link di una partita chiusa ieri non deve notificare niente.
// Il vincitore è escluso, ha appena premuto lui il bottone.
export function useNotificaVittoria(gameId, partita, mioUid) {
  // Lo stato precedente serve a distinguere «è finita adesso» da «era già
  // finita». In un ref perché non disegna niente. gameId e status insieme:
  // cambiata partita, lo stato ricordato non vale più.
  const precedente = useRef({ gameId: null, status: null })

  const status = partita?.status ?? null
  const vincitoreUid = partita?.winnerUid ?? null
  const vincitoreNome = partita?.winnerName ?? null

  useEffect(() => {
    const ricordo = precedente.current
    precedente.current = { gameId, status }

    // Primo snapshot, o prima volta su questa partita: non è una transizione.
    if (ricordo.gameId !== gameId || ricordo.status === null) return

    // Passa solo il passaggio da "non finita" a "finita".
    if (ricordo.status === 'finished' || status !== 'finished') return

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
