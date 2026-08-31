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

// Vincoli del personaggio, ripetuti nelle Security Rules: qui servono a
// non mandare a Firestore una scrittura che verrebbe respinta.
// Livello e bonus sono indipendenti, e si vince col livello a 10.
export const LIVELLO_MIN = 1
export const LIVELLO_MAX = 10
export const BONUS_MIN = 0
// non una regola di Munchkin: giocando nessuno ha mai avuto un bonus maggiore di 25/30 
// senza, si potrebbe scrivere `bonus: 999999`.
export const BONUS_MAX = 50
export const LUNGHEZZA_NOME_MAX = 20


// La forza in combattimento: si legge e basta, non decide la vittoria.
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
  // Con 32^6 combinazioni non capita, ma meglio un errore di un ciclo infinito.
  throw new ErroreGioco('gioco/codice-non-generato')
}

// Crea la partita e il personaggio dell'host insieme.
// Restituisce il codice, che è anche l'id del documento.
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

// Unisce l'utente a una partita esistente.
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

// L'host fa partire la partita. A difendere il dato sono le Security
// Rules: il controllo nel componente serve solo a nascondere il bottone.
export async function iniziaPartita(gameId) {
  await updateDoc(doc(db, 'games', gameId), { status: 'playing' })
}

// Cambia il livello. Il valore arriva assoluto e non come delta: chi
// chiama ha già il livello a schermo, così qui non si rilegge niente.
// Il clamp è l'ultima rete prima delle Security Rules.
export async function cambiaLivello(gameId, uid, livello) {
  const nuovo = Math.min(LIVELLO_MAX, Math.max(LIVELLO_MIN, livello))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { level: nuovo })
  return nuovo
}

// Cambia il bonus da oggetti. Non tocca la vittoria, che dipende dal livello.
export async function cambiaBonus(gameId, uid, bonus) {
  const nuovo = Math.min(BONUS_MAX, Math.max(BONUS_MIN, bonus))
  await updateDoc(doc(db, 'games', gameId, 'players', uid), { bonus: nuovo })
  return nuovo
}

// Chiude la partita dichiarando vincitore chi chiama. Separata da
// `cambiaLivello`: fra il livello 10 e la vittoria c'è una doppia conferma.
// `winnerName` duplica il nome apposta, così la schermata di vittoria
// legge il solo documento game.
export async function dichiaraVittoria(gameId, uid, nome) {
  await updateDoc(doc(db, 'games', gameId), {
    status: 'finished',
    winnerUid: uid,
    winnerName: nome,
  })
}

// Accende o spegne il flag Combattente. Il +1 lo applicano i giocatori
// al tavolo: qui è solo un booleano.
export async function cambiaCombattente(gameId, uid, combattente) {
  await updateDoc(doc(db, 'games', gameId, 'players', uid), {
    isFighter: combattente,
  })
}
