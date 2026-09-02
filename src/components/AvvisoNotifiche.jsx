import { useState } from 'react'
import { chiediPermessoNotifiche, permessoNotifiche } from '../lib/notifiche'

// Il bottone che chiede il permesso di notificare. Nessuna prop: legge da sé
// il permesso ('granted' | 'denied' | 'default' | 'unsupported') e rende una
// riga diversa per ciascuno. Compare all'ingresso in partita e non all'avvio:
// chiesto troppo presto lo negano tutti, e `denied` non si può ritirare.
function AvvisoNotifiche() {
  const [permesso, setPermesso] = useState(permessoNotifiche)

  // Il permesso si chiede da un click: Firefox e Safari ignorano
  // `requestPermission()` fuori da un gesto dell'utente.
  async function chiedi() {
    setPermesso(await chiediPermessoNotifiche())
  }

  // Niente da dire a chi ha già dato il permesso o non ha l'API.
  if (permesso === 'granted' || permesso === 'unsupported') return null

  // `denied` si mostra solo a chi ha appena negato: al ricaricamento
  // sparisce, tanto il prompt non ricompare.
  if (permesso === 'denied') {
    return (
      <p className="avviso">
        Notifiche bloccate. La partita si aggiorna lo stesso a schermo: la
        notifica serve solo se hai il telefono in tasca.
      </p>
    )
  }

  return (
    <p className="avviso">
      Vuoi essere avvisato quando qualcuno vince, anche con l'app in secondo
      piano?{' '}
      <button type="button" className="link" onClick={chiedi}>
        Attiva le notifiche
      </button>
    </p>
  )
}

export default AvvisoNotifiche
