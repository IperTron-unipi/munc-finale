import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import CreateGame from './pages/CreateGame'
import JoinGame from './pages/JoinGame'
import Game from './pages/Game'
import RequireAuth from './components/RequireAuth'
import AuthProvider from './context/AuthProvider'
import './App.css'

function App() {
  return (
    <AuthProvider>
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
    </AuthProvider>
  )
}

export default App
