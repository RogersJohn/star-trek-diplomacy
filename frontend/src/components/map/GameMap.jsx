import { useState, useMemo } from 'react'
import { useGameStore } from '../../hooks/useGameStore'
import { SYSTEMS, HYPERLANES, FACTION_COLORS } from '../../../../shared/map-data'

export default function GameMap({ gameState, faction }) {
  const { selectedUnit, selectUnit, addOrder } = useGameStore()
  const [hoveredSystem, setHoveredSystem] = useState(null)
  const [viewMode, setViewMode] = useState('2d') // '2d' or '3d'
  
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
  
  // Handle system click
  const handleSystemClick = (systemId) => {
    const unit = getUnit(systemId)
    
    if (selectedUnit) {
      // If we have a selected unit, this is a move destination
      if (systemId !== selectedUnit) {
        addOrder({
          type: 'move',
          location: selectedUnit,
          destination: systemId
        })
      }
      selectUnit(null)
    } else if (unit && unit.faction === faction) {
      // Select our own unit
      selectUnit(systemId)
    }
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
    <div className="map-container">
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
            
            return (
              <g 
                key={id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleSystemClick(id)}
                onMouseEnter={() => setHoveredSystem(id)}
                onMouseLeave={() => setHoveredSystem(null)}
                style={{ cursor: 'pointer' }}
              >
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
                
                {/* System name (on hover) */}
                {isHovered && (
                  <text
                    y={-15}
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
          
          {/* Legend */}
          <g transform="translate(10, 550)">
            <text fill="#666" fontSize="10">
              Click your units to select, then click destination to move
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
          <button 
            onClick={() => selectUnit(null)}
            className="ml-4 text-red-400 hover:text-red-300"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
