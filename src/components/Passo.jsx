// I +/− di un valore, in cinque posti con la stessa forma.
//
// Props
//   etichetta string    per lo screen reader e le colonne
//   valore    number    serve solo a spegnere i bottoni ai limiti
//   min, max  number
//   onCambia  (delta: -1 | +1) => void
//   children  il numero, quando non è già in una colonna accanto
function Passo({ etichetta, valore, min, max, onCambia, children }) {
  return (
    <span className="gruppo">
      <span className="etichetta">{etichetta}</span>
      <button
        type="button"
        onClick={() => onCambia(-1)}
        disabled={valore <= min}
      >
        −
      </button>
      {children}
      <button
        type="button"
        onClick={() => onCambia(+1)}
        disabled={valore >= max}
      >
        +
      </button>
    </span>
  )
}

export default Passo
