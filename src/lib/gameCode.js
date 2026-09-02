// Il codice partita: 6 caratteri, è anche l'id del documento su Firestore.
// Alfabeto senza I, O, 0 e 1: il codice va letto ad alta voce al tavolo e
// ribattuto a mano su un telefono.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const LUNGHEZZA_CODICE = 6

// () -> string di LUNGHEZZA_CODICE caratteri.
export function generaCodice() {
  let codice = ''
  for (let i = 0; i < LUNGHEZZA_CODICE; i++) {
    codice += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return codice
}

// (testo: string) -> string. Quello che l'utente digita in /join: maiuscolo,
// senza spazi e senza i caratteri fuori dall'alfabeto.
export function normalizzaCodice(testo) {
  return [...testo.toUpperCase()].filter((c) => ALFABETO.includes(c)).join('')
}

export function codiceValido(codice) {
  return codice.length === LUNGHEZZA_CODICE
}
