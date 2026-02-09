import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { Line } from '@react-three/drei'
import { FACTION_COLORS } from '@star-trek-diplomacy/shared'

export default function HyperlaneEdge({
  edgeId,
  startPos,
  endPos,
  isVertical,
  fleetsOnEdge,
  isSelected,
  isHighlighted,
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

    return { midpoint: mid.toArray(), length: len, quaternion: quat, perpOffset: perp.multiplyScalar(0.5).toArray() }
  }, [startPos, endPos])

  const points = useMemo(() => [startPos, endPos], [startPos, endPos])

  // Determine line style
  const active = isValidDest || isSelected || isHighlighted
  let lineColor = isVertical ? '#554433' : '#334455'
  let lineWidth = 1.5
  let lineOpacity = 0.5

  if (isValidDest) {
    lineColor = '#4ade80'
    lineWidth = 3
    lineOpacity = 0.9
  } else if (isSelected) {
    lineColor = '#ffffff'
    lineWidth = 3
    lineOpacity = 0.9
  } else if (isHighlighted) {
    lineColor = '#ffaa00'
    lineWidth = 2.5
    lineOpacity = 0.8
  }

  return (
    <group>
      {/* Main visible line using drei Line (Line2 — supports real pixel widths) */}
      <Line
        points={points}
        color={lineColor}
        lineWidth={lineWidth}
        transparent
        opacity={lineOpacity}
      />

      {/* Glow overlay for active states */}
      {active && (
        <Line
          points={points}
          color={lineColor}
          lineWidth={lineWidth * 3}
          transparent
          opacity={0.15}
        />
      )}

      {/* Invisible clickable cylinder */}
      <mesh
        ref={cylinderRef}
        position={midpoint}
        quaternion={quaternion}
        onClick={(e) => { e.stopPropagation(); onClick(edgeId) }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(edgeId) }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
      >
        <cylinderGeometry args={[0.3, 0.3, length, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Valid destination glow cylinder */}
      {isValidDest && (
        <mesh position={midpoint} quaternion={quaternion}>
          <cylinderGeometry args={[0.2, 0.2, length, 6]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.15} />
        </mesh>
      )}

      {/* Fleet indicators at midpoint */}
      {fleetsOnEdge && fleetsOnEdge.length === 1 && (
        <mesh position={midpoint} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.3, 0.7, 6]} />
          <meshStandardMaterial
            color={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'}
            emissive={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'}
            emissiveIntensity={0.4}
          />
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
            <coneGeometry args={[0.25, 0.6, 6]} />
            <meshStandardMaterial
              color={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'}
              emissive={FACTION_COLORS[fleetsOnEdge[0].faction] || '#fff'}
              emissiveIntensity={0.4}
            />
          </mesh>
          <mesh
            position={[
              midpoint[0] - perpOffset[0],
              midpoint[1] - perpOffset[1],
              midpoint[2] - perpOffset[2],
            ]}
            rotation={[0, 0, Math.PI]}
          >
            <coneGeometry args={[0.25, 0.6, 6]} />
            <meshStandardMaterial
              color={FACTION_COLORS[fleetsOnEdge[1].faction] || '#fff'}
              emissive={FACTION_COLORS[fleetsOnEdge[1].faction] || '#fff'}
              emissiveIntensity={0.4}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
