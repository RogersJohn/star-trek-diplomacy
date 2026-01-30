import { Routes, Route } from 'react-router-dom'
import { useGameStore } from './hooks/useGameStore'
import Home from './components/Home'
import Lobby from './components/Lobby'
import Game from './components/Game'

function App() {
  return (
    <div className="min-h-screen bg-space-dark text-white">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/lobby/:lobbyId" element={<Lobby />} />
        <Route path="/game/:gameId" element={<Game />} />
      </Routes>
    </div>
  )
}

export default App
