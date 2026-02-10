/**
 * Easy AI Strategy
 *
 * Simple behavior:
 * 1. Grab undefended supply centers
 * 2. Hold armies on home systems
 * 3. Move remaining armies toward non-friendly planets
 * 4. All fleets hold
 */

const OrderBuilder = require('./base-strategy');
const { analyzeTargets, findEasyWins } = require('../board-analysis');
const {
  getValidDestinations,
  FACTIONS,
  MAP_DATA,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { isPlanetPosition } = require('@star-trek-diplomacy/shared/edge-utils');

function easyStrategy(faction, state) {
  const builder = new OrderBuilder(faction, state);
  const targets = analyzeTargets(state, faction);
  const easyWins = findEasyWins(targets);
  const units = state.getUnits(faction);
  const homeSystems = FACTIONS[faction]?.homeSystems || [];

  // 1. Grab easy wins (undefended SCs) with nearest army
  easyWins.forEach(target => {
    const attacker = findNearestUnassignedArmy(units, target.planet, builder, state);
    if (attacker) {
      builder.move(attacker.position, target.planet);
    }
  });

  // 2. Hold armies on home systems
  units.forEach(unit => {
    if (unit.type === UNIT_TYPES.ARMY && homeSystems.includes(unit.position)) {
      builder.hold(unit.position);
    }
  });

  // 3. Move remaining armies toward non-friendly planets
  units.forEach(unit => {
    if (builder.isAssigned(unit.position)) return;
    if (unit.type !== UNIT_TYPES.ARMY) return;

    const destinations = getValidDestinations(unit.position, unit.type);
    const nonFriendly = destinations.filter(d => {
      if (!isPlanetPosition(d)) return false;
      return state.ownership[d] !== faction;
    });

    if (nonFriendly.length > 0) {
      // Prefer supply centers
      const scs = nonFriendly.filter(d => MAP_DATA.systems[d]?.supply);
      const dest = scs.length > 0 ? scs[0] : nonFriendly[0];
      builder.move(unit.position, dest);
    }
  });

  // 4. All fleets and remaining units hold
  builder.holdRemaining();

  return builder.getOrders();
}

function findNearestUnassignedArmy(units, target, builder, state) {
  const armies = units.filter(u =>
    u.type === UNIT_TYPES.ARMY &&
    !builder.isAssigned(u.position) &&
    isPlanetPosition(u.position)
  );

  // Find one that can directly reach the target
  for (const army of armies) {
    const dests = getValidDestinations(army.position, army.type);
    if (dests.includes(target)) {
      return army;
    }
  }
  return null;
}

module.exports = easyStrategy;
