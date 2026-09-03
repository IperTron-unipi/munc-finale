# Munchkin Tracker

Segnapunti multiplayer per il gioco da tavolo [Munchkin](https://it.wikipedia.org/wiki/Munchkin_(gioco_di_carte)).

Un giocatore crea la partita e condivide un codice di sei caratteri. Gli altri lo digitano dai loro telefoni ed entrano nella stessa sala d'attesa. Da lì livelli e stato del gioco restano allineati su tutti i dispositivi in tempo reale, senza che nessuno debba ricaricare niente.

**L'app è online su https://munchkin-esame.web.app** — si apre dal browser e si installa dal telefono.

## Perché

Le app esistenti per Munchkin sono segnapunti locali: un solo dispositivo che passa di mano in mano attorno al tavolo. Questa è multiplayer — ognuno tiene il proprio personaggio sul proprio telefono e vede quelli degli altri aggiornarsi da soli.

## Il gioco, in tre righe

Ogni personaggio ha un nome, due statistiche indipendenti — il **livello** da 1 a 10 e il **bonus** degli oggetti, che parte da 0 — e un flag **Combattente**, che non porta punti ma vince i pareggi in combattimento.

**Si vince arrivando a livello 10.** Il bonus non fa salire di livello: si somma al livello per dare la **forza in combattimento**, che serve a battere i mostri e non a vincere la partita.

Chi arriva a livello 10 conferma la vittoria due volte, la partita si chiude e tutti gli altri ricevono una notifica. Se non conferma, il livello torna a 9 e si continua.

Il combattimento è una schermata condivisa: uno lo apre, **un solo** altro giocatore può entrare in aiuto, e dall'altra parte si mettono i mostri. Il livello del mostro si sceglie prima che entri e poi non si tocca; quello che si muove durante lo scontro è il bonus, che ognuno — mostro o giocatore in campo — ha per conto suo e può essere un malus. Ogni mostro si può sdoppiare, e il ×2 prende livello e bonus insieme.

Due regole sul conto. **Nessuno scende sotto forza 1**, per quanto grosso sia il malus, e l'arrotondamento si fa su ciascuno prima di sommare: due giocatori a forza 8, entrambi con −10, fanno 2 e non 1. E il **Combattente non porta punti**: il suo unico effetto è che a parità di forza vince la squadra, non i mostri.

Il livello se lo alza chi ha vinto, dai comandi della propria riga. Nella fascia del titolo c'è un **d6** per chi deve fuggire e non ha il dado a portata di mano: il risultato è di chi lo tira e non viene sincronizzato, come un dado vero appoggiato davanti a sé.

## Stack

| | |
|---|---|
| Front-end | React 19 + Vite, CSS puro |
| Routing | React Router |
| Autenticazione | Firebase Authentication (email e password) |
| Dati e realtime | Cloud Firestore (`onSnapshot`) |
| Hosting | Firebase Hosting |

**Non c'è un backend scritto a mano.** La sincronizzazione fra dispositivi è tutta di Firestore: ogni client tiene aperti dei listener sui documenti che gli interessano, e chiunque scriva fa scattare la callback su tutti gli altri.

## Far girare il progetto in locale

Serve Node 20 o superiore e un progetto Firebase.

**1. Dipendenze**

```bash
npm install
```

**2. Configurazione Firebase**

`.env.schema` va copiato in `.env` e riempito con i valori del proprio progetto. Stanno in Console Firebase → Impostazioni progetto → Generali → Le tue app → Configurazione SDK.

```bash
cp .env.schema .env
```

Queste chiavi non sono segrete: finiscono nel bundle JavaScript e chiunque può leggerle. La sicurezza sta nelle Security Rules, non nel nasconderle. Il `.env` è in `.gitignore` solo per non riscriverle in giro.

**3. Servizi da attivare in console**

- **Authentication** → provider Email/Password, e nient'altro
- **Firestore Database** → modalità produzione, regione `eur3 (europe-west)`

La regione non si cambia dopo: si può solo cancellare il database e rifarlo.

**4. Security Rules**

Firestore in modalità produzione blocca ogni lettura e scrittura finché le regole non vengono pubblicate. Il contenuto di `firestore.rules` va incollato in Console Firebase → Firestore Database → Regole → Pubblica, oppure pubblicato dalla CLI con `npm run deploy:rules` (vedi [Pubblicare](#pubblicare)).

Senza questo passo l'app si avvia ma ogni operazione fallisce con "Operazione non permessa".

**5. Avvio**

```bash
npm run dev
```

Le collezioni `games` e `players` non vanno create a mano: Firestore non ha uno schema, e nascono alla prima partita.

### Altri comandi

```bash
npm run lint      # ESLint
npm run build     # build di produzione in dist/
npm run preview   # anteprima della build
```

## Pubblicare

Serve la CLI di Firebase, una volta sola per macchina.

```bash
npm i -g firebase-tools
firebase login
```

Poi, da dentro il progetto:

```bash
npm run deploy          # build + Hosting + Security Rules
npm run deploy:rules    # solo le regole, senza ricostruire
```

Il progetto di destinazione è in `.firebaserc`, e cosa pubblicare sta in `firebase.json`: la cartella `dist`, il rewrite che manda ogni rotta a `index.html`, e le intestazioni di cache.

Va usato sempre `npm run deploy` e non `firebase deploy` da solo: il primo ricostruisce `dist`, il secondo pubblica quello che ci trova. Le variabili di `.env` finiscono nel bundle durante la build, quindi la build va fatta dove il `.env` è quello giusto — su Hosting non c'è niente da configurare.

## Struttura

```
src/
  lib/
    firebase.js            app, auth, db
    gameCode.js            genera e normalizza il codice partita
    games.js               le scritture su Firestore
    combat.js              il combattimento: totali, verdetto, scritture
    notifiche.js           permesso e notifica locale
  context/                 AuthProvider: onAuthStateChanged → { user, loading }
  hooks/
    usePartita.js          i due onSnapshot di una partita
    useCombattimento.js    lo snapshot del combattimento aperto
    useNotificaVittoria.js notifica alla transizione a finished
    useInvio.js            scrivi, poi cambia schermata: error e submitting
  components/
    RequireAuth.jsx        la guardia delle route protette
    AvvisoNotifiche.jsx    il bottone che chiede il permesso
    Combattimento.jsx      il pannello dello scontro
    Dado.jsx               il d6 nella fascia del titolo, e il suo popup
    Errore.jsx             la riga rossa con role="alert"
    Passo.jsx              i +/− di un valore: tabellone e combattimento
  pages/                   Login, Home, CreateGame, JoinGame, Game
public/
  sw.js                    service worker: cache, pagina offline, notifica
  manifest.webmanifest     nome, icone, display standalone
  regolamento.html         regolamento, e ripiego quando manca la rete
  icons/                   192, 512, maskable 512, apple touch, favicon
scripts/
  genera-icone.mjs         rigenera i PNG delle icone, senza dipendenze
firestore.rules            le Security Rules, pubblicate col deploy
firestore.indexes.json     vuoto: non c'è una sola query da indicizzare
firebase.json              cosa pubblicare, rewrite delle rotte, cache
.firebaserc                a quale progetto Firebase parla la CLI
```

Due confini tenuti ovunque: le pagine si occupano dell'interfaccia mentre `lib/` e `hooks/` si occupano dei dati — nessuna pagina importa `firebase/firestore` direttamente. E ogni vincolo che conta sta nelle Security Rules, perché il client non è una fonte affidabile.

### Dati

```
games/{codice}                    il codice di 6 caratteri È l'id del documento
  status: lobby | playing | finished
  hostUid, createdAt, winnerUid, winnerName

games/{codice}/players/{uid}      l'uid dell'utente autenticato È l'id
  name, level, bonus, isFighter, joinedAt

games/{codice}/combat/corrente    id fisso: si combatte uno scontro per volta
  sfidanteUid, aiutanteUid, apertoIl
  modificatori: { [uid]: numero }   il malus di chi è in campo, uno per uno
  mostri: { [id]: { nome, livello, bonus, doppio, ordine } }
```

Il codice come id significa che unirsi a una partita è un `getDoc` diretto: nessuna query, nessun indice, e l'unicità la garantisce Firestore. Stesso motivo per l'id fisso del combattimento: il documento c'è mentre si combatte e sparisce alla chiusura, quindi "c'è uno scontro aperto?" non è una query ma l'esistenza di un documento.

## Le route

| | |
|---|---|
| `/login` | form unico per accedere e registrarsi |
| `/` | home: crea partita, unisciti, esci |
| `/create` | nome del personaggio → nuova partita |
| `/join` | codice + nome del personaggio |
| `/game/:gameId` | sala d'attesa, board o vittoria, secondo lo `status` |
| `/regolamento.html` | pagina statica, fuori dal router: le regole di Munchkin |

Tutte tranne `/login` stanno dietro `RequireAuth`. Il regolamento è un file in `public/`, non una route: si apre con un `<a>` e si legge anche senza aver fatto l'accesso.

## Stato del progetto

| fase | |
|---|---|
| 1. Autenticazione e route protette | fatta |
| 2. Creare e unirsi a una partita | fatta |
| 3. Sala d'attesa in tempo reale | fatta |
| 4. Board di gioco | fatta |
| 5. Vittoria e notifica | fatta |
| 6. PWA installabile e offline | fatta |
| 7. Deploy | fatta |
| 8. Combattimenti | fatta |

## Note

**Il combattimento è l'unico documento che scrivono tutti.** Ovunque altrove vale "ognuno scrive solo il proprio personaggio", e le Security Rules lo impongono. Uno scontro non può funzionare così: le carte che lo modificano le gioca chiunque sia al tavolo. Da qui due conseguenze nel codice. Mostri e malus stanno in due **mappe** e non in array, così due giocatori che toccano righe diverse nello stesso istante scrivono su campi diversi e non si sovrascrivono. E i bottoni mandano un **delta** con `increment`, non il valore assoluto come nel resto dell'app: se due persone premono `+` insieme, il server somma entrambe.

**Il livello del mostro non sta su Firestore finché il mostro non esiste.** Si sceglie nel modulo, accanto al nome, ed è uno `useState` del componente: è un campo di un form, non un dato della partita. Da lì in poi il mostro si corregge dal bonus, che è l'unica sua statistica che cambia durante lo scontro.

**L'app è installabile e ha un solo service worker.** Manifest e worker sono scritti a mano, senza `vite-plugin-pwa`: il worker delle notifiche esisteva già, e un secondo worker sullo stesso `scope` non si affiancherebbe al primo — lo sostituirebbe. Un file solo evita il problema in partenza.

**Senza rete si vede il regolamento, non l'app.** Le aperture di pagina passano prima dalla rete e ripiegano su `regolamento.html` — la stessa pagina che la home collega come regolamento, così il testo esiste in una copia sola. È una scelta: un tracker che prende ogni dato da Firestore, servito dalla cache a linea assente, sarebbe una schermata di caricamento infinita. JavaScript, CSS e icone invece si servono dalla cache, perché il loro nome contiene l'hash del contenuto e non può diventare stantio.

**Se `regolamento.html`, il manifest o le icone vengono modificati, bisogna alzare la versione in `public/sw.js`.** Quei file sono precaricati e non hanno l'hash nel nome: senza il cambio di `CACHE`, chi ha già visitato il sito continua a vedere la versione vecchia.

**Ogni rotta è servita da `index.html`.** Il routing sta nel browser: il server non conosce `/game/K7QM2P`, e senza il rewrite in `firebase.json` ogni ricaricamento dentro una partita sarebbe un 404. Non tocca i file veri — Hosting li prova per primi, quindi `/regolamento.html` resta la pagina statica che è.

**Le due regole di cache dicono il contrario l'una dell'altra, ed è voluto.** I file in `/assets/` hanno l'hash nel nome, non possono diventare stantii, e si tengono per un anno senza rivalidare. `sw.js` ha il nome fisso e comanda tutta la cache: servirne una copia vecchia bloccherebbe ogni aggiornamento, quindi va in `no-cache`.

**Le notifiche sono locali, non push.** Il piano gratuito di Firebase non include Cloud Functions, e una push FCM va inviata da un backend autenticato — mai dal client. Ogni giocatore ha già un listener sulla partita: quando lo stato passa a `finished`, il client mostra una notifica tramite il service worker. Arriva solo ad app aperta o in background, e su iOS solo se la PWA è installata dalla schermata Home. Il permesso si chiede con un bottone all'ingresso in partita, non all'apertura dell'app: un permesso negato non si può ritirare.

## Uso dell'IA

Ho usato l'IA soprattutto per il brainstorming e per la ricerca sulle best practice. Un caso concreto è stato capire come adattare a Firebase la versione precedente di questo progetto, che usava un backend Express con database locale, passando ad Authentication, Firestore e Hosting. Per il CSS ho scritto io lo stile di una prima parte del sito, poi ho chiesto all'IA di estenderlo con coerenza al resto delle pagine. È stata utile anche per riordinare il codice: quello che prima stava in un unico file grande è ora diviso nei tanti file ordinati descritti in [Struttura](#struttura).

---

Progetto per l'esame di Sviluppo Applicazioni Web — Università di Pisa, corso di laurea in Informatica.
Mattia Zampi, matricola 690742.
