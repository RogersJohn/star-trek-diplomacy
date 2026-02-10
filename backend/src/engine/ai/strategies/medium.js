/**
 * Medium AI Strategy
 *
 * More strategic than easy:
 * 1. Grab easy wins (undefended SCs)
 * 2. Attack winnable defended SCs with support
 * 3. Defend threatened SCs with support
 * 4. Hold home systems
 * 5. Move remaining toward non-friendly
 * 6. holdRemaining()
 */

const OrderBuilder = require('./base-strategy');
const {
  analyzeTargets,
  analyzeThreats,
  findEasyWins,
  findWinnableAttacks,
} = require('../board-analysis');
const {
  getValidDestinations,
  FACTIONS,
  MAP_DATA,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { isPlanetPosition } = require('@star-trek-diplomacy/shared/edge-utils');

function mediumStrategy(faction, state) {
  const builder = new OrderBuilder(faction, state);
  const targets = analyzeTargets(state, faction);
  const threats = analyzeThreats(state, faction);
  const easyWins = findEasyWins(targets);
  const winnableAttacks = findWinnableAttacks(targets);
  const units = state.getUnits(faction);
  const homeSystems = FACTIONS[faction]?.homeSystems || [];

  // 1. Grab easy wins
  easyWins.forEach(target => {
    const attacker = findNearestUnassignedArmy(units, target.planet, builder);
    if (attacker) {
      builder.move(attacker.position, target.planet);
    }
  });

  // 2. Attack winnable defended SCs with support
  winnableAttacks.forEach(target => {
    const attacker = findNearestUnassignedArmy(units, target.planet, builder);
    if (!attacker) return;

    builder.move(attacker.position, target.planet);

    // Find a supporter for this attack
    const supporters = findSupporters(units, attacker.position, target.planet, builder, state);
    if (supporters.length > 0) {
      builder.support(supporters[0].position, attacker.position, target.planet);
    }
  });

  // 3. Defend threatened SCs with support
  threats.forEach(threat => {
    if (builder.isAssigned(threat.position)) return;

    // Hold the threatened position
    builder.hold(threat.position);

    // Add supports from adjacent friendly units
    const supporters = findSupportersForHold(units, threat.position, builder, state);
    supporters.slice(0, 1).forEach(supporter => {
      builder.support(supporter.position, threat.position, threat.position);
    });
  });

  // 4. Hold home systems
  units.forEach(unit => {
    if (unit.type === UNIT_TYPES.ARMY && homeSystems.includes(unit.position)) {
      builder.hold(unit.position);
    }
  });

  // 5. Move remaining armies toward non-friendly planets
  units.forEach(unit => {
    if (builder.isAssigned(unit.position)) return;
    if (unit.type !== UNIT_TYPES.ARMY) return;

    const destinations = getValidDestinations(unit.position, unit.type);
    const nonFriendly = destinations.filter(d => {
      if (!isPlanetPosition(d)) return false;
      return state.ownership[d] !== faction;
    });

    if (nonFriendly.length > 0) {
      const scs = nonFriendly.filter(d => MAP_DATA.systems[d]?.supply);
      const dest = scs.length > 0 ? scs[0] : nonFriendly[0];
      builder.move(unit.position, dest);
    }
  });

  // 6. Hold remaining
  builder.holdRemaining();

  return builder.getOrders();
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

function findSupporters(units, attackerPos, targetDest, builder, state) {
  return units.filter(unit => {
    if (builder.isAssigned(unit.position)) return false;
    if (unit.position === attackerPos) return false;
    const dests = getValidDestinations(unit.position, unit.type);
    return dests.includes(targetDest);
  });
}

function findSupportersForHold(units, holdPosition, builder, state) {
  return units.filter(unit => {
    if (builder.isAssigned(unit.position)) return false;
    if (unit.position === holdPosition) return false;
    const dests = getValidDestinations(unit.position, unit.type);
    return dests.includes(holdPosition);
  });
}

module.exports = mediumStrategy;
