/**
 * Aggressive Strategy — Prioritize attacking neutrals, then weakest neighbor
 *
 * Units move toward the nearest unowned supply center. If none reachable,
 * move toward the weakest neighboring faction. Supports friendly attackers.
 */

const {
    getValidDestinations, getPositionType, POSITION_TYPES, MAP_DATA,
} = require('../../backend/src/engine/diplomacy-engine');
const { isEdgePosition, isPlanetEndpointOfEdge } = require('@star-trek-diplomacy/shared/edge-utils');

function aggressiveStrategy(faction, state) {
    const units = state.getUnits(faction);
    const orders = [];

    // Find neutral or enemy supply centers adjacent to our units
    const targets = [];
    units.forEach(unit => {
        const dests = getValidDestinations(unit.position, unit.type);
        dests.forEach(dest => {
            if (getPositionType(dest) === POSITION_TYPES.PLANET) {
                const owner = state.ownership[dest];
                if (owner !== faction) {
                    targets.push({ unit, dest, neutral: !owner });
                }
            }
        });
    });

    // Sort: neutrals first, then enemy
    targets.sort((a, b) => (b.neutral ? 1 : 0) - (a.neutral ? 1 : 0));

    const assignedUnits = new Set();
    const assignedDests = new Set();

    // Assign attackers
    targets.forEach(({ unit, dest }) => {
        if (assignedUnits.has(unit.position) || assignedDests.has(dest)) return;
        orders.push({ type: 'move', location: unit.position, destination: dest, faction });
        assignedUnits.add(unit.position);
        assignedDests.add(dest);
    });

    // Remaining units: try to support an attacker, or move toward a target, or hold
    units.forEach(unit => {
        if (assignedUnits.has(unit.position)) return;

        // Try to support an existing attack order
        const supportable = orders.find(o => {
            if (o.type !== 'move') return false;
            const dests = getValidDestinations(unit.position, unit.type);
            return dests.includes(o.destination);
        });

        if (supportable) {
            orders.push({
                type: 'support', location: unit.position,
                supportFrom: supportable.location, supportTo: supportable.destination,
                faction,
            });
            assignedUnits.add(unit.position);
            return;
        }

        // Otherwise move toward any valid destination, preferring non-friendly
        const dests = getValidDestinations(unit.position, unit.type);
        if (dests.length > 0) {
            const dest = dests[Math.floor(Math.random() * dests.length)];
            orders.push({ type: 'move', location: unit.position, destination: dest, faction });
        } else {
            orders.push({ type: 'hold', location: unit.position, faction });
        }
        assignedUnits.add(unit.position);
    });

    return orders;
}

module.exports = aggressiveStrategy;
