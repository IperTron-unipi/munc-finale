import { useParams } from 'react-router-dom'
import Lobby from './game/Lobby'
import Playing from './game/Playing'
import Finished from './game/Finished'

function Game() {
  const { gameId } = useParams()

  // TODO: leggere lo status da Firestore (games/{gameId}) e scegliere la vista
  const status = 'lobby'

  switch (status) {
    case 'playing':
      return <Playing gameId={gameId} />
    case 'finished':
      return <Finished gameId={gameId} />
    case 'lobby':
    default:
      return <Lobby gameId={gameId} />
  }
}

export default Game
