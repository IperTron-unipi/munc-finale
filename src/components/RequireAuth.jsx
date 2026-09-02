import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Avvolge le route private: rende `children` solo a sessione aperta.
function RequireAuth({ children }) {
  const { user, loading } = useAuth()

  // Finché Firebase non ha ripristinato la sessione non si decide niente,
  // altrimenti ogni refresh mostrerebbe un lampo di /login.
  if (loading) return <p className="stato">Apro la sessione…</p>

  if (user === null) return <Navigate to="/login" replace />

  return children
}

export default RequireAuth
