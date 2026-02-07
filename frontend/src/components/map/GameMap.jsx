import { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react'
import { useGameStore } from '../../hooks/useGameStore'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES, ALL_EDGES, FACTION_COLORS } from '@star-trek-diplomacy/shared'
import {
  isEdgePosition, isOrbitPosition, isPlanetPosition,
  getPlanetFromOrbit, getOrbitPosition, parseEdgeId,
  getEdgesFromPlanet, getAdjacentEdges,
} from '../../utils/edge-utils'
import { formatPosition } from '../../utils/position-display'

const Map3D = lazy(() => import('./Map3D'))

export default function GameMap({ gameState, faction }) {
  const { selectedUnit, selectUnit, addOrder, pendingOrders, clearOrders } = useGameStore()
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [viewMode, setViewMode] = useState('2d')
  const [orderMode, setOrderMode] = useState('move') // 'move', 'support', 'hold', 'convoy'
  const [supportTarget, setSupportTarget] = useState(null)
  const [convoyFrom, setConvoyFrom] = useState(null)

  // Build planet adjacency map
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

  // Build edge adjacency lookups
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

  // Calculate map bounds for 2D view (core layer only)
  const mapBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    Object.values(SYSTEMS).forEach(sys => {
      if (sys.layer === 2) {
        minX = Math.min(minX, sys.x); maxX = Math.max(maxX, sys.x)
        minZ = Math.min(minZ, sys.z); maxZ = Math.max(maxZ, sys.z)
      }
    })
    return { minX, maxX, minZ, maxZ }
  }, [])

  const toScreen = (x, z) => {
    const padding = 50, width = 800, height = 600
    const scaleX = (width - padding * 2) / (mapBounds.maxX - mapBounds.minX)
    const scaleZ = (height - padding * 2) / (mapBounds.maxZ - mapBounds.minZ)
    const scale = Math.min(scaleX, scaleZ)
    return {
      x: padding + (x - mapBounds.minX) * scale,
      y: padding + (z - mapBounds.minZ) * scale,
    }
  }

  const getSystemColor = (systemId) => {
    const owner = gameState?.ownership?.[systemId]
    if (owner) return FACTION_COLORS[owner]
    if (SYSTEMS[systemId]?.supply) return '#888888'
    return '#333333'
  }

  // Get unit at any position (planet, orbit, or edge)
  const getUnitAt = (position) => {
    const val = gameState?.units?.[position]
    if (!val) return null
    if (Array.isArray(val)) return val.length > 0 ? val : null
    return val
  }

  // Get the unit type and position type for a selected position
  const getSelectedUnitInfo = () => {
    if (!selectedUnit) return null
    const unitData = getUnitAt(selectedUnit)
    if (!unitData) return null
    // For edge positions, find our faction's fleet
    if (Array.isArray(unitData)) {
      const ours = unitData.find(u => u.faction === faction)
      return ours ? { ...ours, position: selectedUnit } : null
    }
    if (unitData.faction === faction) return { ...unitData, position: selectedUnit }
    return null
  }

  // Get valid destinations for the selected unit based on v2 rules
  const getValidDestinations = () => {
    if (!selectedUnit) return []
    const unitInfo = getSelectedUnitInfo()
    if (!unitInfo) return []

    const { type, position } = unitInfo
    const destinations = []

    if (type === 'army' && isPlanetPosition(position)) {
      // Army on planet -> adjacent planets
      destinations.push(...(adjacencies[position] || []))
    } else if (type === 'fleet' && isOrbitPosition(position)) {
      // Fleet in orbit -> edges connected to that planet
      const planet = getPlanetFromOrbit(position)
      destinations.push(...(planetToEdges[planet] || []))
    } else if (type === 'fleet' && isEdgePosition(position)) {
      // Fleet on edge -> adjacent edges + endpoint orbits
      destinations.push(...(edgeAdjacency[position] || []))
      const [a, b] = parseEdgeId(position)
      destinations.push(getOrbitPosition(a), getOrbitPosition(b))
    }

    return destinations
  }

  const validDestinations = useMemo(() => getValidDestinations(), [selectedUnit, gameState])

  const isValidDestination = (positionId) => validDestinations.includes(positionId)

  // Clear state on phase change
  const prevPhaseRef = useRef(gameState?.phase)
  useEffect(() => {
    if (gameState?.phase && gameState.phase !== prevPhaseRef.current) {
      prevPhaseRef.current = gameState.phase
      clearOrders()
      selectUnit(null)
      setSupportTarget(null)
      setConvoyFrom(null)
      setOrderMode('move')
    }
  }, [gameState?.phase])

  // Unified position click handler for both 2D and 3D views
  const handlePositionClick = (positionId) => {
    if (gameState?.phase !== 'orders') return

    if (orderMode === 'convoy') {
      handleConvoyClick(positionId)
      return
    }

    if (orderMode === 'support') {
      handleSupportClick(positionId)
      return
    }

    // Move mode
    if (selectedUnit) {
      if (positionId !== selectedUnit && isValidDestination(positionId)) {
        addOrder({
          type: 'move',
          location: selectedUnit,
          destination: positionId,
        })
        selectUnit(null)
      } else {
        // Clicked something else - try to select it
        const unitAtClick = getUnitAt(positionId)
        if (unitAtClick && !Array.isArray(unitAtClick) && unitAtClick.faction === faction) {
          selectUnit(positionId)
        } else if (Array.isArray(unitAtClick) && unitAtClick.some(u => u.faction === faction)) {
          selectUnit(positionId)
        } else {
          selectUnit(null)
        }
      }
    } else {
      // No selection - try to select our unit
      const unitAtClick = getUnitAt(positionId)
      if (unitAtClick && !Array.isArray(unitAtClick) && unitAtClick.faction === faction) {
        selectUnit(positionId)
      } else if (Array.isArray(unitAtClick) && unitAtClick.some(u => u.faction === faction)) {
        selectUnit(positionId)
      }
    }
  }

  const handleSupportClick = (positionId) => {
    if (!selectedUnit) {
      // First click: select supporting unit
      const unitAtClick = getUnitAt(positionId)
      const isOurs = unitAtClick && (
        (!Array.isArray(unitAtClick) && unitAtClick.faction === faction) ||
        (Array.isArray(unitAtClick) && unitAtClick.some(u => u.faction === faction))
      )
      if (isOurs) {
        selectUnit(positionId)
      }
    } else if (!supportTarget) {
      // Second click: select unit being supported
      const unitAtTarget = getUnitAt(positionId)
      if (unitAtTarget) {
        setSupportTarget(positionId)
      }
    } else {
      // Third click: select destination
      addOrder({
        type: 'support',
        location: selectedUnit,
        target: supportTarget,
        destination: positionId,
      })
      selectUnit(null)
      setSupportTarget(null)
      setOrderMode('move')
    }
  }

  const handleConvoyClick = (positionId) => {
    if (!selectedUnit) {
      // First click: select fleet on edge
      const unitAtClick = getUnitAt(positionId)
      const isOurFleetOnEdge = isEdgePosition(positionId) &&
        Array.isArray(unitAtClick) &&
        unitAtClick.some(u => u.faction === faction && u.type === 'fleet')
      if (isOurFleetOnEdge) {
        selectUnit(positionId)
      }
    } else if (!convoyFrom) {
      // Second click: select army's planet (convoyFrom)
      if (isPlanetPosition(positionId)) {
        setConvoyFrom(positionId)
      }
    } else {
      // Third click: select destination planet (convoyTo)
      if (isPlanetPosition(positionId)) {
        addOrder({
          type: 'convoy',
          location: selectedUnit,
          convoyFrom,
          convoyTo: positionId,
        })
        selectUnit(null)
        setConvoyFrom(null)
        setOrderMode('move')
      }
    }
  }

  const handleHold = () => {
    if (selectedUnit) {
      addOrder({ type: 'hold', location: selectedUnit })
      selectUnit(null)
    }
  }

  const getPendingOrder = (positionId) => {
    return pendingOrders?.find(order => order.location === positionId)
  }

  // 2D: core layer only
  const coreSystems = Object.entries(SYSTEMS).filter(([_, sys]) => sys.layer === 2)
  const coreHyperlanes = HYPERLANES.filter(([a, b]) => {
    return SYSTEMS[a]?.layer === 2 && SYSTEMS[b]?.layer === 2
  })

  return (
    <div className="map-container relative w-full h-full" data-testid="game-map">
      {/* View Mode Toggle */}
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button
          onClick={() => setViewMode('2d')}
          className={`px-3 py-1 rounded ${viewMode === '2d' ? 'bg-lcars-orange text-black' : 'bg-gray-700'}`}
        >
          2D
        </button>
        <button
          onClick={() => setViewMode('3d')}
          className={`px-3 py-1 rounded ${viewMode === '3d' ? 'bg-lcars-orange text-black' : 'bg-gray-700'}`}
        >
          3D
        </button>
      </div>

      {/* Order Mode Controls */}
      {selectedUnit && (
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <button
            onClick={() => { setOrderMode('move'); setSupportTarget(null); setConvoyFrom(null) }}
            className={`px-3 py-1 rounded ${orderMode === 'move' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            Move
          </button>
          <button
            onClick={() => { setOrderMode('support'); setSupportTarget(null); setConvoyFrom(null) }}
            className={`px-3 py-1 rounded ${orderMode === 'support' ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            Support
          </button>
          {/* Convoy button: only for fleet on edge */}
          {isEdgePosition(selectedUnit) && (
            <button
              onClick={() => { setOrderMode('convoy'); setSupportTarget(null); setConvoyFrom(null) }}
              className={`px-3 py-1 rounded ${orderMode === 'convoy' ? 'bg-purple-500' : 'bg-gray-700'}`}
            >
              Convoy
            </button>
          )}
          <button
            onClick={handleHold}
            className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500"
          >
            Hold
          </button>
          <button
            onClick={() => {
              selectUnit(null)
              setSupportTarget(null)
              setConvoyFrom(null)
              setOrderMode('move')
            }}
            className="px-3 py-1 rounded bg-red-700 hover:bg-red-600"
          >
            Cancel
          </button>
        </div>
      )}

      {/* 2D SVG Map */}
      {viewMode === '2d' && (
        <svg
          viewBox="0 0 800 600"
          className="w-full h-full"
          style={{ background: '#0a0a12' }}
        >
          {/* Hyperlanes */}
          {coreHyperlanes.map(([a, b], i) => {
            const sysA = SYSTEMS[a]
            const sysB = SYSTEMS[b]
            if (!sysA || !sysB) return null
            const posA = toScreen(sysA.x, sysA.z)
            const posB = toScreen(sysB.x, sysB.z)
            const edgeId = [a, b].sort().join('~')
            const edgeValid = isValidDestination(edgeId)
            const fleetsOnEdge = gameState?.units?.[edgeId]

            return (
              <g key={`lane-${i}`}>
                <line
                  x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
                  stroke={edgeValid ? '#4ade80' : '#334'}
                  strokeWidth={edgeValid ? 2 : 1}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePositionClick(edgeId)}
                />
                {/* Fleet indicators on edges */}
                {Array.isArray(fleetsOnEdge) && fleetsOnEdge.map((fleet, fi) => {
                  const mx = (posA.x + posB.x) / 2 + (fi === 1 ? 8 : 0)
                  const my = (posA.y + posB.y) / 2 + (fi === 1 ? 8 : 0)
                  return (
                    <g key={`edge-fleet-${fi}`} onClick={() => handlePositionClick(edgeId)} style={{ cursor: 'pointer' }}>
                      <circle cx={mx} cy={my} r={6} fill={FACTION_COLORS[fleet.faction]} stroke="#fff" strokeWidth={0.5} />
                      <text x={mx} y={my + 3} textAnchor="middle" fontSize="7" fill="#fff" fontWeight="bold">F</text>
                    </g>
                  )
                })}
              </g>
            )
          })}

          {/* Systems */}
          {coreSystems.map(([id, system]) => {
            const pos = toScreen(system.x, system.z)
            const unit = getUnitAt(id)
            const orbitUnit = getUnitAt(id + ':orbit')
            const color = getSystemColor(id)
            const isSelected = selectedUnit === id || selectedUnit === id + ':orbit'
            const isHovered = hoveredSystem === id
            const isValid = isValidDestination(id)
            const isOrbitValid = isValidDestination(id + ':orbit')
            const pendingOrder = getPendingOrder(id) || getPendingOrder(id + ':orbit')

            return (
              <g
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onMouseEnter={() => setHoveredSystem(id)}
                onMouseLeave={() => setHoveredSystem(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Valid destination highlight */}
                {isValid && (
                  <circle r={16} fill="none" stroke="#4ade80" strokeWidth={2} opacity={0.6}
                    onClick={() => handlePositionClick(id)} />
                )}

                {/* Orbit valid destination */}
                {isOrbitValid && (
                  <circle r={20} fill="none" stroke="#4ade80" strokeWidth={1} strokeDasharray="3,3" opacity={0.6}
                    onClick={() => handlePositionClick(id + ':orbit')} />
                )}

                {/* Supply center indicator */}
                {system.supply && (
                  <circle r={isSelected ? 14 : 10} fill={color} opacity={0.3}
                    onClick={() => handlePositionClick(id)} />
                )}

                {/* System node */}
                <circle
                  r={system.supply ? 6 : 3} fill={color}
                  stroke={isSelected ? '#fff' : isHovered ? '#aaa' : 'none'}
                  strokeWidth={2}
                  onClick={() => handlePositionClick(id)}
                />

                {/* Army on planet */}
                {unit && !Array.isArray(unit) && unit.type === 'army' && (
                  <g onClick={() => handlePositionClick(id)}>
                    <circle r={8} fill={FACTION_COLORS[unit.faction]} stroke="#fff" strokeWidth={1} />
                    <text textAnchor="middle" dy="3" fontSize="8" fill="#fff" fontWeight="bold">A</text>
                  </g>
                )}

                {/* Fleet in orbit (triangle offset from planet) */}
                {orbitUnit && !Array.isArray(orbitUnit) && orbitUnit.type === 'fleet' && (
                  <g transform="translate(14, -6)" onClick={() => handlePositionClick(id + ':orbit')}>
                    <polygon points="0,-6 5,4 -5,4" fill={FACTION_COLORS[orbitUnit.faction]} stroke="#fff" strokeWidth={0.5} />
                    <text textAnchor="middle" dy="2" fontSize="6" fill="#fff" fontWeight="bold">F</text>
                  </g>
                )}

                {/* Pending order indicator */}
                {pendingOrder && (
                  <circle r={12} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="2,2" />
                )}

                {/* System name */}
                {(isHovered || isSelected) && (
                  <text y={-20} textAnchor="middle" fontSize="10" fill="#fff" className="pointer-events-none">
                    {system.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Pending order arrows */}
          {pendingOrders?.map((order, i) => {
            if (order.type === 'move' && order.destination) {
              const fromId = isPlanetPosition(order.location) ? order.location : isOrbitPosition(order.location) ? getPlanetFromOrbit(order.location) : null
              const toId = isPlanetPosition(order.destination) ? order.destination : isOrbitPosition(order.destination) ? getPlanetFromOrbit(order.destination) : null

              // For edge positions, use midpoint of endpoints
              let posFrom, posTo
              if (fromId && SYSTEMS[fromId]?.layer === 2) {
                posFrom = toScreen(SYSTEMS[fromId].x, SYSTEMS[fromId].z)
              } else if (isEdgePosition(order.location)) {
                const [a, b] = parseEdgeId(order.location)
                if (SYSTEMS[a]?.layer === 2 && SYSTEMS[b]?.layer === 2) {
                  const pa = toScreen(SYSTEMS[a].x, SYSTEMS[a].z)
                  const pb = toScreen(SYSTEMS[b].x, SYSTEMS[b].z)
                  posFrom = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
                }
              }

              if (toId && SYSTEMS[toId]?.layer === 2) {
                posTo = toScreen(SYSTEMS[toId].x, SYSTEMS[toId].z)
              } else if (isEdgePosition(order.destination)) {
                const [a, b] = parseEdgeId(order.destination)
                if (SYSTEMS[a]?.layer === 2 && SYSTEMS[b]?.layer === 2) {
                  const pa = toScreen(SYSTEMS[a].x, SYSTEMS[a].z)
                  const pb = toScreen(SYSTEMS[b].x, SYSTEMS[b].z)
                  posTo = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 }
                }
              }

              if (!posFrom || !posTo) return null
              const dx = posTo.x - posFrom.x
              const dy = posTo.y - posFrom.y
              const angle = Math.atan2(dy, dx)

              return (
                <line
                  key={`order-${i}`}
                  x1={posFrom.x} y1={posFrom.y}
                  x2={posTo.x - Math.cos(angle) * 15}
                  y2={posTo.y - Math.sin(angle) * 15}
                  stroke="#f59e0b" strokeWidth="2"
                  markerEnd="url(#arrowhead)"
                />
              )
            }
            return null
          })}

          {/* Arrow marker */}
          <defs>
            <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
              <polygon points="0 0, 10 3, 0 6" fill="#f59e0b" />
            </marker>
          </defs>

          {/* Legend */}
          <g transform="translate(10, 550)">
            <text fill="#666" fontSize="10">
              {selectedUnit
                ? orderMode === 'convoy'
                  ? convoyFrom
                    ? 'Click destination planet for convoy'
                    : 'Click army planet to convoy from'
                  : orderMode === 'support'
                    ? supportTarget
                      ? 'Click destination for support'
                      : 'Click unit to support'
                    : 'Click destination to move or use buttons above'
                : 'Click your units to select'}
            </text>
          </g>
        </svg>
      )}

      {/* 3D View */}
      {viewMode === '3d' && (
        <Suspense fallback={
          <div className="w-full h-full flex items-center justify-center text-gray-500">
            Loading 3D map...
          </div>
        }>
          <Map3D
            gameState={gameState}
            faction={faction}
            selectedUnit={selectedUnit}
            validDestinations={validDestinations}
            pendingOrders={pendingOrders}
            onPositionClick={handlePositionClick}
          />
        </Suspense>
      )}

      {/* Selection Info */}
      {selectedUnit && (
        <div className="absolute bottom-4 left-4 bg-space-blue border border-lcars-orange rounded px-4 py-2 z-10">
          <span className="text-lcars-orange">Selected: </span>
          <span className="text-white">{formatPosition(selectedUnit)}</span>
          {orderMode === 'support' && supportTarget && (
            <>
              <span className="text-lcars-orange ml-4">Supporting: </span>
              <span className="text-white">{formatPosition(supportTarget)}</span>
            </>
          )}
          {orderMode === 'convoy' && convoyFrom && (
            <>
              <span className="text-lcars-orange ml-4">Convoy from: </span>
              <span className="text-white">{formatPosition(convoyFrom)}</span>
            </>
          )}
        </div>
      )}

      {/* Pending Orders Summary */}
      {pendingOrders && pendingOrders.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-space-blue border border-lcars-orange rounded px-4 py-2 max-w-xs z-10">
          <div className="text-lcars-orange mb-1">Pending Orders ({pendingOrders.length})</div>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {pendingOrders.map((order, i) => (
              <div key={i} className="text-white">
                {formatPosition(order.location)}: {order.type}
                {order.destination && ` \u2192 ${formatPosition(order.destination)}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
