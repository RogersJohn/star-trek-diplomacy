import { useState, useMemo, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Line } from '@react-three/drei'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES, ALL_EDGES, FACTION_COLORS } from '@star-trek-diplomacy/shared'
import { isEdgePosition, isPlanetPosition, isOrbitPosition, parseEdgeId, isPlanetEndpointOfEdge } from '../../utils/edge-utils'
import SystemNode, { SYSTEM_POSITIONS } from './SystemNode'
import HyperlaneEdge from './HyperlaneEdge'

export default function Map3D({
  gameState,
  faction,
  selectedUnit,
  validDestinations,
  pendingOrders,
  onPositionClick,
}) {
  const [hoveredPosition, setHoveredPosition] = useState(null)
  const [layerVisibility, setLayerVisibility] = useState({ 1: true, 2: true, 3: true })
  const [clickedPlanet, setClickedPlanet] = useState(null)

  // Build edge data with world positions from precomputed SYSTEM_POSITIONS
  const edgeData = useMemo(() => {
    const allPairs = [
      ...HYPERLANES.map(([a, b]) => ({ a, b, isVertical: false })),
      ...VERTICAL_LANES.map(({ from, to }) => ({ a: from, b: to, isVertical: true })),
    ]

    const seen = new Set()
    return allPairs.filter(({ a, b }) => {
      const id = [a, b].sort().join('~')
      if (seen.has(id)) return false
      seen.add(id)
      return true
    }).map(({ a, b, isVertical }) => {
      const sysA = SYSTEMS[a]
      const sysB = SYSTEMS[b]
      if (!sysA || !sysB) return null
      const posA = SYSTEM_POSITIONS[a]
      const posB = SYSTEM_POSITIONS[b]
      if (!posA || !posB) return null
      const edgeId = [a, b].sort().join('~')
      return {
        edgeId,
        startPos: posA,
        endPos: posB,
        isVertical,
        layerA: sysA.layer,
        layerB: sysB.layer,
      }
    }).filter(Boolean)
  }, [])

  // Compute connected edges and planets for clickedPlanet
  const { connectedEdges, connectedPlanets } = useMemo(() => {
    if (!clickedPlanet) return { connectedEdges: new Set(), connectedPlanets: new Set() }

    const edges = new Set()
    const planets = new Set()

    ALL_EDGES.forEach(edgeId => {
      if (isPlanetEndpointOfEdge(clickedPlanet, edgeId)) {
        edges.add(edgeId)
        const [a, b] = parseEdgeId(edgeId)
        const other = a === clickedPlanet ? b : a
        planets.add(other)
      }
    })

    return { connectedEdges: edges, connectedPlanets: planets }
  }, [clickedPlanet])

  // Filter systems by layer visibility
  const visibleSystems = useMemo(() => {
    return Object.entries(SYSTEMS).filter(([_, sys]) => layerVisibility[sys.layer])
  }, [layerVisibility])

  // Filter edges by layer visibility
  const visibleEdges = useMemo(() => {
    return edgeData.filter(e => {
      if (e.isVertical) return layerVisibility[e.layerA] && layerVisibility[e.layerB]
      return layerVisibility[e.layerA]
    })
  }, [edgeData, layerVisibility])

  const validDestsSet = useMemo(() => new Set(validDestinations || []), [validDestinations])
  const pendingLocations = useMemo(() => new Set((pendingOrders || []).map(o => o.location)), [pendingOrders])

  // Get ownership color for a system
  const getOwnerColor = (systemId) => {
    const owner = gameState?.ownership?.[systemId]
    if (owner) return FACTION_COLORS[owner]
    if (SYSTEMS[systemId]?.supply) return '#888888'
    const layer = SYSTEMS[systemId]?.layer
    if (layer === 1 || layer === 3) return '#4477aa'
    return '#555566'
  }

  // Get fleets on an edge
  const getFleetsOnEdge = (edgeId) => {
    const units = gameState?.units?.[edgeId]
    if (Array.isArray(units)) return units
    return []
  }

  // Handle planet click — toggle click-highlight, also forward to parent
  const handlePositionClick = useCallback((positionId) => {
    if (isPlanetPosition(positionId)) {
      setClickedPlanet(prev => prev === positionId ? null : positionId)
    } else if (isOrbitPosition(positionId)) {
      const planet = positionId.replace(':orbit', '')
      setClickedPlanet(prev => prev === planet ? null : planet)
    } else {
      setClickedPlanet(null)
    }
    onPositionClick(positionId)
  }, [onPositionClick])

  return (
    <div className="w-full h-full relative">
      {/* Layer toggles */}
      <div className="absolute top-2 left-2 z-10 flex gap-2">
        {[3, 2, 1].map(layer => (
          <label key={layer} className="flex items-center gap-1 text-xs text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={layerVisibility[layer]}
              onChange={() => setLayerVisibility(prev => ({ ...prev, [layer]: !prev[layer] }))}
              className="w-3 h-3"
            />
            L{layer}
          </label>
        ))}
      </div>

      <Canvas camera={{ position: [0, 50, 70], fov: 50 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[40, 40, 40]} intensity={0.6} />
        <pointLight position={[-30, -20, -30]} intensity={0.3} color="#4488ff" />
        <Stars radius={250} depth={250} count={5000} factor={4} saturation={0.2} />
        <OrbitControls
          minDistance={5}
          maxDistance={200}
          enableDamping
          dampingFactor={0.1}
          touches={{ ONE: 0, TWO: 2 }}
        />

        {/* Systems */}
        {visibleSystems.map(([id, system]) => (
          <SystemNode
            key={id}
            systemId={id}
            system={system}
            ownerColor={getOwnerColor(id)}
            unit={gameState?.units?.[id] || null}
            orbitUnit={gameState?.units?.[id + ':orbit'] || null}
            isSelected={selectedUnit === id || selectedUnit === id + ':orbit'}
            isHovered={hoveredPosition === id || hoveredPosition === id + ':orbit'}
            isHighlighted={connectedPlanets.has(id) || clickedPlanet === id}
            isValidDest={validDestsSet.has(id)}
            isOrbitValidDest={validDestsSet.has(id + ':orbit')}
            hasPendingOrder={pendingLocations.has(id) || pendingLocations.has(id + ':orbit')}
            onClick={handlePositionClick}
            onPointerOver={setHoveredPosition}
            onPointerOut={() => setHoveredPosition(null)}
          />
        ))}

        {/* Edges */}
        {visibleEdges.map(edge => (
          <HyperlaneEdge
            key={edge.edgeId}
            edgeId={edge.edgeId}
            startPos={edge.startPos}
            endPos={edge.endPos}
            isVertical={edge.isVertical}
            fleetsOnEdge={getFleetsOnEdge(edge.edgeId)}
            isSelected={selectedUnit === edge.edgeId}
            isHighlighted={connectedEdges.has(edge.edgeId)}
            isValidDest={validDestsSet.has(edge.edgeId)}
            onClick={handlePositionClick}
            onPointerOver={setHoveredPosition}
            onPointerOut={() => setHoveredPosition(null)}
          />
        ))}

        {/* Pending order arrows */}
        {(pendingOrders || []).map((order, i) => {
          if (order.type !== 'move' || !order.destination) return null
          const fromPos = getWorldPosition(order.location)
          const toPos = getWorldPosition(order.destination)
          if (!fromPos || !toPos) return null

          return (
            <Line
              key={`order-arrow-${i}`}
              points={[fromPos, toPos]}
              color="#f59e0b"
              lineWidth={2}
            />
          )
        })}
      </Canvas>
    </div>
  )
}

// Resolve any position type (planet, orbit, edge) to a world coordinate
function getWorldPosition(position) {
  if (!position) return null

  if (isEdgePosition(position)) {
    const [a, b] = parseEdgeId(position)
    const posA = SYSTEM_POSITIONS[a]
    const posB = SYSTEM_POSITIONS[b]
    if (!posA || !posB) return null
    return [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2]
  }

  // Orbit position: same as planet
  const planetId = position.endsWith(':orbit') ? position.replace(':orbit', '') : position
  return SYSTEM_POSITIONS[planetId] || null
}
