import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import RequireAuth from './components/RequireAuth'
import AuthProvider from './context/AuthProvider'
import './App.css'

// Caricate a richiesta: si portano dietro firebase/firestore, che pesa più di
// tutto il resto messo insieme e non serve per arrivare al login.
const Home = lazy(() => import('./pages/Home'))
const CreateGame = lazy(() => import('./pages/CreateGame'))
const JoinGame = lazy(() => import('./pages/JoinGame'))
const Game = lazy(() => import('./pages/Game'))

function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<p className="stato">Caricamento…</p>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
          <Route path="/create" element={<RequireAuth><CreateGame /></RequireAuth>} />
          <Route path="/join" element={<RequireAuth><JoinGame /></RequireAuth>} />
          <Route path="/game/:gameId" element={<RequireAuth><Game /></RequireAuth>} />
          {/* Rotte senza partita: si torna alla home invece di lasciare
              la pagina bianca. */}
          <Route path="/game" element={<Navigate to="/" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </AuthProvider>
  )
}

export default App
