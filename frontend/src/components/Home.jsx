import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useAuth } from '@clerk/clerk-react'
import { useGameStore } from '../hooks/useGameStore'

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
    </div>
  )
}
