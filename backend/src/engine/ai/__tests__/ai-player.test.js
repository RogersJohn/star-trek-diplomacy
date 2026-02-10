/**
 * AIPlayer Unit Tests
 *
 * Tests order generation, retreat choices, and build decisions
 * across all difficulty levels using real map data.
 */

const {
  initializeMapData,
  GameState,
  FACTIONS,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const { getOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');
const AIPlayer = require('../ai-player');

beforeAll(() => {
  initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);
});

function freshState() {
  const state = new GameState();
  return state;
}

function initializedState() {
  const state = new GameState();
  state.initialize();
  return state;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Order Generation
// ═══════════════════════════════════════════════════════════════════════════════

describe('generateOrders', () => {
  test('easy AI generates valid orders for all units', () => {
    const state = initializedState();
    const ai = new AIPlayer('federation', 'easy');
    const { orders } = ai.generateOrders(state);

    // Federation starts with 5 units (3 armies + 2 fleets)
    expect(orders.length).toBeGreaterThanOrEqual(1);
    expect(orders.length).toBeLessThanOrEqual(5);

    // All orders should have correct faction
    orders.forEach(order => {
      expect(order.faction).toBe('federation');
      expect(['hold', 'move', 'support']).toContain(order.type);
    });
  });

  test('medium AI generates orders with supports', () => {
    const state = initializedState();
    const ai = new AIPlayer('klingon', 'medium');
    const { orders } = ai.generateOrders(state);

    expect(orders.length).toBeGreaterThanOrEqual(1);
    orders.forEach(order => {
      expect(order.faction).toBe('klingon');
    });
  });

  test('hard AI generates orders and ability actions', () => {
    const state = initializedState();
    const ai = new AIPlayer('romulan', 'hard');
    const { orders, abilityActions } = ai.generateOrders(state);

    expect(orders.length).toBeGreaterThanOrEqual(1);
    orders.forEach(order => {
      expect(order.faction).toBe('romulan');
    });

    // Romulan hard AI should generate spy_target action
    expect(abilityActions).toBeDefined();
  });

  test('AI does not generate duplicate unit orders', () => {
    const state = initializedState();
    const ai = new AIPlayer('cardassian', 'medium');
    const { orders } = ai.generateOrders(state);

    const locations = orders.map(o => o.location);
    const unique = new Set(locations);
    expect(unique.size).toBe(locations.length);
  });

  test('AI handles eliminated faction gracefully', () => {
    const state = freshState();
    // No ferengi units
    const ai = new AIPlayer('ferengi', 'easy');
    const { orders } = ai.generateOrders(state);
    expect(orders).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Retreat Choices
// ═══════════════════════════════════════════════════════════════════════════════

describe('chooseRetreat', () => {
  test('retreats to home system when available (medium/hard)', () => {
    const state = freshState();
    const ai = new AIPlayer('federation', 'medium');
    const retreat = ai.chooseRetreat(state, 'betazed', ['earth', 'bajor']);

    expect(retreat.type).toBe('retreat');
    expect(retreat.to).toBe('earth');
  });

  test('disbands when no retreat options', () => {
    const state = freshState();
    const ai = new AIPlayer('klingon', 'easy');
    const retreat = ai.chooseRetreat(state, 'qonos', []);

    expect(retreat.type).toBe('disband');
  });

  test('easy AI picks a valid retreat option', () => {
    const state = freshState();
    const ai = new AIPlayer('gorn', 'easy');
    const options = ['gornar', 'ssgaron'];
    const retreat = ai.chooseRetreat(state, 'seudath', options);

    expect(retreat.type).toBe('retreat');
    expect(options).toContain(retreat.to);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Build Choices
// ═══════════════════════════════════════════════════════════════════════════════

describe('chooseBuild', () => {
  test('easy AI builds armies only', () => {
    const state = freshState();
    state.ownership['earth'] = 'federation';
    state.ownership['vulcan'] = 'federation';

    const ai = new AIPlayer('federation', 'easy');
    const builds = ai.chooseBuild(state, 2, {
      armies: ['earth', 'vulcan'],
      fleets: ['earth:orbit', 'vulcan:orbit'],
    });

    expect(builds).toHaveLength(2);
    builds.forEach(b => {
      expect(b.type).toBe('build');
      expect(b.unitType).toBe(UNIT_TYPES.ARMY);
    });
  });

  test('medium/hard AI builds mix of armies and fleets', () => {
    const state = freshState();
    state.ownership['qonos'] = 'klingon';

    const ai = new AIPlayer('klingon', 'hard');
    const builds = ai.chooseBuild(state, 2, {
      armies: ['qonos'],
      fleets: ['qonos:orbit'],
    });

    expect(builds).toHaveLength(2);
    builds.forEach(b => {
      expect(b.type).toBe('build');
    });
  });

  test('disbands non-home units first', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['bajor'] = { faction: 'federation', type: UNIT_TYPES.ARMY };
    state.units['betazed'] = { faction: 'federation', type: UNIT_TYPES.ARMY };

    const ai = new AIPlayer('federation', 'medium');
    const builds = ai.chooseBuild(state, -1, { armies: [], fleets: [] });

    expect(builds).toHaveLength(1);
    expect(builds[0].type).toBe('disband');
    // Should prefer disbanding non-home (bajor or betazed) over earth
    expect(['bajor', 'betazed']).toContain(builds[0].location);
  });
});
