import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  creaPartita,
  messaggioErroreGioco,
  LUNGHEZZA_NOME_MAX,
} from '../lib/games'

function CreateGame() {
  const { user } = useAuth()          // c'è di sicuro: la route sta dietro RequireAuth
  const navigate = useNavigate()

  const [nome, setNome] = useState('')          // nome del personaggio, non dell'account
  const [error, setError] = useState(null)      // messaggio da mostrare, null se non c'è nulla da dire
  const [submitting, setSubmitting] = useState(false)  // true mentre la scrittura è in volo

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)

    const nomePulito = nome.trim()
    if (nomePulito === '') {
      setError('Scrivi il nome del personaggio')
      return
    }

    setSubmitting(true)
    try {
      const codice = await creaPartita(user.uid, nomePulito)
      // replace: senza, il tasto "indietro" tornerebbe su questo form
      // e un secondo invio creerebbe una partita in più.
      navigate(`/game/${codice}`, { replace: true })
    } catch (err) {
      setError(messaggioErroreGioco(err.code))
      setSubmitting(false)
    }
    // Nessun finally: se è andata bene il componente è già smontato,
    // e scrivere su uno stato smontato non serve a niente.
  }

  return (
    <section className="colonna">
      <h1>Crea partita</h1>

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

        {error && (
          <p className="errore" role="alert">
            {error}
          </p>
        )}

        <button type="submit" disabled={submitting}>
          {submitting ? 'Attendi…' : 'Crea'}
        </button>
      </form>

      <Link to="/">Torna indietro</Link>
    </section>
  )
}

export default CreateGame
