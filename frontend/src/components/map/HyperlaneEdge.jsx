import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { FACTION_COLORS } from '@star-trek-diplomacy/shared'

export default function HyperlaneEdge({
  edgeId,
  startPos,
  endPos,
  isVertical,
  fleetsOnEdge,
  isSelected,
  isValidDest,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const cylinderRef = useRef()

  // Calculate midpoint and orientation for the clickable cylinder
  const { midpoint, length, quaternion, perpOffset } = useMemo(() => {
    const start = new THREE.Vector3(...startPos)
    const end = new THREE.Vector3(...endPos)
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
    const dir = new THREE.Vector3().subVectors(end, start)
    const len = dir.length()

    // Quaternion to rotate cylinder from default Y-up to edge direction
    const up = new THREE.Vector3(0, 1, 0)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, dir.clone().normalize())

    // Perpendicular offset for placing two fleets side by side
    const perp = new THREE.Vector3()
    if (Math.abs(dir.x) > 0.001 || Math.abs(dir.z) > 0.001) {
      perp.crossVectors(dir.clone().normalize(), new THREE.Vector3(0, 1, 0)).normalize()
    } else {
      perp.set(1, 0, 0)
    }

    return { midpoint: mid.toArray(), length: len, quaternion: quat, perpOffset: perp.multiplyScalar(0.12).toArray() }
  }, [startPos, endPos])

  const lineColor = isValidDest ? '#4ade80' : isSelected ? '#ffffff' : isVertical ? '#554433' : '#334455'
  const lineOpacity = isValidDest ? 0.8 : 0.4

  return (
    <group>
      {/* Visible line */}
      <line>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={2}
            array={new Float32Array([...startPos, ...endPos])}
            itemSize={3}
          />
        </bufferGeometry>
        <lineBasicMaterial color={lineColor} transparent opacity={lineOpacity} />
      </line>

      {/* Invisible clickable cylinder */}
      <mesh
        ref={cylinderRef}
        position={midpoint}
        quaternion={quaternion}
        onClick={(e) => { e.stopPropagation(); onClick(edgeId) }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(edgeId) }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
      >
        <cylinderGeometry args={[0.08, 0.08, length, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Valid destination glow */}
      {isValidDest && (
        <mesh position={midpoint} quaternion={quaternion}>
          <cylinderGeometry args={[0.06, 0.06, length, 6]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.15} />
        </mesh>
      )}

      {/* Fleet indicators at midpoint */}
      {fleetsOnEdge && fleetsOnEdge.length === 1 && (
        <mesh position={midpoint} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.08, 0.2, 6]} />
          <meshStandardMaterial color={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'} />
        </mesh>
      )}

      {fleetsOnEdge && fleetsOnEdge.length === 2 && (
        <>
          <mesh
            position={[
              midpoint[0] + perpOffset[0],
              midpoint[1] + perpOffset[1],
              midpoint[2] + perpOffset[2],
            ]}
            rotation={[0, 0, Math.PI]}
          >
            <coneGeometry args={[0.07, 0.18, 6]} />
            <meshStandardMaterial color={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'} />
          </mesh>
          <mesh
            position={[
              midpoint[0] - perpOffset[0],
              midpoint[1] - perpOffset[1],
              midpoint[2] - perpOffset[2],
            ]}
            rotation={[0, 0, Math.PI]}
          >
            <coneGeometry args={[0.07, 0.18, 6]} />
            <meshStandardMaterial color={FACTION_COLORS[fleetsOnEdge[1].faction] || '#fff'} />
          </mesh>
        </>
      )}
    </group>
  )
}
