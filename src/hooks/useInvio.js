import { useState } from 'react'
import { messaggioErroreGioco } from '../lib/games'

// Per le pagine che fanno una scrittura e poi cambiano schermata.
//
// () -> {
//   error:      string | null, il messaggio già tradotto per l'utente
//   setError:   (messaggio: string | null) => void, per gli errori di validazione
//   submitting: boolean, vero mentre la scrittura è in volo
//   invia:      (azione: () => Promise<void>) => Promise<void>
// }
//
// `submitting` non torna false quando va bene: a quel punto il componente è
// già smontato dalla navigazione.
export function useInvio() {
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  async function invia(azione) {
    setError(null)
    setSubmitting(true)
    try {
      await azione()
    } catch (err) {
      setError(messaggioErroreGioco(err.code))
      setSubmitting(false)
    }
  }

  return { error, setError, submitting, invia }
}
