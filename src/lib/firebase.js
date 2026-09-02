import { initializeApp } from 'firebase/app'
import { getAuth } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'

// L'unico punto in cui si inizializza Firebase: `auth` e `db` si importano
// da qui. Le chiavi arrivano dalle variabili d'ambiente di Vite.
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

// Auth: la persistenza predefinita è browserLocalPersistence, quindi la
// sessione sopravvive al refresh senza configurare niente.
export const auth = getAuth(app)
export const db = getFirestore(app)
