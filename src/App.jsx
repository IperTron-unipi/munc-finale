import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import CreateGame from './pages/CreateGame'
import JoinGame from './pages/JoinGame'
import Game from './pages/Game'
import RequireAuth from './components/RequireAuth'
import './App.css'

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
      <Route path="/create" element={<RequireAuth><CreateGame /></RequireAuth>} />
      <Route path="/join" element={<RequireAuth><JoinGame /></RequireAuth>} />
      <Route path="/game/:gameId" element={<RequireAuth><Game /></RequireAuth>} />
    </Routes>
  )
}

export default App
