// Alfabeto senza caratteri ambigui: via I, O, 0, 1.
// Il codice va letto ad alta voce al tavolo e ribattuto a mano su un telefono.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const LUNGHEZZA = 6

export function generaCodice() {
  let codice = ''
  for (let i = 0; i < LUNGHEZZA; i++) {
    codice += ALFABETO[Math.floor(Math.random() * ALFABETO.length)]
  }
  return codice
}

// Quello che l'utente digita in /join: maiuscolo, senza spazi,
// e senza i caratteri che non fanno parte dell'alfabeto.
export function normalizzaCodice(testo) {
  return testo
    .toUpperCase()
    .split('')
    .filter((c) => ALFABETO.includes(c))
    .join('')
}

export function codiceValido(codice) {
  return codice.length === LUNGHEZZA
}

export const LUNGHEZZA_CODICE = LUNGHEZZA
