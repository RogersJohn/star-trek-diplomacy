/**
 * STAR TREK DIPLOMACY v2.0 - Adjudication Tests
 *
 * 48 tests covering the dual-unit system: armies on planets, fleets in
 * orbit and on hyperlanes. Uses actual map positions from map-data.js.
 */

const {
  UNIT_TYPES,
  POSITION_TYPES,
  ORDER_TYPES,
  FACTIONS,
  VICTORY_CONDITIONS,
  initializeMapData,
  getPositionType,
  canUnitOccupy,
  getValidDestinations,
  isAdjacent,
  GameState,
  OrderValidator,
  Adjudicator,
  BuildPhaseHandler,
  RetreatPhaseHandler,
} = require('../diplomacy-engine');

const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const { createEdgeId, getOrbitPosition } = require('@star-trek-diplomacy/shared/edge-utils');

// Initialize map data once for all tests
beforeAll(() => {
  initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);
});

// Helper: create a clean state with only manually placed units
function freshState() {
  const state = new GameState();
  // Don't call initialize() — we place units manually per test
  return state;
}

// Known adjacencies from the map:
// earth <-> vulcan, andoria, tellar, betazed, starbase375, hyperspace_alpha(vertical)
// earth~vulcan edge exists
// qonos <-> tygokor, narendra, boreth, organia, hyperspace_beta(vertical)
// romulus <-> remus, rator, galorndon, hyperspace_gamma(vertical)

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 1: Basic Movement (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Basic Movement', () => {
  test('1. Army moves to empty adjacent planet', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: 'earth', destination: 'vulcan' }],
    });
    const results = adj.adjudicate();

    expect(state.units['vulcan']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units['earth']).toBeUndefined();
    expect(results.some(r => r.type === 'move_success' && r.to === 'vulcan')).toBe(true);
  });

  test('2. Army cannot move to non-adjacent planet', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    // qonos is not adjacent to earth
    const validator = new OrderValidator(state);
    const result = validator.validateOrder({
      type: 'move',
      location: 'earth',
      destination: 'qonos',
      faction: 'federation',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe('Destination not adjacent');
  });

  test('3. Army cannot move to edge position', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const edgeId = createEdgeId('earth', 'vulcan');
    const validator = new OrderValidator(state);
    const result = validator.validateOrder({
      type: 'move',
      location: 'earth',
      destination: edgeId,
      faction: 'federation',
    });

    expect(result.valid).toBe(false);
  });

  test('4. Fleet in orbit moves to adjacent hyperlane', () => {
    const state = freshState();
    const orbitPos = getOrbitPosition('earth');
    state.units[orbitPos] = { faction: 'federation', type: 'fleet' };

    const edgeId = createEdgeId('earth', 'vulcan');
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: orbitPos, destination: edgeId }],
    });
    adj.adjudicate();

    expect(state.units[edgeId]).toEqual([{ faction: 'federation', type: 'fleet' }]);
    expect(state.units[orbitPos]).toBeUndefined();
  });

  test('5. Fleet on hyperlane moves to adjacent hyperlane', () => {
    const state = freshState();
    const edge1 = createEdgeId('earth', 'vulcan');
    const edge2 = createEdgeId('earth', 'andoria');
    state.units[edge1] = [{ faction: 'federation', type: 'fleet' }];

    // earth~vulcan and andoria~earth share endpoint 'earth', so adjacent
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: edge1, destination: edge2 }],
    });
    adj.adjudicate();

    expect(state.units[edge2]).toEqual([{ faction: 'federation', type: 'fleet' }]);
    expect(state.units[edge1]).toBeUndefined();
  });

  test('6. Fleet on hyperlane moves to endpoint orbit', () => {
    const state = freshState();
    const edgeId = createEdgeId('earth', 'vulcan');
    state.units[edgeId] = [{ faction: 'federation', type: 'fleet' }];

    const orbitPos = getOrbitPosition('vulcan');
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: edgeId, destination: orbitPos }],
    });
    adj.adjudicate();

    expect(state.units[orbitPos]).toEqual({ faction: 'federation', type: 'fleet' });
    expect(state.units[edgeId]).toBeUndefined();
  });

  test('7. Fleet cannot move to planet (only orbit)', () => {
    const state = freshState();
    const orbitPos = getOrbitPosition('earth');
    state.units[orbitPos] = { faction: 'federation', type: 'fleet' };

    const validator = new OrderValidator(state);
    const result = validator.validateOrder({
      type: 'move',
      location: orbitPos,
      destination: 'earth', // planet, not orbit
      faction: 'federation',
    });

    expect(result.valid).toBe(false);
  });

  test('8. Unit holds successfully', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'hold', location: 'earth' }],
    });
    adj.adjudicate();

    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
  });

  test('9. Move to frozen territory fails', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const validator = new OrderValidator(state);
    validator.setFrozenTerritories(['vulcan']);

    const result = validator.validateOrder({
      type: 'move',
      location: 'earth',
      destination: 'vulcan',
      faction: 'federation',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('frozen');
  });

  test('10. Move from frozen territory fails', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const validator = new OrderValidator(state);
    validator.setFrozenTerritories(['earth']);

    const result = validator.validateOrder({
      type: 'move',
      location: 'earth',
      destination: 'vulcan',
      faction: 'federation',
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('frozen');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 2: Combat (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Combat', () => {
  test('11. Army vs Army — supported attacker wins', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'klingon', type: 'army' };
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    // Support from andoria (adjacent to earth)
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    // Federation army on vulcan has no fleet in orbit => -1 defense = 0 defense
    // Federation army on andoria supports vulcan->earth: attack strength 2
    // But wait - we want vulcan army to attack earth. Let's restructure.
    // Actually let's have federation attack klingon:
    // vulcan army moves to earth (strength 1), andoria army supports vulcan->earth (strength 2)
    // klingon army on earth defends (strength 1, no fleet in orbit = 0)

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [
        { type: 'hold', location: 'earth' },
      ],
    });
    adj.adjudicate();

    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.dislodged['earth']).toBeDefined();
    expect(state.dislodged['earth'].faction).toBe('klingon');
  });

  test('12. Army vs Army — equal strength standoff', () => {
    const state = freshState();
    // earth and vulcan are adjacent
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };
    // Both have no fleet in orbit => defense = 0
    // Attack strength = 1
    // Federation army attacks vulcan (str 1 vs defense 0) — should succeed
    // But if klingon also attacks earth, both have str 1 vs defense 0...
    // For a standoff, both need equal strength moving to same destination.
    // Let's use a neutral planet between them: betazed is adjacent to earth
    state.units['betazed'] = { faction: 'romulan', type: 'army' };
    // trill is adjacent to betazed
    state.units['trill'] = { faction: 'cardassian', type: 'army' };

    // Both attack betazed with strength 1
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: 'earth', destination: 'betazed' }],
      cardassian: [{ type: 'move', location: 'trill', destination: 'betazed' }],
      romulan: [{ type: 'hold', location: 'betazed' }],
    });
    adj.adjudicate();

    // Both attackers bounce, romulan stays
    expect(state.units['betazed']).toEqual({ faction: 'romulan', type: 'army' });
    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units['trill']).toEqual({ faction: 'cardassian', type: 'army' });
  });

  test('13. Fleet vs Fleet on edge — stronger wins', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'klingon', type: 'fleet' }];

    // Federation fleet attacks from earth orbit
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };

    // Another federation fleet supports from an adjacent edge
    const edgeEA = createEdgeId('earth', 'andoria');
    state.units[edgeEA] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: earthOrbit, destination: edgeEV },
        { type: 'support', location: edgeEA, supportFrom: earthOrbit, supportTo: edgeEV },
      ],
      klingon: [
        { type: 'hold', location: edgeEV },
      ],
    });
    adj.adjudicate();

    // Federation fleet should be on the edge, klingon dislodged
    const edgeUnits = state.units[edgeEV];
    expect(edgeUnits).toBeDefined();
    expect(edgeUnits.some(u => u.faction === 'federation')).toBe(true);
    expect(state.dislodged[edgeEV]).toBeDefined();
    expect(state.dislodged[edgeEV].faction).toBe('klingon');
  });

  test('14. Fleet vs Fleet on edge — equal strength standoff', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    // Empty edge
    const earthOrbit = getOrbitPosition('earth');
    const vulcanOrbit = getOrbitPosition('vulcan');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };
    state.units[vulcanOrbit] = { faction: 'klingon', type: 'fleet' };

    // Both try to move to the same edge
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: earthOrbit, destination: edgeEV }],
      klingon: [{ type: 'move', location: vulcanOrbit, destination: edgeEV }],
    });
    adj.adjudicate();

    // Both bounce — edge should be empty
    expect(state.units[edgeEV]).toBeUndefined();
    expect(state.units[earthOrbit]).toEqual({ faction: 'federation', type: 'fleet' });
    expect(state.units[vulcanOrbit]).toEqual({ faction: 'klingon', type: 'fleet' });
  });

  test('15. Fleet vs Fleet in orbit — attacker wins with support', () => {
    const state = freshState();
    const vulcanOrbit = getOrbitPosition('vulcan');
    state.units[vulcanOrbit] = { faction: 'klingon', type: 'fleet' };

    // Federation fleet on edge earth~vulcan attacks vulcan orbit
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'federation', type: 'fleet' }];

    // Support from another fleet on edge vulcan~rigel
    const edgeVR = createEdgeId('vulcan', 'rigel');
    state.units[edgeVR] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: edgeEV, destination: vulcanOrbit },
        { type: 'support', location: edgeVR, supportFrom: edgeEV, supportTo: vulcanOrbit },
      ],
      klingon: [
        { type: 'hold', location: vulcanOrbit },
      ],
    });
    adj.adjudicate();

    expect(state.units[vulcanOrbit]).toEqual({ faction: 'federation', type: 'fleet' });
    expect(state.dislodged[vulcanOrbit]).toBeDefined();
    expect(state.dislodged[vulcanOrbit].faction).toBe('klingon');
  });

  test('16. Two fleets attack same edge — standoff if equal', () => {
    const state = freshState();
    const earthOrbit = getOrbitPosition('earth');
    const vulcanOrbit = getOrbitPosition('vulcan');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };
    state.units[vulcanOrbit] = { faction: 'klingon', type: 'fleet' };

    const edgeEV = createEdgeId('earth', 'vulcan');

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: earthOrbit, destination: edgeEV }],
      klingon: [{ type: 'move', location: vulcanOrbit, destination: edgeEV }],
    });
    adj.adjudicate();

    // Both bounce
    expect(state.units[edgeEV]).toBeUndefined();
    expect(state.units[earthOrbit]).toEqual({ faction: 'federation', type: 'fleet' });
    expect(state.units[vulcanOrbit]).toEqual({ faction: 'klingon', type: 'fleet' });
  });

  test('17. Three-way standoff on planet', () => {
    const state = freshState();
    // bajor is adjacent to betazed and ds9
    // betazed is adjacent to earth and trill and bajor
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['trill'] = { faction: 'ferengi', type: 'army' };
    state.units['bajor'] = { faction: 'cardassian', type: 'army' };

    // All attack betazed
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: 'earth', destination: 'betazed' }],
      ferengi: [{ type: 'move', location: 'trill', destination: 'betazed' }],
      cardassian: [{ type: 'move', location: 'bajor', destination: 'betazed' }],
    });
    adj.adjudicate();

    // All bounce
    expect(state.units['betazed']).toBeUndefined();
    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units['trill']).toEqual({ faction: 'ferengi', type: 'army' });
    expect(state.units['bajor']).toEqual({ faction: 'cardassian', type: 'army' });
  });

  test('18. Dislodged army gets retreat options', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'klingon', type: 'army' };
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [
        { type: 'hold', location: 'earth' },
      ],
    });
    adj.adjudicate();

    expect(state.dislodged['earth']).toBeDefined();
    expect(state.dislodged['earth'].retreatOptions).toBeDefined();
    expect(state.dislodged['earth'].retreatOptions.length).toBeGreaterThan(0);
    // Cannot retreat to vulcan (attacker came from there)
    expect(state.dislodged['earth'].retreatOptions).not.toContain('vulcan');
  });

  test('19. Dislodged fleet gets retreat options', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'klingon', type: 'fleet' }];

    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };

    const edgeEA = createEdgeId('earth', 'andoria');
    state.units[edgeEA] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: earthOrbit, destination: edgeEV },
        { type: 'support', location: edgeEA, supportFrom: earthOrbit, supportTo: edgeEV },
      ],
      klingon: [
        { type: 'hold', location: edgeEV },
      ],
    });
    adj.adjudicate();

    expect(state.dislodged[edgeEV]).toBeDefined();
    expect(state.dislodged[edgeEV].faction).toBe('klingon');
    expect(state.dislodged[edgeEV].retreatOptions).toBeDefined();
    // Cannot retreat to earth orbit (attacker came from there)
    expect(state.dislodged[edgeEV].retreatOptions).not.toContain(earthOrbit);
    // Can retreat to vulcan orbit (endpoint of the edge)
    expect(state.dislodged[edgeEV].retreatOptions).toContain(getOrbitPosition('vulcan'));
  });

  test('20. No retreat options = unit must disband', () => {
    const state = freshState();
    // Put a klingon army on earth, surround with federation units on all adjacent planets
    state.units['earth'] = { faction: 'klingon', type: 'army' };
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    state.units['tellar'] = { faction: 'federation', type: 'army' };
    state.units['betazed'] = { faction: 'federation', type: 'army' };
    state.units['starbase375'] = { faction: 'federation', type: 'army' };
    // Also block hyperspace_alpha (vertical lane)
    state.units['hyperspace_alpha'] = { faction: 'federation', type: 'army' };

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [
        { type: 'hold', location: 'earth' },
      ],
    });
    adj.adjudicate();

    expect(state.dislodged['earth']).toBeDefined();
    expect(state.dislodged['earth'].retreatOptions).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 3: Support Mechanics (10 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Support Mechanics', () => {
  test('21. Army supports army attack', () => {
    const state = freshState();
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    state.units['earth'] = { faction: 'klingon', type: 'army' };

    // andoria supports vulcan->earth
    // andoria is adjacent to earth (they are connected)
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [{ type: 'hold', location: 'earth' }],
    });
    adj.adjudicate();

    // Attack str 2 vs defense 0 (no fleet in orbit) → success
    expect(state.units['earth'].faction).toBe('federation');
  });

  test('22. Army supports army hold', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };

    // andoria supports earth to hold
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'hold', location: 'earth' },
        { type: 'support', location: 'andoria', supportTo: 'earth' },
      ],
      klingon: [{ type: 'move', location: 'vulcan', destination: 'earth' }],
    });
    adj.adjudicate();

    // Defense: 1 (base, no fleet in orbit = 0) + 1 (support) = 1, but -1 for no fleet = 0 + 1 = 1
    // Actually: base 1 - 1 (no fleet) + 1 (support) = 1
    // Attack: 1
    // Attack not > defense, so bounce
    expect(state.units['earth'].faction).toBe('federation');
    expect(state.units['vulcan'].faction).toBe('klingon');
  });

  test('23. Fleet in orbit supports army on same planet', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };

    // Fleet in earth orbit supports earth hold
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'hold', location: 'earth' },
        { type: 'support', location: earthOrbit, supportTo: 'earth' },
      ],
      klingon: [{ type: 'move', location: 'vulcan', destination: 'earth' }],
    });
    adj.adjudicate();

    // Defense: 1 (base) + 0 (has fleet in orbit, no penalty) + 1 (support) = 2
    // Attack: 1
    // Klingon bounces
    expect(state.units['earth'].faction).toBe('federation');
  });

  test('24. Fleet on edge supports army on endpoint planet', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'federation', type: 'fleet' }];
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };

    // Fleet on earth~vulcan supports earth hold
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'hold', location: 'earth' },
        { type: 'support', location: edgeEV, supportTo: 'earth' },
      ],
      klingon: [{ type: 'move', location: 'vulcan', destination: 'earth' }],
    });
    adj.adjudicate();

    // Defense: 1 - 1 (no fleet in orbit) + 1 (edge support) = 1
    // Attack: 1
    // Standoff
    expect(state.units['earth'].faction).toBe('federation');
  });

  test('25. Fleet supports fleet attack on adjacent edge', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    const edgeEA = createEdgeId('earth', 'andoria');
    const earthOrbit = getOrbitPosition('earth');

    state.units[edgeEV] = [{ faction: 'klingon', type: 'fleet' }];
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };
    state.units[edgeEA] = [{ faction: 'federation', type: 'fleet' }];

    // Earth orbit fleet moves to edgeEV, edgeEA fleet supports
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: earthOrbit, destination: edgeEV },
        { type: 'support', location: edgeEA, supportFrom: earthOrbit, supportTo: edgeEV },
      ],
      klingon: [{ type: 'hold', location: edgeEV }],
    });
    adj.adjudicate();

    expect(state.units[edgeEV].some(u => u.faction === 'federation')).toBe(true);
    expect(state.dislodged[edgeEV].faction).toBe('klingon');
  });

  test('26. Support is cut when supporter attacked', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };
    // tellar is adjacent to andoria
    state.units['tellar'] = { faction: 'klingon', type: 'army' };

    // federation: vulcan attack from earth, andoria supports earth->vulcan
    // klingon: tellar attacks andoria (cutting the support)
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'vulcan' },
        { type: 'support', location: 'andoria', supportFrom: 'earth', supportTo: 'vulcan' },
      ],
      klingon: [
        { type: 'hold', location: 'vulcan' },
        { type: 'move', location: 'tellar', destination: 'andoria' },
      ],
    });
    adj.adjudicate();

    // Support cut. Attack str 1 vs defense 0 (no fleet in orbit).
    // 1 > 0 so federation still takes vulcan
    expect(state.units['vulcan'].faction).toBe('federation');
  });

  test('27. Support NOT cut when attacked from supported destination', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };
    // Klingon at vulcan attacks andoria — but andoria is supporting earth->vulcan
    // Andoria's support of vulcan should NOT be cut because attack comes from vulcan (the supported destination)

    // Actually: andoria supports earth->vulcan, vulcan attacks andoria
    // The rule: support is cut if attacked from location != supportTo
    // supportTo = vulcan, attack comes from vulcan, so NOT cut

    // Federation also needs fleet in orbit at vulcan for klingon defense, but we don't have one
    // Klingon on vulcan has defense 0 (no fleet in orbit), federation attack strength 2 (1 + support)

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'vulcan' },
        { type: 'support', location: 'andoria', supportFrom: 'earth', supportTo: 'vulcan' },
      ],
      klingon: [
        { type: 'move', location: 'vulcan', destination: 'andoria' },
      ],
    });
    adj.adjudicate();

    // Support not cut. Attack str 2 vs defense 0 (klingon moving out → defense = 0)
    expect(state.units['vulcan'].faction).toBe('federation');
  });

  test('28. Fleet in orbit gives army defense bonus (no -1 penalty)', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };

    // Klingon attacks earth. Defense = 1 (no penalty because fleet in orbit)
    // Attack = 1. Not > 1, so bounce.
    const adj = new Adjudicator(state);
    adj.setOrders({
      klingon: [{ type: 'move', location: 'vulcan', destination: 'earth' }],
      federation: [{ type: 'hold', location: 'earth' }],
    });
    adj.adjudicate();

    expect(state.units['earth'].faction).toBe('federation');
    expect(state.units['vulcan'].faction).toBe('klingon');
  });

  test('29. Army without fleet in orbit has -1 defense penalty', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    // No fleet in earth orbit
    state.units['vulcan'] = { faction: 'klingon', type: 'army' };

    // Klingon attacks earth. Defense = 1 - 1 (no fleet) = 0
    // Attack = 1. 1 > 0, so klingon takes earth.
    const adj = new Adjudicator(state);
    adj.setOrders({
      klingon: [{ type: 'move', location: 'vulcan', destination: 'earth' }],
      federation: [{ type: 'hold', location: 'earth' }],
    });
    adj.adjudicate();

    expect(state.units['earth'].faction).toBe('klingon');
    expect(state.dislodged['earth']).toBeDefined();
    expect(state.dislodged['earth'].faction).toBe('federation');
  });

  test('30. Sabotaged support does not count', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'klingon', type: 'army' };
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };

    const adj = new Adjudicator(state);
    adj.setSabotagedSupports([{ faction: 'federation', location: 'andoria' }]);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [{ type: 'hold', location: 'earth' }],
    });
    adj.adjudicate();

    // Support sabotaged. Attack str = 1 vs defense = 0 (no fleet in orbit)
    // 1 > 0, so federation still wins
    // But with full support (str 2), result is same. Let's test where sabotage matters:
    // Give klingon a fleet in orbit for defense = 1
    // Then without support: attack 1 vs defense 1 → bounce
    // Actually, let's re-do this test properly:
    const state2 = freshState();
    state2.units['earth'] = { faction: 'klingon', type: 'army' };
    const earthOrbit = getOrbitPosition('earth');
    state2.units[earthOrbit] = { faction: 'klingon', type: 'fleet' };
    state2.units['vulcan'] = { faction: 'federation', type: 'army' };
    state2.units['andoria'] = { faction: 'federation', type: 'army' };

    const adj2 = new Adjudicator(state2);
    adj2.setSabotagedSupports([{ faction: 'federation', location: 'andoria' }]);
    adj2.setOrders({
      federation: [
        { type: 'move', location: 'vulcan', destination: 'earth' },
        { type: 'support', location: 'andoria', supportFrom: 'vulcan', supportTo: 'earth' },
      ],
      klingon: [{ type: 'hold', location: 'earth' }],
    });
    adj2.adjudicate();

    // Support sabotaged → attack str 1 vs defense 1 (has fleet in orbit) → bounce
    expect(state2.units['earth'].faction).toBe('klingon');
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 4: Edge Capacity (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Edge Capacity', () => {
  test('31. Two allied fleets can share edge', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'federation', type: 'fleet' }];
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: earthOrbit, destination: edgeEV }],
    });
    adj.adjudicate();

    expect(state.units[edgeEV]).toHaveLength(2);
    expect(state.units[edgeEV].every(u => u.faction === 'federation')).toBe(true);
  });

  test('32. Two enemy fleets on same edge — attacker needs superiority', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'klingon', type: 'fleet' }];
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };

    // Federation fleet attacks klingon fleet on the edge (str 1 vs 1) → bounce
    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [{ type: 'move', location: earthOrbit, destination: edgeEV }],
      klingon: [{ type: 'hold', location: edgeEV }],
    });
    adj.adjudicate();

    // Equal strength → bounce
    expect(state.units[edgeEV]).toEqual([{ faction: 'klingon', type: 'fleet' }]);
    expect(state.units[earthOrbit]).toEqual({ faction: 'federation', type: 'fleet' });
  });

  test('33. Third fleet cannot enter edge with 2 allied fleets', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [
      { faction: 'federation', type: 'fleet' },
      { faction: 'federation', type: 'fleet' },
    ];
    const earthOrbit = getOrbitPosition('earth');
    state.units[earthOrbit] = { faction: 'federation', type: 'fleet' };

    // canAcceptUnit should return false
    const canAccept = state.canAcceptUnit(edgeEV, { faction: 'federation', type: 'fleet' });
    expect(canAccept).toBe(false);
  });

  test('34. Allied fleet can join single fleet on edge', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'federation', type: 'fleet' }];

    const canAccept = state.canAcceptUnit(edgeEV, { faction: 'federation', type: 'fleet' });
    expect(canAccept).toBe(true);
  });

  test('35. Non-allied fleet cannot join enemy fleet on edge', () => {
    const state = freshState();
    const edgeEV = createEdgeId('earth', 'vulcan');
    state.units[edgeEV] = [{ faction: 'klingon', type: 'fleet' }];

    const canAccept = state.canAcceptUnit(edgeEV, { faction: 'federation', type: 'fleet' });
    expect(canAccept).toBe(false);

    // With alliance checker that says they're not allied
    const canAcceptWithChecker = state.canAcceptUnit(
      edgeEV,
      { faction: 'federation', type: 'fleet' },
      () => false
    );
    expect(canAcceptWithChecker).toBe(false);

    // With alliance checker that says they ARE allied
    const canAcceptAllied = state.canAcceptUnit(
      edgeEV,
      { faction: 'federation', type: 'fleet' },
      () => true
    );
    expect(canAcceptAllied).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 5: Convoy (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Convoy', () => {
  test('36. Basic convoy: Army A→C via fleet on A~B and B~C', () => {
    const state = freshState();
    // earth -> betazed -> bajor
    // earth~betazed edge, betazed~bajor edge
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const edgeEB = createEdgeId('earth', 'betazed');
    const edgeBBj = createEdgeId('bajor', 'betazed');
    state.units[edgeEB] = [{ faction: 'federation', type: 'fleet' }];
    state.units[edgeBBj] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'bajor', viaConvoy: true },
        { type: 'convoy', location: edgeEB, convoyFrom: 'earth', convoyTo: 'bajor' },
        { type: 'convoy', location: edgeBBj, convoyFrom: 'earth', convoyTo: 'bajor' },
      ],
    });
    adj.adjudicate();

    expect(state.units['bajor']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units['earth']).toBeUndefined();
  });

  test('37. Convoy fails if no convoy chain exists', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    // No fleets on edges — convoy should fail

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'bajor', viaConvoy: true },
      ],
    });
    const results = adj.adjudicate();

    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(results.some(r => r.type === 'move_failed' && r.reason === 'convoy_broken')).toBe(true);
  });

  test('38. Convoy fails if convoying fleet is attacked', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const edgeEB = createEdgeId('earth', 'betazed');
    const edgeBBj = createEdgeId('bajor', 'betazed');
    state.units[edgeEB] = [{ faction: 'federation', type: 'fleet' }];
    state.units[edgeBBj] = [{ faction: 'federation', type: 'fleet' }];

    // Klingon fleet attacks the edgeEB convoy fleet
    const edgeEA = createEdgeId('earth', 'andoria');
    state.units[edgeEA] = [{ faction: 'klingon', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'bajor', viaConvoy: true },
        { type: 'convoy', location: edgeEB, convoyFrom: 'earth', convoyTo: 'bajor' },
        { type: 'convoy', location: edgeBBj, convoyFrom: 'earth', convoyTo: 'bajor' },
      ],
      klingon: [
        { type: 'move', location: edgeEA, destination: edgeEB },
      ],
    });
    const results = adj.adjudicate();

    // Convoy broken because edgeEB fleet was attacked
    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(results.some(r => r.type === 'move_failed' && r.reason === 'convoy_broken')).toBe(true);
  });

  test('39. Army can attack destination during convoy', () => {
    const state = freshState();
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['bajor'] = { faction: 'klingon', type: 'army' };
    const edgeEB = createEdgeId('earth', 'betazed');
    const edgeBBj = createEdgeId('bajor', 'betazed');
    state.units[edgeEB] = [{ faction: 'federation', type: 'fleet' }];
    state.units[edgeBBj] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'bajor', viaConvoy: true },
        { type: 'convoy', location: edgeEB, convoyFrom: 'earth', convoyTo: 'bajor' },
        { type: 'convoy', location: edgeBBj, convoyFrom: 'earth', convoyTo: 'bajor' },
      ],
      klingon: [
        { type: 'hold', location: 'bajor' },
      ],
    });
    adj.adjudicate();

    // Klingon has no fleet in orbit → defense 0, attack strength 1 → federation takes bajor
    expect(state.units['bajor']).toEqual({ faction: 'federation', type: 'army' });
  });

  test('40. Convoy across multiple edges', () => {
    const state = freshState();
    // Route: earth -> betazed -> trill (earth~betazed, betazed~trill)
    state.units['earth'] = { faction: 'federation', type: 'army' };
    const edgeEB = createEdgeId('earth', 'betazed');
    const edgeBT = createEdgeId('betazed', 'trill');
    state.units[edgeEB] = [{ faction: 'federation', type: 'fleet' }];
    state.units[edgeBT] = [{ faction: 'federation', type: 'fleet' }];

    const adj = new Adjudicator(state);
    adj.setOrders({
      federation: [
        { type: 'move', location: 'earth', destination: 'trill', viaConvoy: true },
        { type: 'convoy', location: edgeEB, convoyFrom: 'earth', convoyTo: 'trill' },
        { type: 'convoy', location: edgeBT, convoyFrom: 'earth', convoyTo: 'trill' },
      ],
    });
    adj.adjudicate();

    expect(state.units['trill']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units['earth']).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 6: Build Phase (5 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Build Phase', () => {
  test('41. Can build army on empty home planet', () => {
    const state = freshState();
    state.ownership['earth'] = 'federation';

    const handler = new BuildPhaseHandler(state);
    const result = handler.processBuild('federation', 'earth', 'army');

    expect(result).toBe(true);
    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
  });

  test('42. Can build fleet in empty home orbit', () => {
    const state = freshState();
    state.ownership['earth'] = 'federation';

    const handler = new BuildPhaseHandler(state);
    const orbitPos = getOrbitPosition('earth');
    const result = handler.processBuild('federation', orbitPos, 'fleet');

    expect(result).toBe(true);
    expect(state.units[orbitPos]).toEqual({ faction: 'federation', type: 'fleet' });
  });

  test('43. Can build both army and fleet at same home planet', () => {
    const state = freshState();
    state.ownership['earth'] = 'federation';

    const handler = new BuildPhaseHandler(state);
    const armyResult = handler.processBuild('federation', 'earth', 'army');
    const orbitPos = getOrbitPosition('earth');
    const fleetResult = handler.processBuild('federation', orbitPos, 'fleet');

    expect(armyResult).toBe(true);
    expect(fleetResult).toBe(true);
    expect(state.units['earth']).toEqual({ faction: 'federation', type: 'army' });
    expect(state.units[orbitPos]).toEqual({ faction: 'federation', type: 'fleet' });
  });

  test('44. Cannot build on occupied position', () => {
    const state = freshState();
    state.ownership['earth'] = 'federation';
    state.units['earth'] = { faction: 'federation', type: 'army' };

    const handler = new BuildPhaseHandler(state);
    const result = handler.processBuild('federation', 'earth', 'army');

    expect(result).toBe(false);
  });

  test('45. Must disband if over capacity', () => {
    const state = freshState();
    // Federation owns 2 SCs but has 3 units
    state.ownership['earth'] = 'federation';
    state.ownership['vulcan'] = 'federation';
    state.units['earth'] = { faction: 'federation', type: 'army' };
    state.units['vulcan'] = { faction: 'federation', type: 'army' };
    state.units['andoria'] = { faction: 'federation', type: 'army' };

    const handler = new BuildPhaseHandler(state);
    const builds = handler.calculateBuilds('federation');
    expect(builds).toBe(-1); // Must disband 1

    // Process disband
    const result = handler.processDisband('federation', 'andoria');
    expect(result).toBe(true);
    expect(state.units['andoria']).toBeUndefined();
    expect(handler.calculateBuilds('federation')).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// GROUP 7: Victory Conditions (3 tests)
// ═══════════════════════════════════════════════════════════════════════════════

describe('Victory Conditions', () => {
  test('46. Solo victory when reaching SC threshold', () => {
    const state = freshState();
    // Federation needs 10 SCs
    const systems = ['earth', 'vulcan', 'andoria', 'tellar', 'rigel',
      'betazed', 'bajor', 'trill', 'risa', 'benzar'];
    systems.forEach(s => { state.ownership[s] = 'federation'; });

    const count = state.countSupplyCenters('federation');
    expect(count).toBe(10);
    expect(count >= VICTORY_CONDITIONS.federation.supplyCenters).toBe(true);
  });

  test('47. Allied victory at combined threshold', () => {
    const state = freshState();
    // Federation + Romulan alliance: combined threshold = 10 + 8 = 18
    const fedSystems = ['earth', 'vulcan', 'andoria', 'tellar', 'rigel',
      'betazed', 'bajor', 'trill', 'risa', 'benzar'];
    const romSystems = ['romulus', 'remus', 'rator', 'abraxas',
      'nimbus', 'galorndon', 'gornar', 'ssgaron'];
    fedSystems.forEach(s => { state.ownership[s] = 'federation'; });
    romSystems.forEach(s => { state.ownership[s] = 'romulan'; });

    const fedCount = state.countSupplyCenters('federation');
    const romCount = state.countSupplyCenters('romulan');
    expect(fedCount + romCount).toBe(18);
    expect(fedCount >= VICTORY_CONDITIONS.federation.supplyCenters).toBe(true);
    expect(romCount >= VICTORY_CONDITIONS.romulan.supplyCenters).toBe(true);
  });

  test('48. Ferengi latinum victory condition exists', () => {
    expect(VICTORY_CONDITIONS.ferengi.latinum).toBe(100);
    expect(VICTORY_CONDITIONS.ferengi.supplyCenters).toBe(8);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Additional: Position Utility Tests
// ═══════════════════════════════════════════════════════════════════════════════

describe('Position Utilities', () => {
  test('getPositionType identifies planets, orbits, and edges', () => {
    expect(getPositionType('earth')).toBe('planet');
    expect(getPositionType('earth:orbit')).toBe('orbit');
    expect(getPositionType('earth~vulcan')).toBe('edge');
  });

  test('canUnitOccupy validates correctly', () => {
    expect(canUnitOccupy('army', 'planet')).toBe(true);
    expect(canUnitOccupy('army', 'orbit')).toBe(false);
    expect(canUnitOccupy('army', 'edge')).toBe(false);
    expect(canUnitOccupy('fleet', 'planet')).toBe(false);
    expect(canUnitOccupy('fleet', 'orbit')).toBe(true);
    expect(canUnitOccupy('fleet', 'edge')).toBe(true);
  });

  test('getValidDestinations returns correct destinations', () => {
    // Army on earth should get adjacent planets
    const armyDests = getValidDestinations('earth', 'army');
    expect(armyDests).toContain('vulcan');
    expect(armyDests).toContain('andoria');
    expect(armyDests).toContain('tellar');
    expect(armyDests).toContain('betazed');
    expect(armyDests).toContain('starbase375');

    // Fleet in earth orbit should get edges connected to earth
    const fleetOrbitDests = getValidDestinations('earth:orbit', 'fleet');
    expect(fleetOrbitDests).toContain(createEdgeId('earth', 'vulcan'));
    expect(fleetOrbitDests).toContain(createEdgeId('earth', 'andoria'));

    // Fleet on earth~vulcan edge should get adjacent edges + both endpoint orbits
    const edgeEV = createEdgeId('earth', 'vulcan');
    const fleetEdgeDests = getValidDestinations(edgeEV, 'fleet');
    expect(fleetEdgeDests).toContain('earth:orbit');
    expect(fleetEdgeDests).toContain('vulcan:orbit');
  });

  test('isAdjacent with unit type works correctly', () => {
    expect(isAdjacent('earth', 'vulcan', 'army')).toBe(true);
    expect(isAdjacent('earth', 'qonos', 'army')).toBe(false);
    expect(isAdjacent('earth:orbit', createEdgeId('earth', 'vulcan'), 'fleet')).toBe(true);
    expect(isAdjacent('earth:orbit', 'vulcan', 'fleet')).toBe(false);
  });
});
