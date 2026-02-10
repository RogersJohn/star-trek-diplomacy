/**
 * AIPlayer - Controller for AI-controlled factions.
 *
 * Wraps strategy selection, retreat handling, and build decisions.
 */

const easyStrategy = require('./strategies/easy');
const mediumStrategy = require('./strategies/medium');
const hardStrategy = require('./strategies/hard');
const { FACTIONS, UNIT_TYPES } = require('../diplomacy-engine');
const { isPlanetPosition, getOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');

const STRATEGIES = {
  easy: easyStrategy,
  medium: mediumStrategy,
  hard: hardStrategy,
};

class AIPlayer {
  constructor(faction, difficulty = 'medium') {
    this.faction = faction;
    this.difficulty = difficulty;
  }

  /**
   * Generate orders for the current turn.
   * Returns { orders, abilityActions }
   */
  generateOrders(state) {
    const strategyFn = STRATEGIES[this.difficulty];
    if (!strategyFn) {
      throw new Error(`Unknown difficulty: ${this.difficulty}`);
    }

    const result = strategyFn(this.faction, state);

    // Hard strategy returns { orders, abilityActions }, others return array
    if (Array.isArray(result)) {
      return { orders: result, abilityActions: [] };
    }
    return {
      orders: result.orders || [],
      abilityActions: result.abilityActions || [],
    };
  }

  /**
   * Choose retreat destinations for dislodged units.
   * Returns array of { from, to, type: 'retreat' } or { location, type: 'disband' }
   */
  chooseRetreat(state, position, retreatOptions) {
    if (!retreatOptions || retreatOptions.length === 0) {
      return { location: position, type: 'disband' };
    }

    if (this.difficulty === 'easy') {
      // Easy: pick random
      const idx = Math.floor(Math.random() * retreatOptions.length);
      return { from: position, to: retreatOptions[idx], type: 'retreat' };
    }

    // Medium/Hard: prefer home > owned SC > first option
    const homeSystems = FACTIONS[this.faction]?.homeSystems || [];

    // Prefer retreating to home system
    const homeOption = retreatOptions.find(r => homeSystems.includes(r));
    if (homeOption) {
      return { from: position, to: homeOption, type: 'retreat' };
    }

    // Prefer retreating to owned supply center
    const ownedSC = retreatOptions.find(r =>
      isPlanetPosition(r) && state.ownership[r] === this.faction
    );
    if (ownedSC) {
      return { from: position, to: ownedSC, type: 'retreat' };
    }

    // Fall back to first option
    return { from: position, to: retreatOptions[0], type: 'retreat' };
  }

  /**
   * Choose what to build/disband.
   * Returns array of { type: 'build', location, unitType } or { type: 'disband', location }
   */
  chooseBuild(state, buildCount, availableLocations) {
    const builds = [];

    if (buildCount > 0) {
      let remaining = buildCount;
      const { armies = [], fleets = [] } = availableLocations;

      if (this.difficulty === 'easy') {
        // Easy: armies only
        for (const loc of armies) {
          if (remaining <= 0) break;
          builds.push({ type: 'build', location: loc, unitType: UNIT_TYPES.ARMY });
          remaining--;
        }
      } else {
        // Medium/Hard: 60% army, 40% fleet mix
        const allLocations = [
          ...armies.map(loc => ({ loc, unitType: UNIT_TYPES.ARMY })),
          ...fleets.map(loc => ({ loc, unitType: UNIT_TYPES.FLEET })),
        ];

        // Sort: prefer armies but interleave some fleets
        const sorted = [];
        let ai = 0, fi = 0;
        while (ai < armies.length || fi < fleets.length) {
          if (ai < armies.length && (fi >= fleets.length || Math.random() < 0.6)) {
            sorted.push({ loc: armies[ai], unitType: UNIT_TYPES.ARMY });
            ai++;
          } else if (fi < fleets.length) {
            sorted.push({ loc: fleets[fi], unitType: UNIT_TYPES.FLEET });
            fi++;
          }
        }

        for (const { loc, unitType } of sorted) {
          if (remaining <= 0) break;
          builds.push({ type: 'build', location: loc, unitType });
          remaining--;
        }
      }
    } else if (buildCount < 0) {
      // Disband: prefer non-home units first
      const myUnits = state.getUnits(this.faction);
      const homeSystems = FACTIONS[this.faction]?.homeSystems || [];
      let toDisband = Math.abs(buildCount);

      // Sort: non-home first
      const sorted = [...myUnits].sort((a, b) => {
        const aHome = homeSystems.includes(a.position) || homeSystems.some(h => a.position === getOrbitPosition(h));
        const bHome = homeSystems.includes(b.position) || homeSystems.some(h => b.position === getOrbitPosition(h));
        if (aHome !== bHome) return aHome ? 1 : -1;
        return 0;
      });

      for (const unit of sorted) {
        if (toDisband <= 0) break;
        builds.push({ type: 'disband', location: unit.position });
        toDisband--;
      }
    }

    return builds;
  }
}

module.exports = AIPlayer;
