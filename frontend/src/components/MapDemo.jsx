import { useState, useMemo, lazy, Suspense } from 'react'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES, ALL_EDGES, FACTION_COLORS } from '@star-trek-diplomacy/shared'
import {
  isEdgePosition, isOrbitPosition, isPlanetPosition,
  getPlanetFromOrbit, getOrbitPosition, parseEdgeId,
  getEdgesFromPlanet, getAdjacentEdges,
} from '../utils/edge-utils'

const Map3D = lazy(() => import('./map/Map3D'))

// Mock game state with units spread across the map
const MOCK_GAME_STATE = {
  phase: 'orders',
  turn: 3,
  year: 2371,
  season: 'spring',
  units: {
    // Federation armies + fleets
    earth: { faction: 'federation', type: 'army' },
    vulcan: { faction: 'federation', type: 'army' },
    andoria: { faction: 'federation', type: 'army' },
    'earth:orbit': { faction: 'federation', type: 'fleet' },
    'vulcan:orbit': { faction: 'federation', type: 'fleet' },

    // Klingon armies + fleets
    qonos: { faction: 'klingon', type: 'army' },
    narendra: { faction: 'klingon', type: 'army' },
    'qonos:orbit': { faction: 'klingon', type: 'fleet' },
    'tygokor:orbit': { faction: 'klingon', type: 'fleet' },
    'boreth:orbit': { faction: 'klingon', type: 'fleet' },

    // Romulan armies + fleets
    romulus: { faction: 'romulan', type: 'army' },
    remus: { faction: 'romulan', type: 'army' },
    'romulus:orbit': { faction: 'romulan', type: 'fleet' },
    'rator:orbit': { faction: 'romulan', type: 'fleet' },

    // Cardassian armies + fleets
    cardassia: { faction: 'cardassian', type: 'army' },
    chintoka: { faction: 'cardassian', type: 'army' },
    septimus: { faction: 'cardassian', type: 'army' },
    'cardassia:orbit': { faction: 'cardassian', type: 'fleet' },
    'kelvas:orbit': { faction: 'cardassian', type: 'fleet' },

    // Ferengi
    ferenginar: { faction: 'ferengi', type: 'army' },
    volchok: { faction: 'ferengi', type: 'army' },
    'ferenginar:orbit': { faction: 'ferengi', type: 'fleet' },

    // Breen
    breen: { faction: 'breen', type: 'army' },
    portas: { faction: 'breen', type: 'army' },
    'breen:orbit': { faction: 'breen', type: 'fleet' },
    'dozaria:orbit': { faction: 'breen', type: 'fleet' },

    // Gorn
    gornar: { faction: 'gorn', type: 'army' },
    ssgaron: { faction: 'gorn', type: 'army' },
    seudath: { faction: 'gorn', type: 'army' },
    'gornar:orbit': { faction: 'gorn', type: 'fleet' },
    'gorn_fortress:orbit': { faction: 'gorn', type: 'fleet' },

    // Some fleets on hyperlanes (edges)
    [createEdgeId('bajor', 'cardassia')]: [
      { faction: 'cardassian', type: 'fleet' },
    ],
    [createEdgeId('khitomer', 'neutral_zone_east')]: [
      { faction: 'klingon', type: 'fleet' },
    ],
  },
  ownership: {},
}

// Build ownership from SYSTEMS faction data
Object.entries(SYSTEMS).forEach(([id, sys]) => {
  if (sys.supply) {
    if (sys.faction !== 'neutral' && sys.faction !== 'deepspace') {
      MOCK_GAME_STATE.ownership[id] = sys.faction
    } else {
      MOCK_GAME_STATE.ownership[id] = null
    }
  }
})
// Give Cardassians Bajor for visual interest
MOCK_GAME_STATE.ownership['bajor'] = 'cardassian'

function createEdgeId(a, b) {
  return [a, b].sort().join('~')
}

export default function MapDemo() {
  const [selectedUnit, setSelectedUnit] = useState(null)
  const [viewFaction, setViewFaction] = useState('federation')

  const adjacencies = useMemo(() => {
    const adj = {}
    Object.keys(SYSTEMS).forEach(id => { adj[id] = [] })
    HYPERLANES.forEach(([a, b]) => {
      if (adj[a] && adj[b]) {
        if (!adj[a].includes(b)) adj[a].push(b)
        if (!adj[b].includes(a)) adj[b].push(a)
      }
    })
    VERTICAL_LANES.forEach(({ from, to }) => {
      if (adj[from] && adj[to]) {
        if (!adj[from].includes(to)) adj[from].push(to)
        if (!adj[to].includes(from)) adj[to].push(from)
      }
    })
    return adj
  }, [])

  const { planetToEdges, edgeAdjacency } = useMemo(() => {
    const p2e = {}
    Object.keys(SYSTEMS).forEach(id => {
      p2e[id] = getEdgesFromPlanet(id, ALL_EDGES)
    })
    const eAdj = {}
    ALL_EDGES.forEach(edgeId => {
      eAdj[edgeId] = getAdjacentEdges(edgeId, ALL_EDGES)
    })
    return { planetToEdges: p2e, edgeAdjacency: eAdj }
  }, [])

  const getUnitAt = (position) => {
    const val = MOCK_GAME_STATE.units[position]
    if (!val) return null
    if (Array.isArray(val)) return val.length > 0 ? val : null
    return val
  }

  const getSelectedUnitInfo = () => {
    if (!selectedUnit) return null
    const unitData = getUnitAt(selectedUnit)
    if (!unitData) return null
    if (Array.isArray(unitData)) {
      const ours = unitData.find(u => u.faction === viewFaction)
      return ours ? { ...ours, position: selectedUnit } : null
    }
    if (unitData.faction === viewFaction) return { ...unitData, position: selectedUnit }
    return null
  }

  const validDestinations = useMemo(() => {
    if (!selectedUnit) return []
    const unitInfo = getSelectedUnitInfo()
    if (!unitInfo) return []
    const { type, position } = unitInfo
    const destinations = []
    if (type === 'army' && isPlanetPosition(position)) {
      destinations.push(...(adjacencies[position] || []))
    } else if (type === 'fleet' && isOrbitPosition(position)) {
      const planet = getPlanetFromOrbit(position)
      destinations.push(...(planetToEdges[planet] || []))
    } else if (type === 'fleet' && isEdgePosition(position)) {
      destinations.push(...(edgeAdjacency[position] || []))
      const [a, b] = parseEdgeId(position)
      destinations.push(getOrbitPosition(a), getOrbitPosition(b))
    }
    return destinations
  }, [selectedUnit, viewFaction])

  const handlePositionClick = (positionId) => {
    const unitAtClick = getUnitAt(positionId)
    if (unitAtClick && !Array.isArray(unitAtClick) && unitAtClick.faction === viewFaction) {
      setSelectedUnit(positionId)
    } else if (Array.isArray(unitAtClick) && unitAtClick.some(u => u.faction === viewFaction)) {
      setSelectedUnit(positionId)
    } else {
      setSelectedUnit(positionId === selectedUnit ? null : null)
    }
  }

  const factions = ['federation', 'klingon', 'romulan', 'cardassian', 'ferengi', 'breen', 'gorn']

  return (
    <div className="w-screen h-screen bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <h1 className="text-lg font-bold text-orange-400">
          3D Map Demo — Star Trek Diplomacy
        </h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">View as:</span>
          {factions.map(f => (
            <button
              key={f}
              onClick={() => { setViewFaction(f); setSelectedUnit(null) }}
              className={`px-2 py-1 text-xs rounded capitalize ${
                viewFaction === f
                  ? 'ring-2 ring-white'
                  : 'opacity-60 hover:opacity-100'
              }`}
              style={{ backgroundColor: FACTION_COLORS[f], color: '#fff' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Loading 3D map...
          </div>
        }>
          <Map3D
            gameState={MOCK_GAME_STATE}
            faction={viewFaction}
            selectedUnit={selectedUnit}
            validDestinations={validDestinations}
            pendingOrders={[]}
            onPositionClick={handlePositionClick}
          />
        </Suspense>

        {/* Info panel */}
        <div className="absolute bottom-4 left-4 bg-black/80 border border-gray-600 rounded px-4 py-3 text-sm text-gray-300 max-w-sm">
          <div className="text-orange-400 font-bold mb-1">Controls</div>
          <div>Left drag: rotate | Scroll: zoom | Right drag: pan</div>
          <div className="mt-1">Click a planet to highlight its connections. Toggle layers (L1/L2/L3) top-left.</div>
          {selectedUnit && (
            <div className="mt-2 text-white">
              <span className="text-orange-400">Selected:</span> {selectedUnit}
              {validDestinations.length > 0 && (
                <div className="text-green-400 text-xs mt-1">
                  {validDestinations.length} valid destinations highlighted
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
