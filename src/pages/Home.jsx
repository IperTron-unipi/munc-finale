import { Link } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { useAuth } from '../context/AuthContext'

function Home() {
  const { user } = useAuth()

  // Dopo signOut non serve navigare: RequireAuth rimanda a /login da solo.
  function esci() {
    signOut(auth)
  }

  return (
    <section className="colonna">
      <h1>Munchkin Tracker</h1>

      <p>
        {user.email}{' '}
        <button type="button" className="link" onClick={esci}>
          Esci
        </button>
      </p>

      <Link className="azione" to="/create">Crea partita</Link>
      <Link className="azione" to="/join">Unisciti a una partita</Link>

      {/* File in public/, non una route: <Link> resterebbe dentro il router. */}
      <a href="/regolamento.html">Regolamento</a>
    </section>
  )
}

export default Home
