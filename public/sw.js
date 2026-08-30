// Service worker unico: notifica di vittoria e cache.
// Due worker sullo stesso scope non convivono, il secondo sostituisce il primo.

// Cambiare la versione butta via la cache vecchia (vedi `activate`).
// Va fatto a ogni modifica di un file del GUSCIO: quelli non hanno l'hash nel nome.
const CACHE = 'munchkin-v2'

// I file dal nome stabile. Quelli generati da Vite cambiano nome a ogni build,
// quindi non si possono elencare qui: li prende la cache a runtime.
const GUSCIO = [
  '/regolamento.html',
  '/manifest.webmanifest',
  '/icons/favicon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-icon-180.png',
]

// Il worker nuovo sostituisce subito il vecchio, senza aspettare
// la chiusura delle schede aperte.
self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(GUSCIO))
      // `addAll` fallisce tutto se manca un file solo
      // in modo da non lasciare la cache a metà
      .catch(() => {})
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomi) =>
        Promise.all(nomi.filter((n) => n !== CACHE).map((n) => caches.delete(n))),
      )
      .then(() => self.clients.claim()),
  )
})

function eStatico(percorso) {
  return (
    percorso.startsWith('/assets/') ||
    percorso.startsWith('/icons/') ||
    percorso === '/manifest.webmanifest'
  )
}

self.addEventListener('fetch', (evento) => {
  const richiesta = evento.request

  if (richiesta.method !== 'GET') return

  const url = new URL(richiesta.url)

  // Firestore e Authentication hanno già la loro gestione dell'assenza di rete.
  if (url.origin !== self.location.origin) return

  // Apertura di pagina: prima la rete. Servire l'app dalla cache senza
  // linea darebbe un "Caricamento…" infinito, perché ogni dato è su Firestore.
  if (richiesta.mode === 'navigate') {
    evento.respondWith(
      fetch(richiesta).catch(() => caches.match('/regolamento.html')),
    )
    return
  }

  // Asset: prima la cache, che non può essere stantia perché il nome
  // contiene l'hash del contenuto.
  if (eStatico(url.pathname)) {
    evento.respondWith(
      caches.match(richiesta).then((salvata) => {
        if (salvata) return salvata

        return fetch(richiesta).then((risposta) => {
          // Un 404 messo in cache resterebbe un 404 per sempre.
          if (risposta.ok) {
            const copia = risposta.clone() // il corpo si legge una volta sola
            caches.open(CACHE).then((cache) => cache.put(richiesta, copia))
          }
          return risposta
        })
      }),
    )
  }
})

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
