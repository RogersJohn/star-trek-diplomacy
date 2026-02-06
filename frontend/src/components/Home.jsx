import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useGameStore } from '../hooks/useGameStore'

const IS_DEV = import.meta.env.DEV

const FACTIONS = [
  { id: 'federation', name: 'United Federation of Planets', color: 'federation' },
  { id: 'klingon', name: 'Klingon Empire', color: 'klingon' },
  { id: 'romulan', name: 'Romulan Star Empire', color: 'romulan' },
  { id: 'cardassian', name: 'Cardassian Union', color: 'cardassian' },
  { id: 'ferengi', name: 'Ferengi Alliance', color: 'ferengi' },
  { id: 'breen', name: 'Breen Confederacy', color: 'breen' },
  { id: 'gorn', name: 'Gorn Hegemony', color: 'gorn' },
]

export default function Home() {
  const navigate = useNavigate()
  const { user } = useUser()
  const { getToken } = useAuth()
  const { playerName, setPlayerName } = useGameStore()
  const [name, setName] = useState(playerName || user?.firstName || user?.username || '')
  const [joinCode, setJoinCode] = useState('')
  const [error, setError] = useState('')

  // Dev tools state
  const [devGameId, setDevGameId] = useState('')
  const [devFaction, setDevFaction] = useState('federation')
  const [devStatus, setDevStatus] = useState('')
  const [devLoading, setDevLoading] = useState(false)

  const getAuthHeaders = async () => {
    const token = await getToken()
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    }
  }

  const handleCreateLobby = async () => {
    const displayName = name.trim() || user?.firstName || user?.username || 'Player'

    setPlayerName(displayName)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch('/api/lobby/create', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          hostName: displayName,
        }),
      })

      const data = await res.json()

      if (data.success) {
        navigate(`/lobby/${data.lobby.id}`)
      } else {
        setError(data.error || 'Failed to create lobby')
      }
    } catch (err) {
      setError('Connection failed')
    }
  }

  const handleJoinLobby = async () => {
    const displayName = name.trim() || user?.firstName || user?.username || 'Player'

    if (!joinCode.trim()) {
      setError('Please enter a lobby code')
      return
    }

    setPlayerName(displayName)

    try {
      const headers = await getAuthHeaders()
      const res = await fetch(`/api/lobby/${joinCode}/join`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          playerName: displayName,
        }),
      })

      const data = await res.json()

      if (data.success) {
        navigate(`/lobby/${joinCode}`)
      } else {
        setError(data.error || 'Failed to join lobby')
      }
    } catch (err) {
      setError('Connection failed')
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      {/* Title */}
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold text-lcars-orange mb-2">
          STAR TREK
        </h1>
        <h2 className="text-4xl font-bold text-lcars-blue">
          DIPLOMACY
        </h2>
        <p className="text-gray-400 mt-4">
          A game of galactic negotiation and betrayal
        </p>
      </div>

      {/* Main Panel */}
      <div className="lcars-panel max-w-md w-full">
        <h3 className="lcars-header mb-6">Enter the Quadrant</h3>

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-2 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-lcars-tan text-sm mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Captain..."
              className="w-full bg-space-dark border-2 border-lcars-orange rounded px-4 py-2
                       text-white focus:outline-none focus:border-lcars-tan"
            />
          </div>

          <button
            onClick={handleCreateLobby}
            className="lcars-button w-full"
          >
            CREATE NEW GAME
          </button>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-lcars-orange/30"></div>
            <span className="text-lcars-orange/50 text-sm">OR</span>
            <div className="flex-1 h-px bg-lcars-orange/30"></div>
          </div>

          <div>
            <label className="block text-lcars-tan text-sm mb-1">Lobby Code</label>
            <input
              type="text"
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="ABC123"
              maxLength={6}
              className="w-full bg-space-dark border-2 border-lcars-blue rounded px-4 py-2
                       text-white uppercase tracking-widest text-center text-xl
                       focus:outline-none focus:border-lcars-tan"
            />
          </div>

          <button
            onClick={handleJoinLobby}
            className="lcars-button-blue w-full"
          >
            JOIN GAME
          </button>
        </div>
      </div>

      {/* Faction Preview */}
      <div className="mt-12 text-center">
        <h3 className="text-lcars-tan text-sm mb-4">7 PLAYABLE FACTIONS</h3>
        <div className="flex flex-wrap justify-center gap-4">
          {FACTIONS.map(f => (
            <div
              key={f.id}
              className={`faction-${f.color} text-sm font-bold px-3 py-1
                         border-2 border-current rounded-full opacity-70`}
            >
              {f.name}
            </div>
          ))}
        </div>
      </div>

      {/* Dev Tools - only visible in development */}
      {IS_DEV && (
        <div className="mt-12 w-full max-w-md">
          <div className="border-2 border-yellow-600 rounded-lg p-4 bg-yellow-900/20">
            <h3 className="text-yellow-400 font-bold text-sm mb-3">DEV TOOLS</h3>

            {devStatus && (
              <div className="text-yellow-200 text-xs bg-yellow-900/40 rounded px-3 py-2 mb-3 break-all">
                {devStatus}
              </div>
            )}

            {/* Step 1: Create test game */}
            <button
              onClick={async () => {
                setDevLoading(true)
                setDevStatus('')
                try {
                  const res = await fetch('/api/test/create-game', { method: 'POST' })
                  const data = await res.json()
                  if (data.success) {
                    setDevGameId(data.gameId)
                    setDevStatus(`Game created: ${data.gameId}`)
                  } else {
                    setDevStatus(`Error: ${data.error}`)
                  }
                } catch (err) {
                  setDevStatus(`Error: ${err.message}`)
                } finally {
                  setDevLoading(false)
                }
              }}
              disabled={devLoading}
              className="w-full mb-3 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-black font-bold rounded text-sm disabled:opacity-50"
            >
              1. CREATE TEST GAME
            </button>

            {/* Step 2: Pick faction */}
            {devGameId && (
              <>
                <div className="mb-3">
                  <label className="block text-yellow-400 text-xs mb-1">Faction</label>
                  <select
                    value={devFaction}
                    onChange={e => setDevFaction(e.target.value)}
                    className="w-full bg-space-dark border border-yellow-600 rounded px-3 py-2 text-white text-sm"
                  >
                    {FACTIONS.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* Step 3: Join as that faction */}
                <button
                  onClick={async () => {
                    setDevLoading(true)
                    setDevStatus('')
                    try {
                      const token = await getToken()
                      const res = await fetch(`/api/test/game/${devGameId}/join`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${token}`,
                        },
                        body: JSON.stringify({ faction: devFaction }),
                      })
                      const data = await res.json()
                      if (data.success) {
                        setDevStatus(`Joined as ${devFaction}. Ready to enter game.`)
                      } else {
                        setDevStatus(`Error: ${data.error}`)
                      }
                    } catch (err) {
                      setDevStatus(`Error: ${err.message}`)
                    } finally {
                      setDevLoading(false)
                    }
                  }}
                  disabled={devLoading}
                  className="w-full mb-3 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 text-black font-bold rounded text-sm disabled:opacity-50"
                >
                  2. JOIN AS {devFaction.toUpperCase()}
                </button>

                {/* Step 4: Enter game */}
                <button
                  onClick={() => navigate(`/game/${devGameId}`)}
                  className="w-full mb-3 px-4 py-2 bg-green-700 hover:bg-green-600 text-white font-bold rounded text-sm"
                >
                  3. ENTER GAME
                </button>

                {/* Game ID display for curl commands */}
                <div className="text-gray-400 text-xs mt-2">
                  Game ID: <code className="text-yellow-300">{devGameId}</code>
                </div>
                <div className="text-gray-500 text-xs mt-1">
                  Auto-hold AI: <code>curl -X POST localhost:3000/api/test/game/{devGameId}/auto-orders -H "Content-Type: application/json" -d {`'{"exceptFaction":"${devFaction}"}'`}</code>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
