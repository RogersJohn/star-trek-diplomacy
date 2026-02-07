/**
 * Edge utilities for hyperlane positioning (ESM version for frontend)
 * Mirrors shared/edge-utils.js
 */

export function createEdgeId(nodeA, nodeB) {
  return [nodeA, nodeB].sort().join('~')
}

export function parseEdgeId(edgeId) {
  return edgeId.split('~')
}

export function isEdgePosition(position) {
  return position.includes('~')
}

export function isOrbitPosition(position) {
  return position.endsWith(':orbit')
}

export function isPlanetPosition(position) {
  return !isEdgePosition(position) && !isOrbitPosition(position)
}

export function getPlanetFromOrbit(orbitPosition) {
  if (!isOrbitPosition(orbitPosition)) return null
  return orbitPosition.replace(':orbit', '')
}

export function getOrbitPosition(planetId) {
  return `${planetId}:orbit`
}

export function getEdgeEndpoints(edgeId) {
  return parseEdgeId(edgeId)
}

export function isPlanetEndpointOfEdge(planetId, edgeId) {
  const [a, b] = parseEdgeId(edgeId)
  return planetId === a || planetId === b
}

export function getEdgesFromPlanet(planetId, allEdges) {
  return allEdges.filter(edgeId => isPlanetEndpointOfEdge(planetId, edgeId))
}

export function getAdjacentEdges(edgeId, allEdges) {
  const [a, b] = parseEdgeId(edgeId)
  return allEdges.filter(other => {
    if (other === edgeId) return false
    const [x, y] = parseEdgeId(other)
    const sharedEndpoints = [a, b].filter(e => e === x || e === y).length
    return sharedEndpoints === 1
  })
}
