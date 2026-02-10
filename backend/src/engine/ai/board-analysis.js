/**
 * Board Analysis Module for AI Players
 *
 * Provides situational awareness: target analysis, threat detection,
 * faction scoring, and opportunity identification.
 */

const {
  getValidDestinations,
  getPositionType,
  POSITION_TYPES,
  UNIT_TYPES,
  FACTIONS,
  VICTORY_CONDITIONS,
  MAP_DATA,
} = require('../diplomacy-engine');
const { getOrbitPosition, isPlanetPosition, isOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');

/**
 * Analyze all reachable targets for a faction's armies.
 * Returns an array of target info objects sorted by priority.
 */
function analyzeTargets(state, faction) {
  const units = state.getUnits(faction);
  const targets = [];
  const seen = new Set();

  units.forEach(unit => {
    if (unit.type !== UNIT_TYPES.ARMY) return;
    const destinations = getValidDestinations(unit.position, unit.type);

    destinations.forEach(dest => {
      if (!isPlanetPosition(dest) || seen.has(dest)) return;
      seen.add(dest);

      const owner = state.ownership[dest];
      if (owner === faction) return;

      const system = MAP_DATA.systems[dest];
      if (!system?.supply) return;

      const defenseStrength = calculateDefenseStrength(state, dest, faction);
      const adjacentFriendly = countAdjacentFriendlyUnits(state, dest, faction);

      targets.push({
        planet: dest,
        owner,
        isNeutral: !owner,
        isSupplyCenter: true,
        defenseStrength,
        adjacentFriendly,
        isHomeSystem: owner ? FACTIONS[owner]?.homeSystems?.includes(dest) : false,
      });
    });
  });

  // Sort: undefended first, then by most friendly units nearby
  targets.sort((a, b) => {
    if (a.defenseStrength !== b.defenseStrength) return a.defenseStrength - b.defenseStrength;
    return b.adjacentFriendly - a.adjacentFriendly;
  });

  return targets;
}

/**
 * Analyze threats to a faction's positions.
 * Returns array of threat objects sorted by priority (most threatened first).
 */
function analyzeThreats(state, faction) {
  const units = state.getUnits(faction);
  const threats = [];

  units.forEach(unit => {
    if (unit.type !== UNIT_TYPES.ARMY) return;
    if (!isPlanetPosition(unit.position)) return;

    const system = MAP_DATA.systems[unit.position];
    if (!system?.supply) return;

    const enemyAttackers = findEnemyAttackers(state, unit.position, faction);
    if (enemyAttackers.length > 0) {
      const isHome = FACTIONS[faction]?.homeSystems?.includes(unit.position);
      threats.push({
        position: unit.position,
        attackerCount: enemyAttackers.length,
        attackers: enemyAttackers,
        isHomeSystem: isHome,
        priority: (isHome ? 2 : 1) * enemyAttackers.length,
      });
    }
  });

  threats.sort((a, b) => b.priority - a.priority);
  return threats;
}

/**
 * Score all factions by supply centers, unit count, and victory progress.
 */
function scoreFactions(state) {
  const scores = {};

  Object.keys(FACTIONS).forEach(f => {
    const scCount = state.countSupplyCenters(f);
    const unitCount = state.getUnits(f).length;
    const conditions = VICTORY_CONDITIONS[f];
    const victoryProgress = conditions ? scCount / conditions.supplyCenters : 0;

    scores[f] = {
      supplyCenters: scCount,
      units: unitCount,
      victoryProgress,
      eliminated: state.isEliminated(f),
    };
  });

  return scores;
}

/**
 * Find easy wins: undefended supply centers (neutral first).
 */
function findEasyWins(targets) {
  return targets.filter(t => t.defenseStrength <= 0)
    .sort((a, b) => {
      if (a.isNeutral !== b.isNeutral) return a.isNeutral ? -1 : 1;
      return 0;
    });
}

/**
 * Find winnable attacks: defended SCs where our adjacent force exceeds defense.
 */
function findWinnableAttacks(targets) {
  return targets.filter(t => t.defenseStrength > 0 && t.adjacentFriendly > t.defenseStrength);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateDefenseStrength(state, planet, attackingFaction) {
  const defender = state.getUnitsAt(planet);
  if (!defender) return 0;

  let strength = 1;

  // Fleet-in-orbit bonus
  const orbitPos = getOrbitPosition(planet);
  const orbitUnit = state.getUnitsAt(orbitPos);
  if (!orbitUnit || orbitUnit.faction !== defender.faction) {
    strength -= 1; // No friendly fleet in orbit
  }

  // Klingon defense penalty without fleet in orbit
  if (defender.faction === 'klingon') {
    if (!orbitUnit || orbitUnit.faction !== 'klingon') {
      strength -= 1;
    }
  }

  return strength;
}

function countAdjacentFriendlyUnits(state, planet, faction) {
  let count = 0;
  const adjacentPlanets = MAP_DATA.planetAdjacency[planet] || [];

  adjacentPlanets.forEach(adj => {
    const unit = state.getUnitsAt(adj);
    if (unit && !Array.isArray(unit) && unit.faction === faction && unit.type === UNIT_TYPES.ARMY) {
      count++;
    }
  });

  return count;
}

function findEnemyAttackers(state, planet, faction) {
  const attackers = [];
  const adjacentPlanets = MAP_DATA.planetAdjacency[planet] || [];

  adjacentPlanets.forEach(adj => {
    const unit = state.getUnitsAt(adj);
    if (unit && !Array.isArray(unit) && unit.faction !== faction && unit.type === UNIT_TYPES.ARMY) {
      attackers.push({ position: adj, faction: unit.faction });
    }
  });

  return attackers;
}

module.exports = {
  analyzeTargets,
  analyzeThreats,
  scoreFactions,
  findEasyWins,
  findWinnableAttacks,
  calculateDefenseStrength,
  countAdjacentFriendlyUnits,
  findEnemyAttackers,
};
