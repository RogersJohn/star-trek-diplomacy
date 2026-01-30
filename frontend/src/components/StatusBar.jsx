const FACTION_COLORS = {
  federation: '#3399ff',
  klingon: '#cc0000',
  romulan: '#006600',
  cardassian: '#996633',
  ferengi: '#ff9900',
  breen: '#66cccc',
  gorn: '#88aa33'
}

const FACTION_NAMES = {
  federation: 'Federation',
  klingon: 'Klingon',
  romulan: 'Romulan',
  cardassian: 'Cardassian',
  ferengi: 'Ferengi',
  breen: 'Breen',
  gorn: 'Gorn'
}

export default function StatusBar({ gameState, myState, faction }) {
  const supplyCounts = gameState?.supplyCounts || {}
  
  // Sort factions by supply center count
  const sortedFactions = Object.entries(supplyCounts)
    .sort(([, a], [, b]) => b - a)
  
  return (
    <div className="bg-space-blue border-b-4 border-lcars-orange px-4 py-2">
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
        </div>
        
        {/* Your Faction */}
        {faction && (
          <div 
            className="px-4 py-1 rounded-full font-bold"
            style={{ 
              backgroundColor: FACTION_COLORS[faction],
              color: faction === 'ferengi' ? '#000' : '#fff'
            }}
          >
            {FACTION_NAMES[faction]}
          </div>
        )}
      </div>
      
      {/* Supply Center Scoreboard */}
      <div className="flex items-center gap-4 mt-2 overflow-x-auto pb-1">
        <span className="text-gray-500 text-xs shrink-0">Supply Centers:</span>
        {sortedFactions.map(([f, count]) => (
          <div 
            key={f}
            className={`flex items-center gap-1 shrink-0 ${f === faction ? 'ring-1 ring-white rounded px-1' : ''}`}
          >
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: FACTION_COLORS[f] }}
            />
            <span className="text-sm" style={{ color: FACTION_COLORS[f] }}>
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
