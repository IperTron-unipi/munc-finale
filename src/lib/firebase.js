import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

//importa le variabili d'ambiente
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

//aggancio con firebase
export const app = initializeApp(firebaseConfig)

// La persistenza predefinita è browserLocalPersistence: la sessione
// sopravvive al refresh e alla chiusura del browser, non va configurata.

//gestisce l'autentiucazione dell'utente e la persistenza della sessione
export const auth = getAuth(app)
//gestisce il database firestore
export const db = getFirestore(app)
