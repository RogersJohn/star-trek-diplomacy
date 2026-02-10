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
  const { selectedUnit, selectUnit, addOrder, removeOrder, pendingOrders, clearOrders } = useGameStore()
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [viewMode, setViewMode] = useState('2d')
  const [orderMode, setOrderMode] = useState('move') // 'move', 'support', 'hold', 'convoy'
  const [supportTarget, setSupportTarget] = useState(null)
  const [convoyFrom, setConvoyFrom] = useState(null)
  const [showHyperspace, setShowHyperspace] = useState(false)
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, w: 800, h: 600 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

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

  // Zoom handler: scroll wheel zooms toward cursor
  const handleWheel = (e) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 1.1 : 0.9
    const svg = svgRef.current
    if (!svg) return
    const point = svg.createSVGPoint()
    point.x = e.clientX
    point.y = e.clientY
    const svgPoint = point.matrixTransform(svg.getScreenCTM().inverse())

    setViewBox(prev => {
      const newW = prev.w * scaleFactor
      const newH = prev.h * scaleFactor
      const dx = (svgPoint.x - prev.x) * (1 - scaleFactor)
      const dy = (svgPoint.y - prev.y) * (1 - scaleFactor)
      return {
        x: prev.x + dx,
        y: prev.y + dy,
        w: Math.max(200, Math.min(1600, newW)),
        h: Math.max(150, Math.min(1200, newH)),
      }
    })
  }

  // Pan handlers: middle-click or Alt+click to drag
  const handleMouseDown = (e) => {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      setIsPanning(true)
      setPanStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e) => {
    if (!isPanning) return
    const svg = svgRef.current
    if (!svg) return
    const ctm = svg.getScreenCTM()
    const dx = (e.clientX - panStart.x) / ctm.a
    const dy = (e.clientY - panStart.y) / ctm.d
    setViewBox(prev => ({ ...prev, x: prev.x - dx, y: prev.y - dy }))
    setPanStart({ x: e.clientX, y: e.clientY })
  }

  const handleMouseUp = () => setIsPanning(false)

  const getPendingOrder = (positionId) => {
    return pendingOrders?.find(order => order.location === positionId)
  }

  // 2D: core layer only
  const coreSystems = Object.entries(SYSTEMS).filter(([_, sys]) => sys.layer === 2)
  const coreHyperlanes = HYPERLANES.filter(([a, b]) => {
    return SYSTEMS[a]?.layer === 2 && SYSTEMS[b]?.layer === 2
  })

  // Hyperspace: layers 1 and 3
  const hyperspaceSystems = Object.entries(SYSTEMS).filter(([_, sys]) => sys.layer === 1 || sys.layer === 3)
  const hyperspaceHyperlanes = HYPERLANES.filter(([a, b]) => {
    const layerA = SYSTEMS[a]?.layer
    const layerB = SYSTEMS[b]?.layer
    return (layerA === 1 || layerA === 3) && (layerB === 1 || layerB === 3)
  })

  // Map hyperspace positions: offset layer 3 above, layer 1 below core
  const toScreenHyper = (x, z, layer) => {
    const base = toScreen(x, z)
    const offset = layer === 3 ? -80 : 80
    return { x: base.x, y: base.y + offset }
  }

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
        <button
          onClick={() => setViewBox({ x: 0, y: 0, w: 800, h: 600 })}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600"
        >
          Reset View
        </button>
        <button
          onClick={() => setShowHyperspace(!showHyperspace)}
          className={`px-3 py-1 rounded ${showHyperspace ? 'bg-purple-600' : 'bg-gray-700'}`}
        >
          Hyperspace
        </button>
      </div>

      {/* Turn/Phase Status Overlay */}
      {gameState && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10 bg-space-blue/80 border border-lcars-orange rounded px-4 py-1 text-center">
          <span className="text-lcars-orange font-bold">
            {gameState.season?.toUpperCase()} {gameState.year}
          </span>
          <span className="text-white mx-2">|</span>
          <span className="text-lcars-tan">
            {gameState.phase?.toUpperCase()}
          </span>
          {gameState.turnDeadline && (
            <>
              <span className="text-white mx-2">|</span>
              <span className="text-red-400 text-sm">
                Deadline: {new Date(gameState.turnDeadline).toLocaleDateString()}
              </span>
            </>
          )}
        </div>
      )}

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
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          className="w-full h-full"
          style={{ background: '#0a0a12', cursor: isPanning ? 'grabbing' : 'default' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
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
                {/* Invisible wide click target */}
                <line
                  x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handlePositionClick(edgeId)}
                />
                {/* Visible line */}
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
                {/* Orbit ring — always visible */}
                <circle
                  r={18}
                  fill="none"
                  stroke={orbitUnit ? FACTION_COLORS[orbitUnit.faction] : '#222'}
                  strokeWidth={0.5}
                  strokeDasharray={orbitUnit ? 'none' : '2,2'}
                  opacity={0.4}
                  onClick={() => handlePositionClick(id + ':orbit')}
                  style={{ cursor: 'pointer' }}
                />

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

                {/* System name — always visible for supply centers */}
                {(system.supply || isHovered || isSelected) && (
                  <text
                    y={system.supply ? -14 : -20}
                    textAnchor="middle"
                    fontSize={system.supply ? '7' : '10'}
                    fill={isHovered || isSelected ? '#fff' : '#aaa'}
                    className="pointer-events-none"
                    opacity={isHovered || isSelected ? 1 : 0.7}
                  >
                    {system.name}
                  </text>
                )}
              </g>
            )
          })}

          {/* Hyperspace layers (1 and 3) — toggled */}
          {showHyperspace && (
            <>
              {/* Vertical lanes connecting core to hyperspace */}
              {VERTICAL_LANES.map(({ from, to }, i) => {
                const sysFrom = SYSTEMS[from]
                const sysTo = SYSTEMS[to]
                if (!sysFrom || !sysTo) return null
                const posFrom = sysFrom.layer === 2
                  ? toScreen(sysFrom.x, sysFrom.z)
                  : toScreenHyper(sysFrom.x, sysFrom.z, sysFrom.layer)
                const posTo = sysTo.layer === 2
                  ? toScreen(sysTo.x, sysTo.z)
                  : toScreenHyper(sysTo.x, sysTo.z, sysTo.layer)
                return (
                  <line
                    key={`vlane-${i}`}
                    x1={posFrom.x} y1={posFrom.y} x2={posTo.x} y2={posTo.y}
                    stroke="#525"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                    opacity={0.4}
                  />
                )
              })}

              {/* Hyperspace hyperlanes */}
              {hyperspaceHyperlanes.map(([a, b], i) => {
                const sysA = SYSTEMS[a]
                const sysB = SYSTEMS[b]
                if (!sysA || !sysB) return null
                const posA = toScreenHyper(sysA.x, sysA.z, sysA.layer)
                const posB = toScreenHyper(sysB.x, sysB.z, sysB.layer)
                return (
                  <line
                    key={`hyper-lane-${i}`}
                    x1={posA.x} y1={posA.y} x2={posB.x} y2={posB.y}
                    stroke="#636"
                    strokeWidth={0.5}
                    opacity={0.4}
                  />
                )
              })}

              {/* Hyperspace system nodes */}
              {hyperspaceSystems.map(([id, system]) => {
                const pos = toScreenHyper(system.x, system.z, system.layer)
                const color = getSystemColor(id)
                return (
                  <g key={`hyper-${id}`} transform={`translate(${pos.x}, ${pos.y})`}>
                    <circle r={2} fill={color} opacity={0.4} />
                    {system.supply && (
                      <text y={-6} textAnchor="middle" fontSize="5" fill="#a6a" opacity={0.5} className="pointer-events-none">
                        {system.name}
                      </text>
                    )}
                  </g>
                )
              })}
            </>
          )}

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
              <div key={i} className="text-white flex items-center gap-2">
                <span className="flex-1">
                  {formatPosition(order.location)}: {order.type}
                  {order.destination && ` \u2192 ${formatPosition(order.destination)}`}
                </span>
                <button
                  onClick={() => removeOrder(i)}
                  className="text-red-400 hover:text-red-300 text-xs"
                  data-testid="remove-order"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
