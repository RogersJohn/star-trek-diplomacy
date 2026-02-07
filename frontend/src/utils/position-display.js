import { SYSTEMS } from '@star-trek-diplomacy/shared'
import { isEdgePosition, isOrbitPosition, getPlanetFromOrbit, parseEdgeId } from './edge-utils'

export function getPositionType(positionId) {
  if (isEdgePosition(positionId)) return 'edge'
  if (isOrbitPosition(positionId)) return 'orbit'
  return 'planet'
}

export function formatPosition(positionId) {
  if (!positionId) return ''

  if (isEdgePosition(positionId)) {
    const [a, b] = parseEdgeId(positionId)
    const nameA = SYSTEMS[a]?.name || a
    const nameB = SYSTEMS[b]?.name || b
    return `${nameA} \u2194 ${nameB}`
  }

  if (isOrbitPosition(positionId)) {
    const planet = getPlanetFromOrbit(positionId)
    const name = SYSTEMS[planet]?.name || planet
    return `${name} (Orbit)`
  }

  const name = SYSTEMS[positionId]?.name || positionId
  return name
}
