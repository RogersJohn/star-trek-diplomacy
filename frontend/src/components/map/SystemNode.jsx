import { useRef } from 'react'
import { Html } from '@react-three/drei'
import { SYSTEMS, HYPERLANES, VERTICAL_LANES } from '@star-trek-diplomacy/shared'
import { FACTION_COLORS } from '@star-trek-diplomacy/shared'

// Deterministic hash for a string -> value in roughly [-1, 1]
function hashOffset(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0
  }
  return ((h % 1000) / 1000)
}

function dist3(a, b) {
  return Math.sqrt((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2)
}

// ================================================================
// Precompute all system positions using force-directed layout.
//
// Strategy:
//  1. Run Fruchterman-Reingold on Layer 2 nodes only (the core map).
//  2. Position Layer 3/1 (hyperspace) nodes above/below their
//     connected Layer 2 nodes, so cross-layer edges stay short.
//  3. Post-process to enforce minimum distance.
//  4. Uniform scale so min 3D edge = 9.0 (Volchok-Underspace ref).
// ================================================================
const SYSTEM_POSITIONS = (() => {
  const pos = {}
  const K = 9.0
  const LAYER_SEP = K

  // Build vertical lane lookup: L1/L3 node -> [connected L2 nodes]
  const hyperConnections = {}
  VERTICAL_LANES.forEach(({ from, to }) => {
    const fromSys = SYSTEMS[from]
    const toSys = SYSTEMS[to]
    if (!fromSys || !toSys) return
    const coreId = fromSys.layer === 2 ? from : to
    const hyperId = fromSys.layer === 2 ? to : from
    if (!hyperConnections[hyperId]) hyperConnections[hyperId] = []
    hyperConnections[hyperId].push(coreId)
  })

  // 1. Initial L2 positions from map coordinates
  const l2Ids = []
  Object.entries(SYSTEMS).forEach(([id, sys]) => {
    if (sys.layer === 2) {
      pos[id] = [
        (sys.x - 50) * 0.1,
        hashOffset(sys.name) * 1.2,
        (sys.z - 50) * 0.1,
      ]
      l2Ids.push(id)
    }
  })

  // 2. L2-only edges (within Layer 2 hyperlanes)
  const l2Edges = HYPERLANES
    .filter(([a, b]) => SYSTEMS[a]?.layer === 2 && SYSTEMS[b]?.layer === 2)
    .map(([a, b]) => [a, b])
    .filter(([a, b]) => pos[a] && pos[b])

  // 3. Fruchterman-Reingold on L2 nodes only (x/z, y fixed)
  let temp = K * 2.5
  const N = l2Ids.length
  for (let iter = 0; iter < 150; iter++) {
    const disp = {}
    l2Ids.forEach(id => { disp[id] = [0, 0] })

    // Repulsion between all L2 pairs
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const u = l2Ids[i], v = l2Ids[j]
        const dx = pos[u][0] - pos[v][0]
        const dz = pos[u][2] - pos[v][2]
        let d = Math.sqrt(dx * dx + dz * dz)
        if (d < 0.1) d = 0.1
        const f = (K * K) / d
        disp[u][0] += (dx / d) * f
        disp[u][1] += (dz / d) * f
        disp[v][0] -= (dx / d) * f
        disp[v][1] -= (dz / d) * f
      }
    }

    // Attraction on L2 edges
    l2Edges.forEach(([a, b]) => {
      const dx = pos[b][0] - pos[a][0]
      const dz = pos[b][2] - pos[a][2]
      let d = Math.sqrt(dx * dx + dz * dz)
      if (d < 0.1) d = 0.1
      const f = (d * d) / K
      disp[a][0] += (dx / d) * f
      disp[a][1] += (dz / d) * f
      disp[b][0] -= (dx / d) * f
      disp[b][1] -= (dz / d) * f
    })

    // Apply with temperature cap
    l2Ids.forEach(id => {
      const mag = Math.sqrt(disp[id][0] ** 2 + disp[id][1] ** 2)
      if (mag > 0.01) {
        const s = Math.min(mag, temp) / mag
        pos[id][0] += disp[id][0] * s
        pos[id][2] += disp[id][1] * s
      }
    })
    temp *= 0.97
  }

  // 3b. Center L2 and normalize so min L2 XZ edge = K
  let cx = 0, cz = 0
  l2Ids.forEach(id => { cx += pos[id][0]; cz += pos[id][2] })
  cx /= N; cz /= N
  l2Ids.forEach(id => { pos[id][0] -= cx; pos[id][2] -= cz })

  let minL2 = Infinity
  l2Edges.forEach(([a, b]) => {
    const dx = pos[a][0] - pos[b][0], dz = pos[a][2] - pos[b][2]
    minL2 = Math.min(minL2, Math.sqrt(dx * dx + dz * dz))
  })
  if (minL2 > 0 && minL2 < Infinity) {
    const s = K / minL2
    l2Ids.forEach(id => { pos[id][0] *= s; pos[id][2] *= s })
  }

  // 3c. Spring relaxation: equalize L2 edge lengths toward K
  const adjSet = new Set()
  l2Edges.forEach(([a, b]) => { adjSet.add(a + '|' + b); adjSet.add(b + '|' + a) })

  for (let pass = 0; pass < 800; pass++) {
    const rate = 0.15 * Math.max(0.02, 1 - pass / 800)

    // Edge springs: each edge wants length K
    l2Edges.forEach(([a, b]) => {
      const dx = pos[b][0] - pos[a][0], dz = pos[b][2] - pos[a][2]
      let d = Math.sqrt(dx * dx + dz * dz)
      if (d < 0.01) d = 0.01
      const f = (d - K) * rate
      pos[a][0] += (dx / d) * f; pos[a][2] += (dz / d) * f
      pos[b][0] -= (dx / d) * f; pos[b][2] -= (dz / d) * f
    })

    // Non-adjacent repulsion when too close
    for (let i = 0; i < N; i++) {
      for (let j = i + 1; j < N; j++) {
        const u = l2Ids[i], v = l2Ids[j]
        if (adjSet.has(u + '|' + v)) continue
        const dx = pos[u][0] - pos[v][0], dz = pos[u][2] - pos[v][2]
        let d = Math.sqrt(dx * dx + dz * dz)
        if (d < K) {
          if (d < 0.01) d = 0.01
          const f = (K - d) * rate * 0.8
          pos[u][0] += (dx / d) * f; pos[u][2] += (dz / d) * f
          pos[v][0] -= (dx / d) * f; pos[v][2] -= (dz / d) * f
        }
      }
    }
  }

  // 3d. Re-normalize after spring relaxation
  minL2 = Infinity
  l2Edges.forEach(([a, b]) => {
    const dx = pos[a][0] - pos[b][0], dz = pos[a][2] - pos[b][2]
    minL2 = Math.min(minL2, Math.sqrt(dx * dx + dz * dz))
  })
  if (minL2 > 0 && minL2 < Infinity) {
    const s = K / minL2
    l2Ids.forEach(id => { pos[id][0] *= s; pos[id][2] *= s })
  }

  // 3e. Fix aspect ratio — compress longer axis to max 1.5:1
  let mnX = Infinity, mxX = -Infinity, mnZ = Infinity, mxZ = -Infinity
  l2Ids.forEach(id => {
    mnX = Math.min(mnX, pos[id][0]); mxX = Math.max(mxX, pos[id][0])
    mnZ = Math.min(mnZ, pos[id][2]); mxZ = Math.max(mxZ, pos[id][2])
  })
  const spanX = mxX - mnX, spanZ = mxZ - mnZ
  const maxRatio = 1.5
  if (spanX > spanZ * maxRatio) {
    const compress = (spanZ * maxRatio) / spanX
    const midX = (mnX + mxX) / 2
    l2Ids.forEach(id => { pos[id][0] = midX + (pos[id][0] - midX) * compress })
  } else if (spanZ > spanX * maxRatio) {
    const compress = (spanX * maxRatio) / spanZ
    const midZ = (mnZ + mxZ) / 2
    l2Ids.forEach(id => { pos[id][2] = midZ + (pos[id][2] - midZ) * compress })
  }

  // 4. Position L3/L1 nodes near their connected L2 anchors
  Object.entries(SYSTEMS).forEach(([id, sys]) => {
    if (sys.layer === 2) return
    const conn = hyperConnections[id]
    const ySign = sys.layer === 3 ? 1 : -1
    if (conn && conn.length > 0) {
      let ax = 0, az = 0
      conn.forEach(c => { ax += pos[c][0]; az += pos[c][2] })
      ax /= conn.length
      az /= conn.length
      const h = hashOffset(sys.name)
      pos[id] = [
        ax + h * 0.5,
        ySign * LAYER_SEP,
        az + h * 0.5,
      ]
    } else {
      pos[id] = [
        (sys.x - 50) * 0.1,
        ySign * LAYER_SEP,
        (sys.z - 50) * 0.1,
      ]
    }
  })

  // 5. Combined post-processing: edge constraints + same-layer pair separation
  const allEdges = [
    ...HYPERLANES.map(([a, b]) => [a, b]),
    ...VERTICAL_LANES.map(({ from, to }) => [from, to]),
  ].filter(([a, b]) => pos[a] && pos[b])

  // Build layer groups for pair separation
  const layerGroups = { 1: [], 2: [], 3: [] }
  Object.entries(SYSTEMS).forEach(([id, sys]) => {
    if (pos[id] && layerGroups[sys.layer]) layerGroups[sys.layer].push(id)
  })

  for (let pass = 0; pass < 500; pass++) {
    // Edge constraints: push apart < K*0.98, pull together > K*1.95
    allEdges.forEach(([a, b]) => {
      const d = dist3(pos[a], pos[b])
      const dx = pos[b][0] - pos[a][0]
      const dz = pos[b][2] - pos[a][2]
      const xzd = Math.sqrt(dx * dx + dz * dz) || 0.1
      const dy = pos[b][1] - pos[a][1]

      if (d < K * 0.98) {
        const neededXZ = Math.sqrt(Math.max(0, (K * 0.98) ** 2 - dy * dy))
        const delta = (neededXZ - xzd) * 0.15
        if (delta > 0) {
          pos[a][0] -= (dx / xzd) * delta
          pos[a][2] -= (dz / xzd) * delta
          pos[b][0] += (dx / xzd) * delta
          pos[b][2] += (dz / xzd) * delta
        }
      } else if (d > K * 1.95) {
        const targetXZ = Math.sqrt(Math.max(0.01, (K * 1.95) ** 2 - dy * dy))
        if (xzd > targetXZ) {
          const delta = (xzd - targetXZ) * 0.2
          pos[a][0] += (dx / xzd) * delta
          pos[a][2] += (dz / xzd) * delta
          pos[b][0] -= (dx / xzd) * delta
          pos[b][2] -= (dz / xzd) * delta
        }
      }
    })

    // Same-layer pair separation: push apart any pair closer than K*1.1 (XZ distance)
    // Use a buffer above K so that after final scaling, pairs remain >= K
    ;[1, 2, 3].forEach(layer => {
      const ids = layerGroups[layer]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i], b = ids[j]
          const dx = pos[a][0] - pos[b][0], dz = pos[a][2] - pos[b][2]
          let d = Math.sqrt(dx * dx + dz * dz)
          if (d < K * 1.1) {
            if (d < 0.01) d = 0.01
            const f = (K * 1.1 - d) * 0.2
            pos[a][0] += (dx / d) * f; pos[a][2] += (dz / d) * f
            pos[b][0] -= (dx / d) * f; pos[b][2] -= (dz / d) * f
          }
        }
      }
    })
  }

  // 5b. Final pair-only separation pass (no edge constraints to fight it)
  for (let pass = 0; pass < 200; pass++) {
    const rate = 0.1 * Math.max(0.05, 1 - pass / 200)
    ;[1, 2, 3].forEach(layer => {
      const ids = layerGroups[layer]
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          const a = ids[i], b = ids[j]
          const dx = pos[a][0] - pos[b][0], dz = pos[a][2] - pos[b][2]
          let d = Math.sqrt(dx * dx + dz * dz)
          if (d < K * 1.05) {
            if (d < 0.01) d = 0.01
            const f = (K * 1.05 - d) * rate
            pos[a][0] += (dx / d) * f; pos[a][2] += (dz / d) * f
            pos[b][0] -= (dx / d) * f; pos[b][2] -= (dz / d) * f
          }
        }
      }
    })
  }

  // 6. Uniform scale so minimum 3D edge distance = K
  let minDist = Infinity
  allEdges.forEach(([a, b]) => {
    const d = dist3(pos[a], pos[b])
    if (d < minDist) minDist = d
  })
  if (minDist > 0 && minDist < Infinity) {
    const scale = K / minDist
    Object.keys(pos).forEach(id => {
      pos[id][0] *= scale
      pos[id][1] *= scale
      pos[id][2] *= scale
    })
  }

  return pos
})()

export { SYSTEM_POSITIONS }

export default function SystemNode({
  systemId,
  system,
  ownerColor,
  unit,
  orbitUnit,
  isSelected,
  isHovered,
  isHighlighted,
  isValidDest,
  isOrbitValidDest,
  hasPendingOrder,
  onClick,
  onPointerOver,
  onPointerOut,
}) {
  const meshRef = useRef()
  const pos = SYSTEM_POSITIONS[systemId] || [0, 0, 0]
  const radius = system.supply ? 0.9 : 0.5
  const orbitRadius = radius + 0.8
  const color = ownerColor || '#555566'

  return (
    <group position={pos}>
      {/* Glow aura */}
      <mesh>
        <sphereGeometry args={[radius * 2.5, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} depthWrite={false} />
      </mesh>

      {/* Valid destination highlight */}
      {isValidDest && (
        <mesh>
          <sphereGeometry args={[radius + 0.4, 16, 16]} />
          <meshBasicMaterial color="#4ade80" transparent opacity={0.25} />
        </mesh>
      )}

      {/* Supply center ring */}
      {system.supply && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.1, radius + 0.2, 32]} />
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
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Selection wireframe */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[radius + 0.2, 16, 16]} />
          <meshBasicMaterial color="#ffffff" wireframe />
        </mesh>
      )}

      {/* Click-highlight ring */}
      {isHighlighted && !isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.3, radius + 0.45, 32]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.7} side={2} />
        </mesh>
      )}

      {/* Hover highlight */}
      {isHovered && !isSelected && !isHighlighted && (
        <mesh>
          <sphereGeometry args={[radius + 0.15, 16, 16]} />
          <meshBasicMaterial color="#aaaaaa" wireframe transparent opacity={0.5} />
        </mesh>
      )}

      {/* Pending order indicator */}
      {hasPendingOrder && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius + 0.25, radius + 0.35, 32]} />
          <meshBasicMaterial color="#f59e0b" transparent opacity={0.6} side={2} />
        </mesh>
      )}

      {/* Army on planet */}
      {unit && unit.type === 'army' && (
        <mesh position={[0, radius + 0.25, 0]}>
          <boxGeometry args={[0.4, 0.4, 0.4]} />
          <meshStandardMaterial
            color={FACTION_COLORS[unit.faction] || '#fff'}
            emissive={FACTION_COLORS[unit.faction] || '#fff'}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* Orbit ring */}
      <mesh
        rotation={[Math.PI / 2, 0, 0]}
        onClick={(e) => { e.stopPropagation(); onClick(systemId + ':orbit') }}
        onPointerOver={(e) => { e.stopPropagation(); onPointerOver?.(systemId + ':orbit') }}
        onPointerOut={(e) => { e.stopPropagation(); onPointerOut?.() }}
      >
        <torusGeometry args={[orbitRadius, 0.06, 8, 32]} />
        <meshBasicMaterial
          color={isOrbitValidDest ? '#4ade80' : '#445566'}
          transparent
          opacity={isOrbitValidDest ? 0.6 : 0.25}
        />
      </mesh>

      {/* Fleet in orbit */}
      {orbitUnit && (
        <mesh position={[orbitRadius, 0, 0]} rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.3, 0.7, 6]} />
          <meshStandardMaterial
            color={FACTION_COLORS[orbitUnit.faction] || '#fff'}
            emissive={FACTION_COLORS[orbitUnit.faction] || '#fff'}
            emissiveIntensity={0.4}
          />
        </mesh>
      )}

      {/* Label on hover/select/highlight */}
      {(isHovered || isSelected || isHighlighted) && (
        <Html position={[0, radius + 0.8, 0]} center style={{ pointerEvents: 'none' }}>
          <div className="text-white text-xs whitespace-nowrap bg-black/70 px-1.5 py-0.5 rounded">
            {system.name}
          </div>
        </Html>
      )}
    </group>
  )
}
