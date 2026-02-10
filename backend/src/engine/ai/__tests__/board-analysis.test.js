/**
 * Board Analysis Unit Tests
 *
 * Tests analyzeTargets, analyzeThreats, scoreFactions, findEasyWins,
 * and findWinnableAttacks using real map data.
 */

const {
  initializeMapData,
  GameState,
  FACTIONS,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const { getOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');
const {
  analyzeTargets,
  analyzeThreats,
  scoreFactions,
  findEasyWins,
  findWinnableAttacks,
  calculateDefenseStrength,
  countAdjacentFriendlyUnits,
  findEnemyAttackers,
} = require('../board-analysis');

beforeAll(() => {
  initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);
});

function freshState() {
  const state = new GameState();
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// analyzeTargets
// ═══════════════════════════════════════════════════════════════════════════════

describe('analyzeTargets', () => {
  test('finds adjacent neutral supply centers as targets', () => {
    const state = freshState();
    // Federation army on earth, betazed is adjacent neutral SC
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.ownership['betazed'] = null;

    const targets = analyzeTargets(state, 'federation');
    const betazedTarget = targets.find(t => t.planet === 'betazed');
    expect(betazedTarget).toBeDefined();
    expect(betazedTarget.isNeutral).toBe(true);
  });

  test('excludes own supply centers from targets', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.ownership['earth'] = 'federation';
    state.ownership['vulcan'] = 'federation';

    const targets = analyzeTargets(state, 'federation');
    const ownTargets = targets.filter(t => t.owner === 'federation');
    expect(ownTargets).toHaveLength(0);
  });

  test('identifies defended enemy planets', () => {
    const state = freshState();
    // Federation army adjacent to qonos; Klingon defending qonos
    state.units['khitomer'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['qonos'] = { faction: 'klingon', type: UNIT_TYPES.ARMY };
    state.ownership['qonos'] = 'klingon';

    const targets = analyzeTargets(state, 'federation');
    const qonosTarget = targets.find(t => t.planet === 'qonos');
    expect(qonosTarget).toBeDefined();
    expect(qonosTarget.defenseStrength).toBeGreaterThanOrEqual(0);
    expect(qonosTarget.isNeutral).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// analyzeThreats
// ═══════════════════════════════════════════════════════════════════════════════

describe('analyzeThreats', () => {
  test('detects enemy armies adjacent to our supply centers', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['betazed'] = { faction: 'klingon', type: UNIT_TYPES.ARMY };
    state.ownership['earth'] = 'federation';

    const threats = analyzeThreats(state, 'federation');
    const earthThreat = threats.find(t => t.position === 'earth');
    expect(earthThreat).toBeDefined();
    expect(earthThreat.attackerCount).toBeGreaterThanOrEqual(1);
  });

  test('prioritizes home system threats', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['betazed'] = { faction: 'klingon', type: UNIT_TYPES.ARMY };
    state.ownership['earth'] = 'federation';

    const threats = analyzeThreats(state, 'federation');
    const earthThreat = threats.find(t => t.position === 'earth');
    expect(earthThreat.isHomeSystem).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// scoreFactions
// ═══════════════════════════════════════════════════════════════════════════════

describe('scoreFactions', () => {
  test('counts supply centers and units per faction', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['vulcan'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.ownership['earth'] = 'federation';
    state.ownership['vulcan'] = 'federation';
    state.ownership['qonos'] = 'klingon';

    const scores = scoreFactions(state);
    expect(scores.federation.supplyCenters).toBe(2);
    expect(scores.federation.units).toBe(2);
    expect(scores.klingon.supplyCenters).toBe(1);
  });

  test('reports eliminated factions', () => {
    const state = freshState();
    // No gorn units or SCs
    const scores = scoreFactions(state);
    expect(scores.gorn.eliminated).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// findEasyWins / findWinnableAttacks
// ═══════════════════════════════════════════════════════════════════════════════

describe('findEasyWins', () => {
  test('returns undefended targets with neutrals first', () => {
    const targets = [
      { planet: 'bajor', owner: null, isNeutral: true, defenseStrength: 0, adjacentFriendly: 1 },
      { planet: 'qonos', owner: 'klingon', isNeutral: false, defenseStrength: 0, adjacentFriendly: 1 },
      { planet: 'earth', owner: 'federation', isNeutral: false, defenseStrength: 1, adjacentFriendly: 0 },
    ];

    const wins = findEasyWins(targets);
    expect(wins).toHaveLength(2);
    expect(wins[0].planet).toBe('bajor'); // Neutral first
  });
});

describe('findWinnableAttacks', () => {
  test('returns targets where adjacent friendly exceeds defense', () => {
    const targets = [
      { planet: 'qonos', defenseStrength: 1, adjacentFriendly: 2 },
      { planet: 'romulus', defenseStrength: 2, adjacentFriendly: 1 },
    ];

    const winnable = findWinnableAttacks(targets);
    expect(winnable).toHaveLength(1);
    expect(winnable[0].planet).toBe('qonos');
  });
});
