import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  writeBatch,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import { generaCodice } from './gameCode'

// Vincoli del personaggio, ripetuti nelle Security Rules.
// Qui servono a non mandare a Firestore una scrittura che verrebbe respinta.
export const LIVELLO_MIN = 1
export const LIVELLO_MAX = 10
export const LUNGHEZZA_NOME_MAX = 20

// Quante volte riprovare se il codice generato è già in uso.
const TENTATIVI_CODICE = 5

// Errore applicativo: stesso schema di Firebase, un `code` che il
// chiamante traduce in italiano. Così le pagine hanno un solo modo
// di gestire gli errori, quali che siano.
class ErroreGioco extends Error {
  constructor(code) {
    super(code)
    this.name = 'ErroreGioco'
    this.code = code
  }
}

export function messaggioErroreGioco(code) {
  switch (code) {
    case 'gioco/codice-inesistente':
      return 'Nessuna partita con questo codice'
    case 'gioco/gia-iniziata':
      return 'La partita è già iniziata'
    case 'gioco/gia-finita':
      return 'La partita è già finita'
    case 'gioco/codice-non-generato':
      return 'Non riesco a generare un codice partita. Riprova.'
    case 'permission-denied':
      return 'Operazione non permessa'
    case 'unavailable':
      return 'Nessuna connessione al database. Controlla la rete.'
    default:
      return 'Qualcosa è andato storto. Riprova.'
  }
}

// Il personaggio appena creato, host o ospite che sia: sempre uguale.
function nuovoGiocatore(nome) {
  return {
    name: nome,
    level: LIVELLO_MIN,
    isFighter: false,
    joinedAt: serverTimestamp(),
  }
}

// Genera un codice non ancora usato. Il codice È l'id del documento,
// quindi basta un getDoc per sapere se è libero: nessuna query, nessun indice.
async function codiceLibero() {
  for (let i = 0; i < TENTATIVI_CODICE; i++) {
    const codice = generaCodice()
    const istantanea = await getDoc(doc(db, 'games', codice))
    if (!istantanea.exists()) return codice
  }
  // Con 32^6 combinazioni non succede mai davvero, ma un ciclo
  // senza uscita è peggio di un errore visibile.
  throw new ErroreGioco('gioco/codice-non-generato')
}

/**
 * Crea la partita e il personaggio dell'host in una scrittura sola.
 * Restituisce il codice, che è anche l'id del documento.
 */
export async function creaPartita(uid, nome) {
  const codice = await codiceLibero()

  // writeBatch: o vanno a buon fine entrambe le scritture o nessuna.
  // Senza, un errore sulla seconda lascerebbe una partita senza giocatori.
  const batch = writeBatch(db)

  batch.set(doc(db, 'games', codice), {
    status: 'lobby',
    hostUid: uid,
    createdAt: serverTimestamp(),
    winnerUid: null,
    winnerName: null,
  })

  batch.set(doc(db, 'games', codice, 'players', uid), nuovoGiocatore(nome))

  await batch.commit()
  return codice
}

/**
 * Unisce l'utente a una partita esistente.
 * Chi è già dentro rientra senza che il personaggio venga azzerato.
 */
export async function unisciti(codice, uid, nome) {
  const partita = await getDoc(doc(db, 'games', codice))

  if (!partita.exists()) throw new ErroreGioco('gioco/codice-inesistente')

  const { status } = partita.data()
  if (status === 'playing') throw new ErroreGioco('gioco/gia-iniziata')
  if (status === 'finished') throw new ErroreGioco('gioco/gia-finita')

  // Rientro: se il personaggio esiste già non lo si sovrascrive,
  // altrimenti un refresh su /join riporterebbe il livello a 1.
  const riferimento = doc(db, 'games', codice, 'players', uid)
  const giocatore = await getDoc(riferimento)
  if (!giocatore.exists()) {
    await setDoc(riferimento, nuovoGiocatore(nome))
  }

  return codice
}

/**
 * L'host fa partire la partita. Le Security Rules lasciano passare
 * l'update solo se chi scrive è l'host: il controllo nel componente
 * serve a nascondere il bottone, non a difendere il dato.
 */
export async function iniziaPartita(gameId) {
  await updateDoc(doc(db, 'games', gameId), { status: 'playing' })
}
