/**
 * Edge utilities for hyperlane positioning
 *
 * Edge IDs are formed by alphabetically sorting the two endpoint node IDs
 * and joining with a tilde: "earth~vulcan" (not "vulcan~earth")
 */

/**
 * Create a canonical edge ID from two node IDs
 */
function createEdgeId(nodeA, nodeB) {
  return [nodeA, nodeB].sort().join('~');
}

/**
 * Parse an edge ID into its two endpoint node IDs
 * Returns [nodeA, nodeB] in alphabetical order
 */
function parseEdgeId(edgeId) {
  return edgeId.split('~');
}

/**
 * Check if a position is an edge (hyperlane) position
 */
function isEdgePosition(position) {
  return position.includes('~');
}

/**
 * Check if a position is an orbit position
 */
function isOrbitPosition(position) {
  return position.endsWith(':orbit');
}

/**
 * Check if a position is a planet (node) position
 */
function isPlanetPosition(position) {
  return !isEdgePosition(position) && !isOrbitPosition(position);
}

/**
 * Get the planet from an orbit position
 */
function getPlanetFromOrbit(orbitPosition) {
  if (!isOrbitPosition(orbitPosition)) return null;
  return orbitPosition.replace(':orbit', '');
}

/**
 * Get the orbit position for a planet
 */
function getOrbitPosition(planetId) {
  return `${planetId}:orbit`;
}

/**
 * Get endpoints of an edge
 */
function getEdgeEndpoints(edgeId) {
  return parseEdgeId(edgeId);
}

/**
 * Check if a planet is an endpoint of an edge
 */
function isPlanetEndpointOfEdge(planetId, edgeId) {
  const [a, b] = parseEdgeId(edgeId);
  return planetId === a || planetId === b;
}

/**
 * Get all edges connected to a planet
 */
function getEdgesFromPlanet(planetId, allEdges) {
  return allEdges.filter(edgeId => isPlanetEndpointOfEdge(planetId, edgeId));
}

/**
 * Get edges adjacent to an edge (share exactly one endpoint)
 */
function getAdjacentEdges(edgeId, allEdges) {
  const [a, b] = parseEdgeId(edgeId);
  return allEdges.filter(other => {
    if (other === edgeId) return false;
    const [x, y] = parseEdgeId(other);
    const sharedEndpoints = [a, b].filter(e => e === x || e === y).length;
    return sharedEndpoints === 1;
  });
}

module.exports = {
  createEdgeId,
  parseEdgeId,
  isEdgePosition,
  isOrbitPosition,
  isPlanetPosition,
  getPlanetFromOrbit,
  getOrbitPosition,
  getEdgeEndpoints,
  isPlanetEndpointOfEdge,
  getEdgesFromPlanet,
  getAdjacentEdges,
};
