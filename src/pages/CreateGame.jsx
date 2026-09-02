import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useInvio } from '../hooks/useInvio'
import Errore from '../components/Errore'
import { creaPartita, LUNGHEZZA_NOME_MAX } from '../lib/games'

// Crea la partita e porta dritto alla sua lobby. Nessuna prop, è una route.
function CreateGame() {
  const { user } = useAuth()          // c'è di sicuro: route dietro RequireAuth
  const navigate = useNavigate()

  const [nome, setNome] = useState('')  // del personaggio, non dell'account
  const { error, setError, submitting, invia } = useInvio()

  function handleSubmit(event) {
    event.preventDefault()

    const nomePulito = nome.trim()
    if (nomePulito === '') {
      setError('Scrivi il nome del personaggio')
      return
    }

    invia(async () => {
      const codice = await creaPartita(user.uid, nomePulito)
      // replace: senza, il tasto "indietro" tornerebbe qui e un secondo
      // invio creerebbe una partita in più.
      navigate(`/game/${codice}`, { replace: true })
    })
  }

  return (
    <section className="colonna">
      <h1>Crea partita</h1>
      <p>Ricevi un codice da passare agli altri giocatori.</p>

      <form className="colonna" onSubmit={handleSubmit}>
        <label htmlFor="nome">Nome del personaggio</label>
        <input
          id="nome"
          type="text"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          maxLength={LUNGHEZZA_NOME_MAX}
          autoComplete="off"
          required
        />
        <p className="aiuto">
          È il nome con cui ti vedono gli altri sul tabellone.
        </p>

        <Errore messaggio={error} />

        <button type="submit" disabled={submitting}>
          {submitting ? 'Creo la partita…' : 'Crea partita'}
        </button>
      </form>

      <Link to="/">Torna alla home</Link>
    </section>
  )
}

export default CreateGame
