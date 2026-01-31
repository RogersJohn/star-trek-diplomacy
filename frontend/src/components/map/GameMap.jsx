import { useState, useMemo } from 'react'
import { useGameStore } from '../../hooks/useGameStore'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES, FACTION_COLORS } from '../../../../shared/map-data'

export default function GameMap({ gameState, faction }) {
  const { selectedUnit, selectUnit, addOrder, pendingOrders } = useGameStore()
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [viewMode, setViewMode] = useState('2d')
  const [orderMode, setOrderMode] = useState('move') // 'move', 'support', 'hold'
  const [supportTarget, setSupportTarget] = useState(null)
  
  // Build adjacency map from HYPERLANES and VERTICAL_LANES
  const adjacencies = useMemo(() => {
    const adj = {}
    
    // Initialize
    Object.keys(SYSTEMS).forEach(id => {
      adj[id] = []
    })
    
    // Add hyperlanes (bidirectional)
    HYPERLANES.forEach(([a, b]) => {
      if (adj[a] && adj[b]) {
        if (!adj[a].includes(b)) adj[a].push(b)
        if (!adj[b].includes(a)) adj[b].push(a)
      }
    })
    
    // Add vertical lanes (bidirectional)
    VERTICAL_LANES.forEach(({ from, to }) => {
      if (adj[from] && adj[to]) {
        if (!adj[from].includes(to)) adj[from].push(to)
        if (!adj[to].includes(from)) adj[to].push(from)
      }
    })
    
    return adj
  }, [])
  
  // Calculate map bounds and scale
  const mapBounds = useMemo(() => {
    let minX = Infinity, maxX = -Infinity
    let minZ = Infinity, maxZ = -Infinity
    
    Object.values(SYSTEMS).forEach(sys => {
      if (sys.layer === 2) { // Only core layer
        minX = Math.min(minX, sys.x)
        maxX = Math.max(maxX, sys.x)
        minZ = Math.min(minZ, sys.z)
        maxZ = Math.max(maxZ, sys.z)
      }
    })
    
    return { minX, maxX, minZ, maxZ }
  }, [])
  
  // Convert map coordinates to screen coordinates
  const toScreen = (x, z) => {
    const padding = 50
    const width = 800
    const height = 600
    
    const scaleX = (width - padding * 2) / (mapBounds.maxX - mapBounds.minX)
    const scaleZ = (height - padding * 2) / (mapBounds.maxZ - mapBounds.minZ)
    const scale = Math.min(scaleX, scaleZ)
    
    return {
      x: padding + (x - mapBounds.minX) * scale,
      y: padding + (z - mapBounds.minZ) * scale
    }
  }
  
  // Get system color based on ownership
  const getSystemColor = (systemId) => {
    const owner = gameState?.ownership?.[systemId]
    if (owner) {
      return FACTION_COLORS[owner]
    }
    
    const system = SYSTEMS[systemId]
    if (system?.supply) {
      return '#888888' // Neutral
    }
    return '#333333' // Non-supply
  }
  
  // Check if system has a unit
  const getUnit = (systemId) => {
    return gameState?.units?.[systemId]
  }
  
  // Get adjacent systems
  const getAdjacent = (systemId) => {
    return adjacencies[systemId] || []
  }
  
  // Get valid destinations for selected unit
  const getValidDestinations = () => {
    if (!selectedUnit) return []
    return getAdjacent(selectedUnit)
  }
  
  // Check if system is a valid destination
  const isValidDestination = (systemId) => {
    return getValidDestinations().includes(systemId)
  }
  
  // Handle system click
  const handleSystemClick = (systemId) => {
    const unit = getUnit(systemId)
    
    if (orderMode === 'support') {
      if (!selectedUnit) {
        // First click: select unit giving support
        if (unit && unit.faction === faction) {
          selectUnit(systemId)
          setOrderMode('support')
        }
      } else if (!supportTarget) {
        // Second click: select unit being supported
        const targetUnit = getUnit(systemId)
        if (targetUnit) {
          setSupportTarget(systemId)
        }
      } else {
        // Third click: select destination of support
        addOrder({
          type: 'support',
          location: selectedUnit,
          target: supportTarget,
          destination: systemId
        })
        selectUnit(null)
        setSupportTarget(null)
        setOrderMode('move')
      }
    } else if (orderMode === 'move') {
      if (selectedUnit) {
        // If we have a selected unit, this is a move destination
        if (systemId !== selectedUnit && isValidDestination(systemId)) {
          addOrder({
            type: 'move',
            location: selectedUnit,
            destination: systemId
          })
          selectUnit(null)
        }
      } else if (unit && unit.faction === faction) {
        // Select our own unit
        selectUnit(systemId)
      }
    }
  }
  
  // Handle hold order
  const handleHold = () => {
    if (selectedUnit) {
      addOrder({
        type: 'hold',
        location: selectedUnit
      })
      selectUnit(null)
    }
  }
  
  // Get pending order for a system
  const getPendingOrder = (systemId) => {
    return pendingOrders?.find(order => order.location === systemId)
  }
  
  // Filter to core layer systems for 2D view
  const coreSystemsystems = Object.entries(SYSTEMS)
    .filter(([_, sys]) => sys.layer === 2)
  
  // Filter hyperlanes to only show core layer connections
  const coreHyperlanes = HYPERLANES.filter(([a, b]) => {
    const sysA = SYSTEMS[a]
    const sysB = SYSTEMS[b]
    return sysA?.layer === 2 && sysB?.layer === 2
  })
  
  return (
    <div className="map-container relative w-full h-full">
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
            onClick={() => { setOrderMode('move'); setSupportTarget(null) }}
            className={`px-3 py-1 rounded ${orderMode === 'move' ? 'bg-blue-500' : 'bg-gray-700'}`}
          >
            Move
          </button>
          <button
            onClick={() => { setOrderMode('support'); setSupportTarget(null) }}
            className={`px-3 py-1 rounded ${orderMode === 'support' ? 'bg-green-500' : 'bg-gray-700'}`}
          >
            Support
          </button>
          <button
            onClick={handleHold}
            className="px-3 py-1 rounded bg-yellow-600 hover:bg-yellow-500"
          >
            Hold
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
            
            return (
              <line
                key={`lane-${i}`}
                x1={posA.x}
                y1={posA.y}
                x2={posB.x}
                y2={posB.y}
                stroke="#334"
                strokeWidth="1"
              />
            )
          })}
          
          {/* Systems */}
          {coreSystemsystems.map(([id, system]) => {
            const pos = toScreen(system.x, system.z)
            const unit = getUnit(id)
            const color = getSystemColor(id)
            const isSelected = selectedUnit === id
            const isHovered = hoveredSystem === id
            const isValid = selectedUnit && isValidDestination(id)
            const pendingOrder = getPendingOrder(id)
            
            return (
              <g 
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleSystemClick(id)}
                onMouseEnter={() => setHoveredSystem(id)}
                onMouseLeave={() => setHoveredSystem(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Valid destination highlight */}
                {isValid && (
                  <circle
                    r={16}
                    fill="none"
                    stroke="#4ade80"
                    strokeWidth={2}
                    opacity={0.6}
                  />
                )}
                
                {/* Supply center indicator */}
                {system.supply && (
                  <circle
                    r={isSelected ? 14 : 10}
                    fill={color}
                    opacity={0.3}
                  />
                )}
                
                {/* System node */}
                <circle
                  r={system.supply ? 6 : 3}
                  fill={color}
                  stroke={isSelected ? '#fff' : isHovered ? '#aaa' : 'none'}
                  strokeWidth={2}
                />
                
                {/* Unit indicator */}
                {unit && (
                  <g>
                    <circle
                      r={8}
                      fill={FACTION_COLORS[unit.faction]}
                      stroke="#fff"
                      strokeWidth={1}
                    />
                    <text
                      textAnchor="middle"
                      dy="3"
                      fontSize="8"
                      fill="#fff"
                      fontWeight="bold"
                    >
                      {unit.type === 'fleet' ? 'F' : 'A'}
                    </text>
                  </g>
                )}
                
                {/* Pending order indicator */}
                {pendingOrder && (
                  <circle
                    r={12}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="2,2"
                  />
                )}
                
                {/* System name (on hover or selected) */}
                {(isHovered || isSelected) && (
                  <text
                    y={-20}
                    textAnchor="middle"
                    fontSize="10"
                    fill="#fff"
                    className="pointer-events-none"
                  >
                    {system.name}
                  </text>
                )}
              </g>
            )
          })}
          
          {/* Pending order arrows */}
          {pendingOrders?.map((order, i) => {
            if (order.type === 'move' && order.destination) {
              const from = SYSTEMS[order.location]
              const to = SYSTEMS[order.destination]
              if (!from || !to || from.layer !== 2 || to.layer !== 2) return null
              
              const posFrom = toScreen(from.x, from.z)
              const posTo = toScreen(to.x, to.z)
              
              // Calculate arrow angle
              const dx = posTo.x - posFrom.x
              const dy = posTo.y - posFrom.y
              const angle = Math.atan2(dy, dx)
              const length = Math.sqrt(dx * dx + dy * dy)
              
              return (
                <g key={`order-${i}`}>
                  {/* Arrow line */}
                  <line
                    x1={posFrom.x}
                    y1={posFrom.y}
                    x2={posTo.x - Math.cos(angle) * 15}
                    y2={posTo.y - Math.sin(angle) * 15}
                    stroke="#f59e0b"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                  />
                </g>
              )
            }
            return null
          })}
          
          {/* Arrow marker definition */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="10"
              refX="9"
              refY="3"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3, 0 6"
                fill="#f59e0b"
              />
            </marker>
          </defs>
          
          {/* Legend */}
          <g transform="translate(10, 550)">
            <text fill="#666" fontSize="10">
              {selectedUnit 
                ? orderMode === 'support' 
                  ? supportTarget 
                    ? 'Click destination for support' 
                    : 'Click unit to support'
                  : 'Click destination to move or use buttons above'
                : 'Click your units to select'}
            </text>
          </g>
        </svg>
      )}
      
      {/* 3D View Placeholder */}
      {viewMode === '3d' && (
        <div className="w-full h-full flex items-center justify-center text-gray-500">
          <div className="text-center">
            <p className="text-xl mb-2">3D View</p>
            <p className="text-sm">Coming soon - requires Three.js implementation</p>
          </div>
        </div>
      )}
      
      {/* Selection Info */}
      {selectedUnit && (
        <div className="absolute bottom-4 left-4 bg-space-blue border border-lcars-orange rounded px-4 py-2">
          <span className="text-lcars-orange">Selected: </span>
          <span className="text-white">{SYSTEMS[selectedUnit]?.name}</span>
          {orderMode === 'support' && supportTarget && (
            <>
              <span className="text-lcars-orange ml-4">Supporting: </span>
              <span className="text-white">{SYSTEMS[supportTarget]?.name}</span>
            </>
          )}
          <button 
            onClick={() => {
              selectUnit(null)
              setSupportTarget(null)
              setOrderMode('move')
            }}
            className="ml-4 text-red-400 hover:text-red-300"
          >
            Cancel
          </button>
        </div>
      )}
      
      {/* Pending Orders Summary */}
      {pendingOrders && pendingOrders.length > 0 && (
        <div className="absolute bottom-4 right-4 bg-space-blue border border-lcars-orange rounded px-4 py-2 max-w-xs">
          <div className="text-lcars-orange mb-1">Pending Orders ({pendingOrders.length})</div>
          <div className="text-xs space-y-1 max-h-32 overflow-y-auto">
            {pendingOrders.map((order, i) => (
              <div key={i} className="text-white">
                {SYSTEMS[order.location]?.name}: {order.type}
                {order.destination && ` → ${SYSTEMS[order.destination]?.name}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
