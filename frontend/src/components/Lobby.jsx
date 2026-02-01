import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useGameStore } from '../hooks/useGameStore'

const FACTIONS = [
  { id: 'federation', name: 'Federation', color: '#3399ff', ability: 'Diplomatic Immunity' },
  { id: 'klingon', name: 'Klingon', color: '#cc0000', ability: "Warrior's Rage" },
  { id: 'romulan', name: 'Romulan', color: '#006600', ability: 'Tal Shiar Intel' },
  { id: 'cardassian', name: 'Cardassian', color: '#996633', ability: 'Obsidian Order' },
  { id: 'ferengi', name: 'Ferengi', color: '#ff9900', ability: 'Rules of Acquisition' },
  { id: 'breen', name: 'Breen', color: '#66cccc', ability: 'Energy Dampening' },
  { id: 'gorn', name: 'Gorn', color: '#88aa33', ability: 'Reptilian Resilience' },
]

export default function Lobby() {
  const { lobbyId } = useParams()
  const navigate = useNavigate()
  const { playerName, connect, socket } = useGameStore()
  
  const [lobby, setLobby] = useState(null)
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  
  useEffect(() => {
    connect()
    fetchLobby()
    
    return () => {
      // Cleanup
    }
  }, [lobbyId])
  
  useEffect(() => {
    if (socket) {
      socket.emit('join_lobby', lobbyId)

      socket.on('player_joined', fetchLobby)
      socket.on('player_left', fetchLobby)
      socket.on('faction_selected', fetchLobby)
      socket.on('player_ready_changed', fetchLobby)
      socket.on('game_started', ({ gameId }) => {
        // Store faction in localStorage so Game component can retrieve it
        if (selectedFaction) {
          localStorage.setItem(`game_${gameId}_faction`, selectedFaction)
        }
        navigate(`/game/${gameId}`)
      })

      return () => {
        socket.off('player_joined')
        socket.off('player_left')
        socket.off('faction_selected')
        socket.off('player_ready_changed')
        socket.off('game_started')
      }
    }
  }, [socket, selectedFaction, navigate, lobbyId])
  
  const fetchLobby = async () => {
    try {
      const res = await fetch(`/api/lobby/${lobbyId}`)
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setLobby(data)
        
        // Find my current selection
        const me = data.players.find(p => p.name === playerName)
        if (me) {
          setSelectedFaction(me.faction)
          setIsReady(me.ready)
        }
      }
    } catch (err) {
      setError('Failed to load lobby')
    }
  }
  
  const handleSelectFaction = async (factionId) => {
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/select-faction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, faction: factionId })
      })
      
      const data = await res.json()
      if (data.success) {
        setSelectedFaction(factionId)
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to select faction')
    }
  }
  
  const handleToggleReady = async () => {
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName, ready: !isReady })
      })
      
      const data = await res.json()
      if (data.success) {
        setIsReady(!isReady)
      }
    } catch (err) {
      setError('Failed to change ready status')
    }
  }
  
  const handleStartGame = async () => {
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      const data = await res.json()
      if (!data.success) {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to start game')
    }
  }
  
  const isHost = lobby?.host === playerName
  const allReady = lobby?.players.every(p => p.ready && p.faction)
  const canStart = isHost && allReady && lobby?.players.length >= 3
  
  const takenFactions = lobby?.players
    .filter(p => p.faction)
    .map(p => p.faction) || []
  
  if (!lobby) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lcars-orange text-xl">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen p-8">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-lcars-orange">GAME LOBBY</h1>
        <div className="text-lcars-blue text-2xl mt-2 tracking-widest">
          CODE: {lobbyId}
        </div>
        <p className="text-gray-400 mt-2">Share this code with your friends</p>
      </div>
      
      {error && (
        <div className="max-w-2xl mx-auto bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
        {/* Faction Selection */}
        <div className="lcars-panel">
          <h2 className="lcars-header mb-4">Select Faction</h2>
          
          <div className="space-y-2">
            {FACTIONS.map(faction => {
              const taken = takenFactions.includes(faction.id)
              const isMine = selectedFaction === faction.id
              const takenBy = lobby.players.find(p => p.faction === faction.id)?.name
              
              return (
                <button
                  key={faction.id}
                  onClick={() => !taken || isMine ? handleSelectFaction(isMine ? null : faction.id) : null}
                  disabled={taken && !isMine}
                  className={`w-full p-3 rounded border-2 text-left transition-all
                    ${isMine 
                      ? 'border-white bg-white/10' 
                      : taken 
                        ? 'border-gray-600 opacity-50 cursor-not-allowed'
                        : 'border-gray-600 hover:border-white'
                    }`}
                  style={{ borderColor: isMine ? faction.color : undefined }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span 
                        className="font-bold"
                        style={{ color: faction.color }}
                      >
                        {faction.name}
                      </span>
                      <div className="text-sm text-gray-400">{faction.ability}</div>
                    </div>
                    {taken && (
                      <span className="text-sm text-gray-400">
                        {isMine ? '(You)' : takenBy}
                      </span>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Players */}
        <div className="lcars-panel">
          <h2 className="lcars-header mb-4">Players ({lobby.players.length}/7)</h2>
          
          <div className="space-y-2 mb-6">
            {lobby.players.map(player => {
              const faction = FACTIONS.find(f => f.id === player.faction)
              
              return (
                <div 
                  key={player.name}
                  className="flex items-center justify-between p-2 bg-space-dark rounded"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: faction?.color || '#666' }}
                    />
                    <span className={player.name === playerName ? 'text-lcars-tan' : ''}>
                      {player.name}
                      {player.name === lobby.host && ' (Host)'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {faction && (
                      <span 
                        className="text-sm"
                        style={{ color: faction.color }}
                      >
                        {faction.name}
                      </span>
                    )}
                    {player.ready && player.faction && (
                      <span className="text-green-400 text-sm">✓ Ready</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
          
          {/* Actions */}
          <div className="space-y-3">
            {selectedFaction && (
              <button
                onClick={handleToggleReady}
                className={`w-full py-3 rounded font-bold transition-colors
                  ${isReady 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-lcars-orange hover:bg-lcars-tan text-black'
                  }`}
              >
                {isReady ? '✓ READY' : 'MARK READY'}
              </button>
            )}
            
            {isHost && (
              <button
                onClick={handleStartGame}
                disabled={!canStart}
                className={`w-full py-3 rounded font-bold transition-colors
                  ${canStart 
                    ? 'bg-lcars-blue hover:bg-blue-400 text-black' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  }`}
              >
                {canStart ? 'START GAME' : 'Waiting for players...'}
              </button>
            )}
          </div>
          
          {!isHost && (
            <p className="text-center text-gray-400 text-sm mt-4">
              Waiting for host to start the game...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
