import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useGameStore, setAuthTokenGetter } from '../hooks/useGameStore'

const API_URL = import.meta.env.VITE_API_URL || ''

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
  const { user } = useUser()
  const { getToken } = useAuth()
  const { playerName, connect, socket } = useGameStore()

  const [lobby, setLobby] = useState(null)
  const [selectedFaction, setSelectedFaction] = useState(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState('')
  const [turnTimerDays, setTurnTimerDays] = useState(3)

  const getAuthHeaders = async () => {
    const token = await getToken()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  useEffect(() => {
    // Set up auth token getter for the store
    setAuthTokenGetter(getToken)
    connect()
    fetchLobby()

    return () => {
      // Cleanup
    }
  }, [lobbyId, getToken])
  
  useEffect(() => {
    if (socket) {
      socket.emit('join_lobby', lobbyId)

      socket.on('player_joined', fetchLobby)
      socket.on('player_left', fetchLobby)
      socket.on('faction_selected', fetchLobby)
      socket.on('player_ready_changed', fetchLobby)
      socket.on('settings_updated', fetchLobby)
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
        socket.off('settings_updated')
        socket.off('game_started')
      }
    }
  }, [socket, selectedFaction, navigate, lobbyId])
  
  const fetchLobby = async () => {
    try {
      const res = await fetch(`${API_URL}/api/lobby/${lobbyId}`)
      const data = await res.json()

      if (data.error) {
        setError(data.error)
      } else {
        setLobby(data)

        // Find my current selection by Clerk user ID
        const me = data.players.find(p => p.userId === user?.id)
        if (me) {
          setSelectedFaction(me.faction)
          setIsReady(me.ready)
        }

        // Update turn timer from lobby settings
        if (data.settings?.turnTimerDays) {
          setTurnTimerDays(data.settings.turnTimerDays)
        }
      }
    } catch (err) {
      setError('Failed to load lobby')
    }
  }
  
  const handleSelectFaction = async (factionId) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/lobby/${lobbyId}/select-faction`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ faction: factionId })
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
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/lobby/${lobbyId}/ready`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ ready: !isReady })
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
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/lobby/${lobbyId}/start`, {
        method: 'POST',
        headers,
      })

      const data = await res.json()
      if (!data.success) {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to start game')
    }
  }

  const handleUpdateSettings = async (newSettings) => {
    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`${API_URL}/api/lobby/${lobbyId}/settings`, {
        method: 'POST',
        headers,
        body: JSON.stringify(newSettings)
      })

      const data = await res.json()
      if (data.success) {
        if (newSettings.turnTimerDays) {
          setTurnTimerDays(newSettings.turnTimerDays)
        }
      } else {
        setError(data.error)
      }
    } catch (err) {
      setError('Failed to update settings')
    }
  }
  
  const isHost = lobby?.hostUserId === user?.id
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
                    <span className={player.userId === user?.id ? 'text-lcars-tan' : ''}>
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
          
          {/* Game Settings (Host Only) */}
          {isHost && lobby.status === 'waiting' && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <h3 className="text-lcars-tan text-sm font-bold mb-2">Game Settings</h3>
              <label className="block text-gray-400 text-xs mb-1">
                Turn Timer (days per turn)
              </label>
              <select
                value={turnTimerDays}
                onChange={(e) => handleUpdateSettings({ turnTimerDays: parseInt(e.target.value) })}
                className="w-full bg-space-dark text-white border border-lcars-orange rounded px-3 py-2 text-sm"
              >
                <option value="1">1 day</option>
                <option value="2">2 days</option>
                <option value="3">3 days (default)</option>
                <option value="5">5 days</option>
                <option value="7">7 days</option>
                <option value="0">No timer</option>
              </select>
              <p className="text-gray-500 text-xs mt-1">
                Players who miss the deadline can be voted to kick
              </p>
            </div>
          )}

          {/* Show current timer setting (non-host) */}
          {!isHost && lobby.settings?.turnTimerDays > 0 && (
            <div className="mb-4 p-3 bg-gray-800 rounded-lg border border-gray-700">
              <span className="text-gray-400 text-xs">Turn Timer: </span>
              <span className="text-lcars-orange text-sm font-bold">
                {lobby.settings.turnTimerDays} day{lobby.settings.turnTimerDays !== 1 ? 's' : ''} per turn
              </span>
            </div>
          )}

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
