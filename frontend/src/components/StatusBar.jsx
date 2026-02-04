import { useState, useEffect } from 'react'
import { FACTION_COLORS, FACTION_NAMES } from '@star-trek-diplomacy/shared'

function DeadlineCountdown({ deadline }) {
  const [timeLeft, setTimeLeft] = useState('')

  useEffect(() => {
    const update = () => {
      const now = new Date()
      const end = new Date(deadline)
      const diff = end - now

      if (diff <= 0) {
        setTimeLeft('EXPIRED')
        return
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24))
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h`)
      } else {
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        setTimeLeft(`${hours}h ${mins}m`)
      }
    }

    update()
    const interval = setInterval(update, 60000) // Update every minute
    return () => clearInterval(interval)
  }, [deadline])

  const isExpired = timeLeft === 'EXPIRED'

  return (
    <span className={isExpired ? 'text-red-500 font-bold animate-pulse' : 'text-lcars-orange'}>
      {timeLeft}
    </span>
  )
}

export default function StatusBar({ gameState, myState, faction }) {
  const supplyCounts = gameState?.supplyCounts || {}
  const totalSC = Object.values(supplyCounts).reduce((sum, count) => sum + count, 0)
  
  // Sort factions by supply center count
  const sortedFactions = Object.entries(supplyCounts)
    .sort(([, a], [, b]) => b - a)
  
  // Get victory threshold (typically 51% of supply centers)
  const victoryThreshold = Math.ceil(totalSC / 2)
  
  return (
    <div className="bg-space-blue border-b-4 border-lcars-orange px-4 py-2" data-testid="status-bar">
      <div className="flex items-center justify-between">
        {/* Turn Info */}
        <div className="flex items-center gap-6">
          <div>
            <span className="text-gray-400 text-sm">Turn</span>
            <span className="text-white font-bold ml-2">{gameState?.turn || 1}</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Year</span>
            <span className="text-white font-bold ml-2">{gameState?.year || 2370}</span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Season</span>
            <span className="text-lcars-blue font-bold ml-2 uppercase">
              {gameState?.season || 'Spring'}
            </span>
          </div>
          <div>
            <span className="text-gray-400 text-sm">Phase</span>
            <span className="text-lcars-tan font-bold ml-2 uppercase">
              {gameState?.phase || 'Orders'}
            </span>
          </div>
          {/* Deadline Display */}
          {gameState?.turnDeadline && gameState?.phase === 'orders' && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">Deadline:</span>
              <DeadlineCountdown deadline={gameState.turnDeadline} />
            </div>
          )}
        </div>
        
        {/* Your Faction */}
        {faction && (
          <div 
            className="px-4 py-1 rounded-full font-bold shadow-lg"
            style={{ 
              backgroundColor: FACTION_COLORS[faction],
              color: faction === 'ferengi' || faction === 'breen' ? '#000' : '#fff'
            }}
          >
            {FACTION_NAMES[faction]}
          </div>
        )}
      </div>
      
      {/* Supply Center Scoreboard */}
      <div className="flex items-center gap-3 mt-2 overflow-x-auto pb-1">
        <span className="text-gray-500 text-xs shrink-0">
          Supply Centers (Victory at {victoryThreshold}):
        </span>
        {sortedFactions.map(([f, count], index) => {
          const isEliminated = gameState?.eliminated?.includes(f)
          const isKicked = gameState?.kickedPlayers?.includes(f)
          const isLeading = index === 0 && count > 0
          const nearVictory = count >= victoryThreshold - 3 && count < victoryThreshold

          return (
            <div
              key={f}
              className={`flex items-center gap-1.5 shrink-0 px-2 py-1 rounded transition-all ${
                f === faction ? 'ring-2 ring-white bg-white/10' : ''
              } ${isEliminated ? 'opacity-40' : ''} ${isKicked ? 'opacity-60' : ''} ${
                isLeading ? 'bg-yellow-500/20' : ''
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full ${isLeading ? 'ring-2 ring-yellow-400 shadow-lg' : ''}`}
                style={{ backgroundColor: FACTION_COLORS[f] }}
              />
              <span className="text-xs font-mono font-bold" style={{ color: FACTION_COLORS[f] }}>
                {FACTION_NAMES[f].substring(0, 3).toUpperCase()}
              </span>
              <span
                className={`text-sm font-bold ${
                  nearVictory ? 'text-yellow-400' : 'text-white'
                } ${isLeading ? 'text-yellow-300' : ''}`}
              >
                {count}
              </span>
              {isEliminated && <span className="text-red-400 text-xs">✗</span>}
              {isKicked && !isEliminated && <span className="text-orange-400 text-xs" title="Kicked">⏸</span>}
              {isLeading && !isEliminated && !isKicked && <span className="text-yellow-400 text-xs">👑</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}
