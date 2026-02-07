import { useState, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES, ALL_EDGES, FACTION_COLORS } from '@star-trek-diplomacy/shared'
import { isEdgePosition, parseEdgeId } from '../../utils/edge-utils'
import SystemNode, { toWorldPos } from './SystemNode'
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

  // Build edge data with world positions
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
      const edgeId = [a, b].sort().join('~')
      return {
        edgeId,
        startPos: toWorldPos(sysA),
        endPos: toWorldPos(sysB),
        isVertical,
        layerA: sysA.layer,
        layerB: sysB.layer,
      }
    }).filter(Boolean)
  }, [])

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
    return '#333333'
  }

  // Get fleets on an edge
  const getFleetsOnEdge = (edgeId) => {
    const units = gameState?.units?.[edgeId]
    if (Array.isArray(units)) return units
    return []
  }

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

      <Canvas camera={{ position: [0, 12, 8], fov: 50 }}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={0.6} />
        <Stars radius={50} depth={50} count={2000} factor={3} saturation={0} />
        <OrbitControls
          minDistance={3}
          maxDistance={25}
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
            isValidDest={validDestsSet.has(id)}
            isOrbitValidDest={validDestsSet.has(id + ':orbit')}
            hasPendingOrder={pendingLocations.has(id) || pendingLocations.has(id + ':orbit')}
            onClick={onPositionClick}
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
            isValidDest={validDestsSet.has(edge.edgeId)}
            onClick={onPositionClick}
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
            <line key={`order-arrow-${i}`}>
              <bufferGeometry>
                <bufferAttribute
                  attach="attributes-position"
                  count={2}
                  array={new Float32Array([...fromPos, ...toPos])}
                  itemSize={3}
                />
              </bufferGeometry>
              <lineBasicMaterial color="#f59e0b" linewidth={2} />
            </line>
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
    const sysA = SYSTEMS[a]
    const sysB = SYSTEMS[b]
    if (!sysA || !sysB) return null
    const posA = toWorldPos(sysA)
    const posB = toWorldPos(sysB)
    return [(posA[0] + posB[0]) / 2, (posA[1] + posB[1]) / 2, (posA[2] + posB[2]) / 2]
  }

  // Orbit position: same as planet
  const planetId = position.endsWith(':orbit') ? position.replace(':orbit', '') : position
  const sys = SYSTEMS[planetId]
  if (!sys) return null
  return toWorldPos(sys)
}
