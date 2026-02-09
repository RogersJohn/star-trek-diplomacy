/**
 * Defensive Strategy — Hold home systems, only attack adjacent neutrals
 *
 * Units on home systems hold. Units near neutral supply centers attack them.
 * All others hold or support friendly defenders.
 */

const {
    getValidDestinations, getPositionType, POSITION_TYPES, FACTIONS,
} = require('../../backend/src/engine/diplomacy-engine');

function defensiveStrategy(faction, state) {
    const units = state.getUnits(faction);
    const orders = [];
    const homeSystems = FACTIONS[faction]?.homeSystems || [];
    const assignedUnits = new Set();

    // Units on home systems: hold
    units.forEach(unit => {
        if (getPositionType(unit.position) === POSITION_TYPES.PLANET && homeSystems.includes(unit.position)) {
            orders.push({ type: 'hold', location: unit.position, faction });
            assignedUnits.add(unit.position);
        }
    });

    // Non-home units: attack adjacent neutral SCs if available
    units.forEach(unit => {
        if (assignedUnits.has(unit.position)) return;

        const dests = getValidDestinations(unit.position, unit.type);
        const neutralSC = dests.find(dest => {
            if (getPositionType(dest) !== POSITION_TYPES.PLANET) return false;
            return !state.ownership[dest]; // Neutral
        });

        if (neutralSC) {
            orders.push({ type: 'move', location: unit.position, destination: neutralSC, faction });
            assignedUnits.add(unit.position);
            return;
        }

        // Try to support a friendly unit on a home system
        const friendlyHome = orders.find(o => {
            if (o.type !== 'hold') return false;
            const myDests = getValidDestinations(unit.position, unit.type);
            return myDests.includes(o.location);
        });

        if (friendlyHome) {
            orders.push({
                type: 'support', location: unit.position,
                supportTo: friendlyHome.location,
                faction,
            });
            assignedUnits.add(unit.position);
            return;
        }

        orders.push({ type: 'hold', location: unit.position, faction });
        assignedUnits.add(unit.position);
    });

    return orders;
}

module.exports = defensiveStrategy;
