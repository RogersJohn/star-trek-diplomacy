import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'
import GameMap from './map/GameMap'
import OrderPanel from './OrderPanel'
import StatusBar from './StatusBar'

export default function Game() {
  const { gameId } = useParams()
  const { 
    connect, 
    joinGame, 
    gameState, 
    myState, 
    faction,
    fetchGameState,
    fetchPlayerState
  } = useGameStore()
  
  const [selectedFaction, setSelectedFaction] = useState(null)
  
  useEffect(() => {
    connect()
    
    // Get faction from URL params or localStorage
    const params = new URLSearchParams(window.location.search)
    const factionParam = params.get('faction') || localStorage.getItem(`game_${gameId}_faction`)
    
    if (factionParam) {
      setSelectedFaction(factionParam)
      joinGame(gameId, factionParam)
    }
    
    // Poll for updates (fallback if WebSocket fails)
    const interval = setInterval(() => {
      fetchGameState()
      if (selectedFaction) fetchPlayerState()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [gameId])
  
  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lcars-orange text-xl">Loading game...</div>
      </div>
    )
  }
  
  // If game ended, show victory screen
  if (gameState.winner) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-5xl font-bold text-lcars-orange mb-4">
          VICTORY
        </h1>
        <div className="text-3xl text-lcars-blue mb-8">
          {gameState.winner.winners?.join(' & ')} 
          {gameState.winner.type === 'allied_victory' && ' (Allied Victory)'}
          {gameState.winner.type === 'latinum' && ' (Economic Victory)'}
        </div>
        <div className="lcars-panel p-8 text-center">
          <p className="text-xl mb-4">
            Game ended on Turn {gameState.turn}, Year {gameState.year}
          </p>
          <p className="text-gray-400">
            {gameState.winner.type === 'solo' && `With ${gameState.winner.supplyCenters} supply centers`}
            {gameState.winner.type === 'allied_victory' && `Combined ${gameState.winner.combinedSC} supply centers`}
            {gameState.winner.type === 'latinum' && `With ${gameState.winner.latinum} bars of latinum`}
          </p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="h-screen flex flex-col">
      {/* Status Bar */}
      <StatusBar 
        gameState={gameState} 
        myState={myState}
        faction={selectedFaction}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Map */}
        <div className="flex-1">
          <GameMap 
            gameState={gameState}
            faction={selectedFaction}
          />
        </div>
        
        {/* Order Panel */}
        <OrderPanel 
          gameState={gameState}
          myState={myState}
          faction={selectedFaction}
        />
      </div>
    </div>
  )
}
