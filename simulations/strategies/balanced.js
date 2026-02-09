/**
 * Balanced Strategy — Adaptive based on supply center count
 *
 * If SC count < 50% of victory threshold: use aggressive strategy.
 * Otherwise: use defensive strategy.
 */

const { VICTORY_CONDITIONS } = require('../../backend/src/engine/diplomacy-engine');
const aggressiveStrategy = require('./aggressive');
const defensiveStrategy = require('./defensive');

function balancedStrategy(faction, state) {
    const scCount = state.countSupplyCenters(faction);
    const threshold = VICTORY_CONDITIONS[faction]?.supplyCenters || 10;

    if (scCount < threshold * 0.5) {
        return aggressiveStrategy(faction, state);
    }
    return defensiveStrategy(faction, state);
}

module.exports = balancedStrategy;
