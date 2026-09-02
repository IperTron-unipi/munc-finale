// La riga rossa che dice cosa è andato storto.
//
// Props
//   messaggio string | null — null rende null, così chi chiama non ripete la condizione
//
// role="alert" sta qui una volta sola: fa leggere la riga a chi usa uno
// screen reader, ed è facile dimenticarlo.
function Errore({ messaggio }) {
  if (!messaggio) return null

  return (
    <p className="errore" role="alert">
      {messaggio}
    </p>
  )
}

export default Errore
