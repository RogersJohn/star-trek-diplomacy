/**
 * Hard AI Strategy
 *
 * Focuses on:
 * 1. Identify leading enemy
 * 2. Defend critically threatened home SCs (2+ attackers only)
 * 3. Grab easy wins
 * 4. Concentrate force on ONE high-value target (leader's SCs first)
 * 5. Fleet cover for friendly armies
 * 6. Hold remaining home systems
 * 7. Expand remaining armies
 * 8. holdRemaining()
 * 9. Romulan spy_target on leading enemy
 */

const OrderBuilder = require('./base-strategy');
const {
  analyzeTargets,
  analyzeThreats,
  scoreFactions,
  findEasyWins,
} = require('../board-analysis');
const {
  getValidDestinations,
  FACTIONS,
  MAP_DATA,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { isPlanetPosition, getOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');

function hardStrategy(faction, state, context = {}) {
  const builder = new OrderBuilder(faction, state);
  const targets = analyzeTargets(state, faction);
  const threats = analyzeThreats(state, faction);
  const factionScores = scoreFactions(state);
  const easyWins = findEasyWins(targets);
  const units = state.getUnits(faction);
  const homeSystems = FACTIONS[faction]?.homeSystems || [];
  const abilityActions = [];

  // 1. Identify leading enemy
  const leadingEnemy = findLeadingEnemy(factionScores, faction);

  // 2. Defend critically threatened home SCs (2+ attackers)
  threats.forEach(threat => {
    if (!threat.isHomeSystem) return;
    if (threat.attackerCount < 2) return;
    if (builder.isAssigned(threat.position)) return;

    builder.hold(threat.position);

    const supporters = findSupportersForHold(units, threat.position, builder);
    supporters.slice(0, 2).forEach(s => {
      builder.support(s.position, threat.position, threat.position);
    });
  });

  // 3. Grab easy wins
  easyWins.forEach(target => {
    const attacker = findNearestUnassignedArmy(units, target.planet, builder);
    if (attacker) {
      builder.move(attacker.position, target.planet);
    }
  });

  // 4. Concentrate force on ONE high-value target
  const highValueTarget = pickHighValueTarget(targets, leadingEnemy, faction);
  if (highValueTarget) {
    const attacker = findNearestUnassignedArmy(units, highValueTarget.planet, builder);
    if (attacker) {
      builder.move(attacker.position, highValueTarget.planet);

      // Add all available support
      const supporters = findSupporters(units, attacker.position, highValueTarget.planet, builder);
      supporters.forEach(s => {
        builder.support(s.position, attacker.position, highValueTarget.planet);
      });
    }
  }

  // 5. Fleet cover — move fleets to orbit of friendly armies without fleet cover
  units.forEach(unit => {
    if (builder.isAssigned(unit.position)) return;
    if (unit.type !== UNIT_TYPES.FLEET) return;

    const dests = getValidDestinations(unit.position, unit.type);
    for (const dest of dests) {
      if (!dest.endsWith(':orbit')) continue;
      const planet = dest.replace(':orbit', '');
      const planetUnit = state.getUnitsAt(planet);
      if (planetUnit && planetUnit.faction === faction && planetUnit.type === UNIT_TYPES.ARMY) {
        // Check if planet already has fleet cover
        const existingFleet = state.getUnitsAt(dest);
        if (!existingFleet) {
          builder.move(unit.position, dest);
          break;
        }
      }
    }
  });

  // 6. Hold remaining home systems
  units.forEach(unit => {
    if (unit.type === UNIT_TYPES.ARMY && homeSystems.includes(unit.position)) {
      builder.hold(unit.position);
    }
  });

  // 7. Expand remaining armies
  units.forEach(unit => {
    if (builder.isAssigned(unit.position)) return;
    if (unit.type !== UNIT_TYPES.ARMY) return;

    const destinations = getValidDestinations(unit.position, unit.type);
    const nonFriendly = destinations.filter(d => {
      if (!isPlanetPosition(d)) return false;
      return state.ownership[d] !== faction;
    });

    if (nonFriendly.length > 0) {
      // Prefer leader's SCs, then any SC, then anything
      const leaderSCs = nonFriendly.filter(d =>
        state.ownership[d] === leadingEnemy && MAP_DATA.systems[d]?.supply
      );
      const anySCs = nonFriendly.filter(d => MAP_DATA.systems[d]?.supply);
      const dest = leaderSCs[0] || anySCs[0] || nonFriendly[0];
      builder.move(unit.position, dest);
    }
  });

  // 8. Hold remaining
  builder.holdRemaining();

  // 9. Romulan spy target
  if (faction === 'romulan' && leadingEnemy) {
    abilityActions.push({ type: 'spy_target', params: { targetFaction: leadingEnemy } });
  }

  return { orders: builder.getOrders(), abilityActions };
}

function findLeadingEnemy(scores, myFaction) {
  let leader = null;
  let maxProgress = 0;

  Object.entries(scores).forEach(([f, s]) => {
    if (f === myFaction || s.eliminated) return;
    if (s.victoryProgress > maxProgress) {
      maxProgress = s.victoryProgress;
      leader = f;
    }
  });

  return leader;
}

function pickHighValueTarget(targets, leadingEnemy, myFaction) {
  // Prefer leader's SCs
  if (leadingEnemy) {
    const leaderTargets = targets.filter(t => t.owner === leadingEnemy);
    if (leaderTargets.length > 0) return leaderTargets[0];
  }

  // Otherwise pick easiest defended SC
  const defended = targets.filter(t => t.defenseStrength > 0 && t.adjacentFriendly > t.defenseStrength);
  return defended[0] || null;
}

function findNearestUnassignedArmy(units, target, builder) {
  const armies = units.filter(u =>
    u.type === UNIT_TYPES.ARMY &&
    !builder.isAssigned(u.position) &&
    isPlanetPosition(u.position)
  );

  for (const army of armies) {
    const dests = getValidDestinations(army.position, army.type);
    if (dests.includes(target)) {
      return army;
    }
  }
  return null;
}

function findSupporters(units, attackerPos, targetDest, builder) {
  return units.filter(unit => {
    if (builder.isAssigned(unit.position)) return false;
    if (unit.position === attackerPos) return false;
    const dests = getValidDestinations(unit.position, unit.type);
    return dests.includes(targetDest);
  });
}

function findSupportersForHold(units, holdPosition, builder) {
  return units.filter(unit => {
    if (builder.isAssigned(unit.position)) return false;
    if (unit.position === holdPosition) return false;
    const dests = getValidDestinations(unit.position, unit.type);
    return dests.includes(holdPosition);
  });
}

module.exports = hardStrategy;
