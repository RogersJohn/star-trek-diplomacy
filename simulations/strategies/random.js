/**
 * Random Strategy — Pure random valid orders
 *
 * 30% hold, 50% move to random valid destination, 20% support a friendly unit.
 */

const { getValidDestinations } = require('../../backend/src/engine/diplomacy-engine');

function randomStrategy(faction, state) {
    const units = state.getUnits(faction);
    const orders = [];

    units.forEach(unit => {
        const destinations = getValidDestinations(unit.position, unit.type);
        const roll = Math.random();

        if (roll < 0.3 || destinations.length === 0) {
            orders.push({ type: 'hold', location: unit.position, faction });
        } else if (roll < 0.8) {
            const dest = destinations[Math.floor(Math.random() * destinations.length)];
            orders.push({ type: 'move', location: unit.position, destination: dest, faction });
        } else {
            const friendlyUnits = state.getUnits(faction).filter(u => u.position !== unit.position);
            if (friendlyUnits.length > 0) {
                const target = friendlyUnits[Math.floor(Math.random() * friendlyUnits.length)];
                orders.push({
                    type: 'support', location: unit.position,
                    supportFrom: target.position, supportTo: target.position,
                    faction,
                });
            } else {
                orders.push({ type: 'hold', location: unit.position, faction });
            }
        }
    });

    return orders;
}

module.exports = randomStrategy;
