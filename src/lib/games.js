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
//
// Il personaggio ha due statistiche separate, e sono indipendenti:
//   level   1–10, quello che il giocatore ha guadagnato
//   bonus   da 0 in su, quello che gli danno gli oggetti
//
// A far vincere è il **livello** a 10, non la somma. La somma è la forza
// in combattimento: si guarda al tavolo per sapere chi batte il mostro,
// e l'app la mostra senza farci dipendere niente.
export const LIVELLO_MIN = 1
export const LIVELLO_MAX = 10
export const BONUS_MIN = 0
export const LUNGHEZZA_NOME_MAX = 20

// Il bonus non ha un tetto nel gioco: qui ce n'è uno solo perché una
// regola senza limite superiore lascia scrivere `bonus: 999999`.
// È una soglia di buon senso, non una regola di Munchkin.
export const BONUS_MAX = 20

// La forza in combattimento. Non decide la vittoria, si legge e basta.
// Il `?? BONUS_MIN` copre i personaggi creati prima che il bonus esistesse.
export function totale(giocatore) {
  return giocatore.level + (giocatore.bonus ?? BONUS_MIN)
}

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
    bonus: BONUS_MIN,
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

/**
 * Cambia il livello del proprio personaggio.
 *
 * Il valore arriva assoluto, non come delta: chi chiama il livello attuale
 * ce l'ha già a schermo, quindi il conto lo fa lui e qui non serve
 * rileggere niente da Firestore.
 *
 * Il clamp è l'ultima rete prima delle Security Rules. Su un campo solo è
 * senza ambiguità: c'è un unico valore da riportare dentro i limiti.
 */
export async function cambiaLivello(gameId, uid, livello) {
  const nuovo = Math.min(LIVELLO_MAX, Math.max(LIVELLO_MIN, livello))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { level: nuovo })
  return nuovo
}

/**
 * Cambia il bonus da oggetti del proprio personaggio.
 * Statistica indipendente dal livello: si scrive da sola e non tocca
 * la vittoria, che dipende solo dal livello.
 */
export async function cambiaBonus(gameId, uid, bonus) {
  const nuovo = Math.min(BONUS_MAX, Math.max(BONUS_MIN, bonus))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { bonus: nuovo })
  return nuovo
}

/**
 * Chiude la partita dichiarando vincitore chi chiama.
 *
 * È separata da `cambiaLivello` perché arrivare a livello 10 e vincere non
 * sono lo stesso fatto: fra le due c'è una persona che conferma due volte.
 * Il livello 10 con la partita ancora in corso è uno stato legittimo, non
 * un'incoerenza da evitare tenendo le due scritture in un batch.
 *
 * `winnerName` duplica un nome che sta già nella sottocollezione players.
 * È denormalizzazione voluta: la schermata di vittoria deve poter dire
 * chi ha vinto leggendo il solo documento game.
 */
export async function dichiaraVittoria(gameId, uid, nome) {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'finished',
    winnerUid: uid,
    winnerName: nome,
  })
}

/**
 * Accende o spegne il flag Combattente del proprio personaggio.
 * È un booleano e basta, e non è il bonus: il +1 in combattimento
 * lo applicano i giocatori al tavolo, l'app non calcola nulla.
 */
export async function cambiaCombattente(gameId, uid, combattente) {
  await updateDoc(doc(db, 'games', gameId, 'players', uid), {
    isFighter: combattente,
  })
}
