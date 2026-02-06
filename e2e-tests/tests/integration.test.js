/**
 * API Integration Tests - Full Game Loop
 *
 * Exercises: create game → orders → resolution → retreats → builds → turn advancement
 * No browser/Selenium required - pure HTTP against the backend.
 */

const {
  createTestGame,
  getGameState,
  submitOrders,
  autoSubmitOrders,
  resolveTurn,
  cleanupTestGames,
  waitForBackend,
} = require('../helpers/api');

describe('Full Game Loop (API Integration)', () => {
  let gameId;

  beforeAll(async () => {
    await waitForBackend();
  });

  afterAll(async () => {
    await cleanupTestGames();
  });

  // -------------------------------------------------------
  // Test 1: Create game, verify initial state
  // -------------------------------------------------------
  test('create game with 7 factions at spring turn 1', async () => {
    const result = await createTestGame();
    gameId = result.gameId;
    expect(gameId).toBeDefined();

    const { state } = await getGameState(gameId);

    // 7 factions playing
    const factions = Object.keys(state.supplyCounts);
    expect(factions).toHaveLength(7);
    expect(factions).toEqual(
      expect.arrayContaining([
        'federation', 'klingon', 'romulan',
        'cardassian', 'ferengi', 'breen', 'gorn',
      ])
    );

    // Initial turn state
    expect(state.turn).toBe(1);
    expect(state.season).toBe('spring');
    expect(state.phase).toBe('orders');
    expect(state.year).toBe(2370);

    // Federation starts with 5 units
    const fedUnits = Object.entries(state.units)
      .filter(([, u]) => u.faction === 'federation');
    expect(fedUnits).toHaveLength(5);

    // Betazed starts unoccupied
    expect(state.units['betazed']).toBeUndefined();
  });

  // -------------------------------------------------------
  // Test 2: Spring orders — Federation moves earth→betazed
  // -------------------------------------------------------
  test('spring orders: Federation moves to betazed, AI holds', async () => {
    // Federation: move earth → betazed, hold everything else
    const fedUnits = await getFactionUnits(gameId, 'federation');
    const orders = fedUnits.map(loc => {
      if (loc === 'earth') {
        return { type: 'move', location: loc, destination: 'betazed' };
      }
      return { type: 'hold', location: loc };
    });

    await submitOrders(gameId, 'federation', orders);

    // Auto-submit holds for the other 6 factions + auto-resolve
    const result = await autoSubmitOrders(gameId, 'federation');
    expect(result.allSubmitted).toBe(true);
    expect(result.resolution).toBeDefined();

    // Verify post-resolution state
    const { state } = await getGameState(gameId);

    // Spring resolved → advances to fall, same year
    expect(state.season).toBe('fall');
    expect(state.turn).toBe(2);
    expect(state.phase).toBe('orders');

    // Federation fleet should now be in betazed
    expect(state.units['betazed']).toBeDefined();
    expect(state.units['betazed'].faction).toBe('federation');

    // Earth should be empty (unit moved out)
    expect(state.units['earth']).toBeUndefined();

    // No retreats (uncontested move into empty system)
    expect(state.dislodged).toEqual([]);
  });

  // -------------------------------------------------------
  // Test 3: Fall orders — everyone holds → builds phase
  // -------------------------------------------------------
  test('fall orders: all hold, advances to builds phase', async () => {
    // All factions hold — auto-orders with no exception
    const result = await autoSubmitOrders(gameId);
    expect(result.allSubmitted).toBe(true);

    const { state } = await getGameState(gameId);

    // Fall resolved → builds phase (not yet next turn)
    expect(state.phase).toBe('builds');
    expect(state.season).toBe('fall');

    // Ownership updated: Federation should now own betazed
    expect(state.ownership['betazed']).toBe('federation');

    // Federation: 5 home + betazed = 6 SCs, 5 units → needs 1 build
    expect(state.supplyCounts['federation']).toBe(6);
  });

  // -------------------------------------------------------
  // Test 4: Builds — Federation builds fleet at earth
  // -------------------------------------------------------
  test('builds: Federation builds fleet at earth, advances to next year', async () => {
    // Federation builds a fleet at earth (home system, empty, controlled)
    const buildOrders = [
      { type: 'build', location: 'earth', unitType: 'fleet' },
    ];

    // submitOrders is phase-aware — it routes to submitBuilds when phase=builds
    const result = await submitOrders(gameId, 'federation', buildOrders);
    expect(result.success).toBe(true);

    // Should auto-resolve (Federation is the only faction needing builds)
    const { state } = await getGameState(gameId);

    // Builds resolved → advance turn → spring of next year
    expect(state.phase).toBe('orders');
    expect(state.season).toBe('spring');
    expect(state.year).toBe(2371);
    expect(state.turn).toBe(3);

    // Federation now has 6 units (5 original + 1 built)
    const fedUnits = Object.entries(state.units)
      .filter(([, u]) => u.faction === 'federation');
    expect(fedUnits).toHaveLength(6);

    // New fleet at earth
    expect(state.units['earth']).toBeDefined();
    expect(state.units['earth'].faction).toBe('federation');
    expect(state.units['earth'].type).toBe('fleet');
  });

  // -------------------------------------------------------
  // Test 5: Supply center ownership persisted
  // -------------------------------------------------------
  test('supply center ownership persists across turns', async () => {
    const { state } = await getGameState(gameId);

    // Federation still owns betazed after turn advancement
    expect(state.ownership['betazed']).toBe('federation');
    expect(state.supplyCounts['federation']).toBe(6);

    // Other factions unchanged (still own their home systems)
    expect(state.supplyCounts['klingon']).toBeGreaterThanOrEqual(4);
    expect(state.supplyCounts['romulan']).toBeGreaterThanOrEqual(4);
  });

  // -------------------------------------------------------
  // Test 6: Cleanup
  // -------------------------------------------------------
  test('cleanup deletes test games', async () => {
    const result = await cleanupTestGames();
    expect(result.success).toBe(true);
    expect(result.deletedGames).toBeGreaterThanOrEqual(1);
  });
});

// -------------------------------------------------------
// Helper: get unit locations for a faction
// -------------------------------------------------------
async function getFactionUnits(gameId, faction) {
  const { state } = await getGameState(gameId);
  return Object.entries(state.units)
    .filter(([, u]) => u.faction === faction)
    .map(([loc]) => loc);
}
