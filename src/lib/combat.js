import {
  deleteDoc,
  deleteField,
  doc,
  increment,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { generaCodice } from './gameCode'
import { totale } from './games'

// Calcoli e scritture del combattimento in corso.
//
// Tipi
//   combattimento { sfidanteUid: string, aiutanteUid: string | null,
//                   modificatori: { [uid]: number },
//                   mostri: { [id]: mostro }, apertoIl: Timestamp }
//                 documento in games/{gameId}/combat/corrente
//   mostro        { nome: string, livello: number, bonus: number,
//                   doppio: boolean, ordine: number }
//   voceMostro    mostro + { id: string } — quello che gira nei componenti
//   giocatore     vedi lib/games.js, più `uid`

// Vincoli ripetuti nelle Security Rules.
export const MOSTRO_LIVELLO_MIN = 1
// 20 è il mostro più alto del gioco base, +10 copre potenziamenti ed espansioni.
export const MOSTRO_LIVELLO_MAX = 30
export const MODIFICATORE_MIN = -50
export const MODIFICATORE_MAX = 50
// Un malus può ridurre a 1, non annullare.
export const FORZA_MIN = 1
export const MOSTRI_MAX = 12
export const LUNGHEZZA_NOME_MOSTRO_MAX = 24
export const NOME_MOSTRO_PREDEFINITO = 'Mostro'

// Un solo combattimento per volta: l'id è fisso, quindi aprirne uno è una
// scrittura sola e non serve una query per trovarlo.
export function riferimentoCombattimento(gameId) {
  return doc(db, 'games', gameId, 'combat', 'corrente')
}

// (combattimento) -> voceMostro[] in ordine di comparsa. I mostri stanno in
// una mappa e non in un array: con i path puntati (`mostri.X4K2P9.bonus`)
export function listaMostri(combattimento) {
  return Object.entries(combattimento?.mostri ?? {})
    .map(([id, mostro]) => ({ id, ...mostro }))
    .sort((a, b) => (a.ordine ?? 0) - (b.ordine ?? 0))
}

// (mostro) -> number. Il pavimento sta prima del raddoppio: lo Sdoppiamento
// mette in campo due copie di quello che il mostro è adesso, quindi un
// livello 8 con −10 vale 1 e sdoppiato vale 2.
export function forzaMostro(mostro) {
  const base = Math.max(FORZA_MIN, mostro.livello + (mostro.bonus ?? 0))
  return mostro.doppio ? base * 2 : base
}

export function forzaMostri(combattimento) {
  return listaMostri(combattimento).reduce((t, m) => t + forzaMostro(m), 0)
}

// (combattimento, giocatore[]) -> giocatore[] di chi combatte, al massimo due.
// Il limite sta nella forma del documento: due caselle e non una lista. Il
// `Set` copre il caso che l'interfaccia non lascia fare — sfidante e aiutante
// lo stesso uid — che conterebbe due volte.
export function schieramento(combattimento, giocatori) {
  if (!combattimento) return []
  return [...new Set([combattimento.sfidanteUid, combattimento.aiutanteUid])]
    .map((uid) => giocatori.find((g) => g.uid === uid))
    .filter(Boolean)
}

// Il modificatore di questo scontro, distinto dal bonus da oggetti del tabellone.
export function modificatoreGiocatore(combattimento, uid) {
  return combattimento?.modificatori?.[uid] ?? 0
}

// (giocatore, modificatore: number) -> number. Il pavimento vale su ciascuno,
// non sulla somma: due a 8 con −10 fanno 2.
export function forzaGiocatore(giocatore, modificatore) {
  return Math.max(FORZA_MIN, totale(giocatore) + modificatore)
}

export function forzaGiocatori(combattimento, giocatori) {
  return schieramento(combattimento, giocatori).reduce(
    (t, g) => t + forzaGiocatore(g, modificatoreGiocatore(combattimento, g.uid)),
    0,
  )
}

// (noi, loro, conCombattente: boolean) -> boolean. I mostri vincono i pareggi,
// tranne se in campo c'è un Combattente: è l'unico effetto del flag.
export function vincono(noi, loro, conCombattente) {
  return (noi === loro) ? conCombattente : (noi > loro)
}

export async function apriCombattimento(gameId, uid) {
  await setDoc(riferimentoCombattimento(gameId), {
    sfidanteUid: uid,
    aiutanteUid: null,
    modificatori: { [uid]: 0 },
    mostri: {},
    apertoIl: serverTimestamp(),
  })
}

export async function chiudiCombattimento(gameId) {
  await deleteDoc(riferimentoCombattimento(gameId))
}


// (gameId, uid: string | null, uscente?: string) -> Promise<void>.
// Chi entra parte pulito e chi esce si porta via il suo modificatore: senza,
// uno che si ritira e rientra ritroverebbe il conto di prima.
export async function cambiaAiutante(gameId, uid, uscente) {
  const modifiche = { aiutanteUid: uid }
  if (uid) modifiche[`modificatori.${uid}`] = 0
  if (uscente) modifiche[`modificatori.${uscente}`] = deleteField()
  await updateDoc(riferimentoCombattimento(gameId), modifiche)
}

// Il livello arriva già scelto e non si tocca più.
export async function aggiungiMostro(gameId, nome, livello) {
  const id = generaCodice()
  await updateDoc(riferimentoCombattimento(gameId), {
    [`mostri.${id}`]: {
      nome:
        nome.trim().slice(0, LUNGHEZZA_NOME_MOSTRO_MAX) ||
        NOME_MOSTRO_PREDEFINITO,
      livello: Math.min(
        MOSTRO_LIVELLO_MAX,
        Math.max(MOSTRO_LIVELLO_MIN, livello),
      ),
      bonus: 0,
      doppio: false,
      // Tiene i mostri in ordine di comparsa.
      ordine: Date.now(),
    },
  })
}

// I quattro comandi che scrivono un campo solo passano tutti di qui. Restano
// `async` loro: Combattimento.jsx aggancia il catch alla promessa che tornano.
function scriviCampo(gameId, campo, valore) {
  return updateDoc(riferimentoCombattimento(gameId), { [campo]: valore })
}

export async function togliMostro(gameId, id) {
  await scriviCampo(gameId, `mostri.${id}`, deleteField())
}

// Delta e non valore assoluto, qui e nel modificatore: sul tavolo la stessa
// riga la tocca chiunque, e `increment` somma invece di sovrascrivere.
export async function cambiaBonusMostro(gameId, id, delta) {
  await scriviCampo(gameId, `mostri.${id}.bonus`, increment(delta))
}

export async function cambiaSdoppiamento(gameId, id, doppio) {
  await scriviCampo(gameId, `mostri.${id}.doppio`, doppio)
}

export async function cambiaModificatoreGiocatore(gameId, uid, delta) {
  await scriviCampo(gameId, `modificatori.${uid}`, increment(delta))
}
