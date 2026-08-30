# Munchkin Tracker

Segnapunti multiplayer per il gioco da tavolo [Munchkin](https://it.wikipedia.org/wiki/Munchkin_(gioco_di_carte)).

Un giocatore crea la partita e condivide un codice di sei caratteri. Gli altri lo digitano dai loro telefoni ed entrano nella stessa sala d'attesa. Da lì livelli e stato del gioco restano allineati su tutti i dispositivi in tempo reale, senza che nessuno debba ricaricare niente.

## Perché

Le app esistenti per Munchkin sono segnapunti locali: un solo dispositivo che passa di mano in mano attorno al tavolo. Questa è multiplayer — ognuno tiene il proprio personaggio sul proprio telefono e vede quelli degli altri aggiornarsi da soli.

## Il gioco, in tre righe

Ogni personaggio ha un nome, due statistiche indipendenti — il **livello** da 1 a 10 e il **bonus** degli oggetti, che parte da 0 — e un flag **Combattente** (+1 invisibile in combattimento, vince anche i pareggi).

**Si vince arrivando a livello 10.** Il bonus non fa salire di livello: si somma al livello per dare la **forza in combattimento**, che serve a battere i mostri e non a vincere la partita.

Chi arriva a livello 10 conferma la vittoria due volte, la partita si chiude e tutti gli altri ricevono una notifica. Se non conferma, il livello torna a 9 e si continua.

Il flag Combattente è solo un booleano: il combattimento lo risolvono i giocatori al tavolo, l'app non calcola nulla.

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

Copia `.env.schema` in `.env` e riempilo con i valori del tuo progetto. Li trovi in Console Firebase → Impostazioni progetto → Generali → Le tue app → Configurazione SDK.

```bash
cp .env.schema .env
```

Queste chiavi non sono segrete: finiscono nel bundle JavaScript e chiunque può leggerle. La sicurezza sta nelle Security Rules, non nel nasconderle. Il `.env` è in `.gitignore` solo per non riscriverle in giro.

**3. Servizi da attivare in console**

- **Authentication** → provider Email/Password, e nient'altro
- **Firestore Database** → modalità produzione, regione `eur3 (europe-west)`

La regione non si cambia dopo: si può solo cancellare il database e rifarlo.

**4. Security Rules**

Firestore in modalità produzione blocca ogni lettura e scrittura finché non pubblichi le regole. Incolla il contenuto di `firestore.rules` in Console Firebase → Firestore Database → Regole → Pubblica.

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

## Struttura

```
src/
  lib/
    firebase.js            app, auth, db
    gameCode.js            genera e normalizza il codice partita
    games.js               le scritture su Firestore
    notifiche.js           permesso e notifica locale
  context/                 AuthProvider: onAuthStateChanged → { user, loading }
  hooks/
    usePartita.js          i due onSnapshot di una partita
    useNotificaVittoria.js notifica alla transizione a finished
  components/
    RequireAuth.jsx        la guardia delle route protette
    AvvisoNotifiche.jsx    il bottone che chiede il permesso
  pages/                   Login, Home, CreateGame, JoinGame, Game
public/
  sw.js                    service worker: cache, pagina offline, notifica
  manifest.webmanifest     nome, icone, display standalone
  regolamento.html         regolamento, e ripiego quando manca la rete
  icons/                   192, 512, maskable 512, apple touch, favicon
scripts/
  genera-icone.mjs         rigenera i PNG delle icone, senza dipendenze
firestore.rules
```

Due confini tenuti ovunque: le pagine si occupano dell'interfaccia mentre `lib/` e `hooks/` si occupano dei dati — nessuna pagina importa `firebase/firestore` direttamente. E ogni vincolo che conta sta nelle Security Rules, perché il client non è una fonte affidabile.

### Dati

```
games/{codice}                    il codice di 6 caratteri È l'id del documento
  status: lobby | playing | finished
  hostUid, createdAt, winnerUid, winnerName

games/{codice}/players/{uid}      l'uid dell'utente autenticato È l'id
  name, level, bonus, isFighter, joinedAt
```

Il codice come id significa che unirsi a una partita è un `getDoc` diretto: nessuna query, nessun indice, e l'unicità la garantisce Firestore.

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
| 7. Deploy | da fare |

## Note

**L'app è installabile e ha un solo service worker.** Manifest e worker sono scritti a mano, senza `vite-plugin-pwa`: il worker delle notifiche esisteva già, e un secondo worker sullo stesso `scope` non si affiancherebbe al primo — lo sostituirebbe. Un file solo evita il problema in partenza.

**Senza rete si vede il regolamento, non l'app.** Le aperture di pagina passano prima dalla rete e ripiegano su `regolamento.html` — la stessa pagina che la home collega come regolamento, così il testo esiste in una copia sola. È una scelta: un tracker che prende ogni dato da Firestore, servito dalla cache a linea assente, sarebbe una schermata di caricamento infinita. JavaScript, CSS e icone invece si servono dalla cache, perché il loro nome contiene l'hash del contenuto e non può diventare stantio.

**Se cambi `regolamento.html`, il manifest o le icone, alza la versione in `public/sw.js`.** Quei file sono precaricati e non hanno l'hash nel nome: senza il cambio di `CACHE`, chi ha già visitato il sito continua a vedere la versione vecchia.

**Le notifiche sono locali, non push.** Il piano gratuito di Firebase non include Cloud Functions, e una push FCM va inviata da un backend autenticato — mai dal client. Ogni giocatore ha già un listener sulla partita: quando lo stato passa a `finished`, il client mostra una notifica tramite il service worker. Arriva solo ad app aperta o in background, e su iOS solo se la PWA è installata dalla schermata Home. Il permesso si chiede con un bottone all'ingresso in partita, non all'apertura dell'app: un permesso negato non si può ritirare.

---

Progetto per l'esame di Sviluppo Applicazioni Web — Università di Pisa, corso di laurea in Informatica.
Mattia Zampi, matricola 690742.
