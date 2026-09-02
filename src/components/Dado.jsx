import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const FACCE = 6

// Il dado del regolamento: si tira per fuggire. Nessuna prop e niente
// Firestore, il risultato non lo legge nessun altro.
function Dado() {
  const dialogo = useRef(null)
  const [risultato, setRisultato] = useState(null)

  // Un tiro per apertura: per rifarlo si chiude e si ripreme il dado.
  function apri() {
    setRisultato(1 + Math.floor(Math.random() * FACCE))
    dialogo.current?.showModal()
  }

  // <dialog> non si chiude da solo toccando fuori. Il bersaglio è il dialogo
  // stesso solo quando il tocco cade sullo sfondo.
  function chiudiDaFuori(event) {
    if (event.target === dialogo.current) dialogo.current.close()
  }

  return (
    <>
      <button
        type="button"
        className="dado"
        onClick={apri}
        aria-label={`Tira un dado a ${FACCE} facce`}
      >
        d{FACCE}
      </button>

      {/* Fuori dal titolo: un <dialog> dentro un <h1> non è markup valido,
          e nel top layer del browser sta bene ovunque. */}
      {createPortal(
        <dialog
          className="dialogo-dado"
          ref={dialogo}
          onClick={chiudiDaFuori}
          aria-labelledby="titolo-dado"
        >
          <h2 id="titolo-dado">Dado a {FACCE} facce</h2>

          <p className="risultato">
            <strong>{risultato}</strong>
          </p>

          <button type="button" onClick={() => dialogo.current?.close()}>
            Chiudi
          </button>
        </dialog>,
        document.body,
      )}
    </>
  )
}

export default Dado
