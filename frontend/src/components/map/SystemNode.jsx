import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { FACTION_COLORS } from '@star-trek-diplomacy/shared'

// Convert map coordinates to 3D space
// Centers Layer 2 at y=0, Layer 3 at y=+5, Layer 1 at y=-5
function toWorldPos(system) {
  const x = system.x / 10 - 5
  const y = (system.y - 50) / 10
  const z = system.z / 10 - 5
  return [x, y, z]
}

export { toWorldPos }

export default function SystemNode({
  systemId,
  system,
  ownerColor,
  unit,
  orbitUnit,
  isSelected,
  isHovered,
  isValidDest,
  isOrbitValidDest,
  hasPendingOrder,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const meshRef = useRef()
  const pos = toWorldPos(system)
  const radius = system.supply ? 0.3 : 0.15
  const color = ownerColor || '#333333'

  return (
    <group position={pos}>
      {/* Valid destination highlight */}
      {isValidDest && (
        <mesh>
          <sphereGeometry args={[radius + 0.15, 16, 16]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Supply center ring */}
      {system.supply && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.05, radius + 0.1, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.4} side={2} />
        </mesh>
      )}

      {/* Planet sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick(systemId) }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(systemId) }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
      >
        <sphereGeometry args={[radius, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Selection wireframe */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[radius + 0.08, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && (
        <mesh>
          <sphereGeometry args={[radius + 0.06, 16, 16]} />
          <meshBasicMaterial color="#aaaaaa" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Pending order indicator */}
      {hasPendingOrder && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.12, radius + 0.16, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} side={2} />
        </mesh>
      )}

      {/* Army on planet */}
      {unit && unit.type === 'army' && (
        <mesh position={[0, radius + 0.1, 0]}>
          <boxGeometry args={[0.12, 0.12, 0.12]} />
          <meshStandardMaterial color={FACTION_COLORS[unit.faction] || '#fff'} />
        </mesh>
      )}

      {/* Orbit ring */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(systemId + ':orbit') }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(systemId + ':orbit') }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
      >
        <torusGeometry args={[0.5, 0.02, 8, 32]} />
        <meshBasicMaterial
          color={isOrbitValidDest ? '#4ade80' : '#445566'}
          transparent
          opacity={isOrbitValidDest ? 0.6 : 0.2}
        />
      </mesh>

      {/* Fleet in orbit */}
      {orbitUnit && (
        <mesh position={[0.5, 0, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.08, 0.2, 6]} />
          <meshStandardMaterial color={FACTION_COLORS[orbitUnit.faction] || '#fff'} />
        </mesh>
      )}

      {/* Label on hover/select */}
      {(isHovered || isSelected) && (
        <Html position={[0, radius + 0.35, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-white text-xs whitespace-nowrap bg-black/70 px-1.5 py-0.5 rounded">
            {system.name}
          </div>
        </Html>
      )}
    </group>
  )
}
