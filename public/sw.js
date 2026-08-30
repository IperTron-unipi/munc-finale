// Service worker: serve solo a mostrare la notifica di vittoria.
// Niente cache, niente handler fetch.
// Su Chrome Android `new Notification()` non funziona: l'unica strada è
// `registration.showNotification()`, che esiste solo qui dentro.

// Il worker nuovo sostituisce subito il vecchio, senza aspettare
// la chiusura delle schede aperte.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (evento) => evento.waitUntil(self.clients.claim()))

// Toccare la notifica riporta alla partita.
self.addEventListener('notificationclick', (evento) => {
  evento.notification.close()

  const percorso = evento.notification.data?.percorso ?? '/'

  evento.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((finestre) => {
        // Se una scheda sulla partita è già aperta le si dà il fuoco,
        // invece di aprirne una seconda.
        const gia = finestre.find((f) => f.url.includes(percorso))
        if (gia) return gia.focus()
        return self.clients.openWindow(percorso)
      }),
  )
})
