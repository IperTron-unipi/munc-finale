function RequireAuth({ children }) {
  // TODO: leggere { user, loading } dal contesto di autenticazione
  // loading → schermata di caricamento
  // user === null → <Navigate to="/login" replace />
  // altrimenti → children
  return children
}

export default RequireAuth
