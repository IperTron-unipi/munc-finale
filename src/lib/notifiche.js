// Notifiche locali, non push: il piano gratuito di Firebase non ha Cloud
// Functions. Ogni giocatore ha già il listener sulla partita, quindi vede
// da sé il passaggio a `finished` e si mostra la notifica da solo.
// Limite: arriva solo con l'app aperta o in secondo piano, non ad app chiusa.
//
// Il resto del codice non tocca mai `Notification` o `navigator`: i casi
// che cambiano da browser a browser stanno tutti qui.

const PERCORSO_WORKER = '/sw.js'

// Servono entrambe: `Notification` per il permesso, `serviceWorker` per
// mostrarla su Android. Su Safari iOS senza PWA installata è falso.
export const NOTIFICHE_SUPPORTATE =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator

// Come `Notification.permission`, più `unsupported` quando l'API non c'è:
// chi chiama legge un valore solo.
export function permessoNotifiche() {
  return NOTIFICHE_SUPPORTATE ? Notification.permission : 'unsupported'
}

// Registra il worker all'avvio dell'app. Non chiede nessun permesso.
export function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return
  // Se la registrazione fallisce l'app continua senza notifiche.
  navigator.serviceWorker.register(PERCORSO_WORKER).catch(() => {})
}

// Chiede il permesso, una volta sola. Va chiamata da un gesto dell'utente:
// Firefox e Safari ignorano la richiesta automatica.
export async function chiediPermessoNotifiche() {
  if (!NOTIFICHE_SUPPORTATE) return 'unsupported'
  // `granted` e `denied` sono definitivi: il prompt non ricompare.
  if (Notification.permission !== 'default') return Notification.permission
  return await Notification.requestPermission()
}

// Mostra una notifica. Restituisce true se è comparsa davvero, e non
// lancia mai: una notifica persa non deve rompere la schermata di vittoria.
export async function mostraNotifica(titolo, opzioni = {}) {
  if (permessoNotifiche() !== 'granted') return false

  try {
    // getRegistration() risponde subito; `serviceWorker.ready` resterebbe
    // appesa per sempre se nessun worker è registrato.
    const registrazione = await navigator.serviceWorker.getRegistration()

    // Prima strada: il worker, l'unica che funzioni su Android.
    if (registrazione?.active) {
      await registrazione.showNotification(titolo, opzioni)
      return true
    }

    // Ripiego, per i primi istanti in cui il worker non è ancora attivo.
    new Notification(titolo, opzioni)
    return true
  } catch {
    return false
  }
}
