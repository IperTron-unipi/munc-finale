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

// Scritture su Firestore per partita e personaggi.
//
// Tipi
//   gameId    string   codice di 6 caratteri, è anche l'id del documento
//   uid       string   id dell'utente Firebase Auth
//   partita   { status: 'lobby' | 'playing' | 'finished', hostUid: string,
//               createdAt: Timestamp, winnerUid: string | null,
//               winnerName: string | null }
//   giocatore { name: string, level: number, bonus: number,
//               isFighter: boolean, joinedAt: Timestamp }
//             documento in games/{gameId}/players/{uid}

// Vincoli ripetuti nelle Security Rules: qui evitano una scrittura respinta.
// Livello e bonus sono indipendenti, e si vince col livello a 10.
export const LIVELLO_MIN = 1
export const LIVELLO_MAX = 10
export const BONUS_MIN = 0
// Non è una regola di Munchkin: senza un tetto si potrebbe scrivere `bonus: 999999`.
export const BONUS_MAX = 50
export const LUNGHEZZA_NOME_MAX = 20


// (giocatore) -> number — la forza in combattimento, non decide la vittoria.
// Il `?? BONUS_MIN` copre i personaggi creati prima del bonus.
export function totale(giocatore) {
  return giocatore.level + (giocatore.bonus ?? BONUS_MIN)
}

// Quante volte riprovare se il codice generato è già in uso.
const TENTATIVI_CODICE = 5

// Errore applicativo con un `code` come quelli di Firebase: le pagine
// gestiscono i due casi allo stesso modo.
class ErroreGioco extends Error {
  constructor(code) {
    super(code)
    this.name = 'ErroreGioco'
    this.code = code
  }
}

// { [code: string]: string }. __proto__: null tiene fuori i membri di
// Object.prototype: un code storto non può pescare `toString` al posto di una frase.
const MESSAGGI = {
  __proto__: null,
  'gioco/codice-inesistente':
    'Nessuna partita con questo codice. Fattelo ridettare da chi ha creato la partita.',
  'gioco/gia-iniziata': 'La partita è già iniziata: non ci si può più unire.',
  'gioco/gia-finita': 'La partita è già finita. Creane una nuova per rigiocare.',
  'gioco/codice-non-generato': 'Non riesco a generare un codice partita. Riprova.',
  'permission-denied':
    'Questa operazione non ti è permessa. Prova a ricaricare la pagina.',
  'unavailable': 'Nessuna connessione. Controlla la rete e riprova.',
}

// (code: string) -> string. Il fallback copre i code non previsti.
export function messaggioErroreGioco(code) {
  return MESSAGGI[code] ?? 'Qualcosa è andato storto. Riprova.'
}

// (nome: string) -> giocatore. Host e ospite partono uguali.
function nuovoGiocatore(nome) {
  return {
    name: nome,
    level: LIVELLO_MIN,
    bonus: BONUS_MIN,
    isFighter: false,
    joinedAt: serverTimestamp(),
  }
}

// () -> Promise<gameId>. Il codice È l'id del documento, quindi basta un
// getDoc per sapere se è libero: nessuna query, nessun indice.
async function codiceLibero() {
  for (let i = 0; i < TENTATIVI_CODICE; i++) {
    const codice = generaCodice()
    const istantanea = await getDoc(doc(db, 'games', codice))
    if (!istantanea.exists()) return codice
  }
  // Con 32^6 combinazioni non capita, ma meglio un errore di un ciclo infinito.
  throw new ErroreGioco('gioco/codice-non-generato')
}

// (uid, nome) -> Promise<gameId>. Crea partita e personaggio dell'host insieme.
export async function creaPartita(uid, nome) {
  const codice = await codiceLibero()

  // writeBatch: o passano entrambe le scritture o nessuna. Senza, un errore
  // sulla seconda lascerebbe una partita senza giocatori.
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

// (gameId, uid, nome) -> Promise<gameId>. Lancia ErroreGioco se non si può entrare.
export async function unisciti(codice, uid, nome) {
  const partita = await getDoc(doc(db, 'games', codice))

  if (!partita.exists()) throw new ErroreGioco('gioco/codice-inesistente')

  // Rientro: se il personaggio esiste già lo status non conta, altrimenti
  // un refresh su /join riporterebbe il livello a 1.
  const riferimento = doc(db, 'games', codice, 'players', uid)
  const giocatore = await getDoc(riferimento)

  if (!giocatore.exists()) {
    const { status } = partita.data()
    if (status === 'playing') throw new ErroreGioco('gioco/gia-iniziata')
    if (status === 'finished') throw new ErroreGioco('gioco/gia-finita')

    await setDoc(riferimento, nuovoGiocatore(nome))
  }

  return codice
}

// (gameId) -> Promise<void>. A difendere il dato sono le Security Rules:
// il controllo nel componente serve solo a nascondere il bottone.
export async function iniziaPartita(gameId) {
  await updateDoc(doc(db, 'games', gameId), { status: 'playing' })
}

// (gameId, uid, livello: number) -> Promise<number>, il livello scritto.
// Valore assoluto e non delta: chi chiama ha già il livello a schermo.
// Il clamp è l'ultima rete prima delle Security Rules.
export async function cambiaLivello(gameId, uid, livello) {
  const nuovo = Math.min(LIVELLO_MAX, Math.max(LIVELLO_MIN, livello))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { level: nuovo })
  return nuovo
}

// (gameId, uid, bonus: number) -> Promise<number>. Non tocca la vittoria,
// che dipende dal livello.
export async function cambiaBonus(gameId, uid, bonus) {
  const nuovo = Math.min(BONUS_MAX, Math.max(BONUS_MIN, bonus))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { bonus: nuovo })
  return nuovo
}

// (gameId, uid, nome) -> Promise<void>. Separata da `cambiaLivello`: fra il
// livello 10 e la vittoria c'è una doppia conferma. `winnerName` duplica il
// nome apposta, così la schermata di vittoria legge il solo documento game.
export async function dichiaraVittoria(gameId, uid, nome) {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'finished',
    winnerUid: uid,
    winnerName: nome,
  })
}

// (gameId, uid, combattente: boolean) -> Promise<void>.
// Il +1 lo applicano i giocatori al tavolo: qui è solo un booleano.
export async function cambiaCombattente(gameId, uid, combattente) {
  await updateDoc(doc(db, 'games', gameId, 'players', uid), {
    isFighter: combattente,
  })
}
