/**
 * Single-Player Integration Tests
 *
 * Tests the full SinglePlayerManager flow: create game, submit orders,
 * verify resolution, play multiple turns, test each difficulty level,
 * and test per-faction difficulty configuration.
 */

const {
  initializeMapData,
  FACTIONS,
  UNIT_TYPES,
} = require('../../diplomacy-engine');
const { SYSTEMS, HYPERLANES, VERTICAL_LANES } = require('@star-trek-diplomacy/shared');
const SinglePlayerManager = require('../../../single-player-manager');

beforeAll(() => {
  initializeMapData(SYSTEMS, HYPERLANES, VERTICAL_LANES);
});

describe('SinglePlayerManager', () => {
  test('creates a game with correct initial state', () => {
    const game = new SinglePlayerManager('federation', 'easy');

    expect(game.humanFaction).toBe('federation');
    expect(game.phase).toBe('orders');

    const state = game.getPublicState();
    expect(state.turn).toBe(1);
    expect(state.season).toBe('spring');

    const playerState = game.getHumanState();
    expect(playerState.myFaction).toBe('federation');
    expect(playerState.myUnits.length).toBeGreaterThan(0);
  });

  test('submits human orders and resolves turn', () => {
    const game = new SinglePlayerManager('federation', 'easy');
    const units = game.state.getUnits('federation');

    // Simple hold orders for all units
    const orders = units.map(u => ({
      type: 'hold',
      location: u.position,
    }));

    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);
    expect(result.resolution).toBeDefined();
    expect(result.gameState).toBeDefined();
    expect(result.playerState).toBeDefined();
  });

  test('plays 4 turns without crashing', () => {
    const game = new SinglePlayerManager('klingon', 'medium');

    for (let turn = 0; turn < 4; turn++) {
      if (game.phase === 'ended') break;

      if (game.phase === 'orders') {
        const units = game.state.getUnits('klingon');
        const orders = units.map(u => ({
          type: 'hold',
          location: u.position,
        }));

        const result = game.submitHumanOrders(orders);
        expect(result.success).toBe(true);
      }

      // Handle retreats if needed
      if (game.phase === 'retreats') {
        const playerState = game.getHumanState();
        if (playerState.myDislodged && playerState.myDislodged.length > 0) {
          const retreats = playerState.myDislodged.map(d => {
            if (d.retreatOptions.length > 0) {
              return { from: d.location, to: d.retreatOptions[0], type: 'retreat' };
            }
            return { location: d.location, type: 'disband' };
          });
          game.submitHumanRetreats(retreats);
        }
      }

      // Handle builds if needed
      if (game.phase === 'builds') {
        const playerState = game.getHumanState();
        const buildCount = playerState.buildCount;

        if (buildCount > 0) {
          const locs = playerState.buildLocations;
          const builds = [];
          let remaining = buildCount;
          for (const loc of (locs.armies || [])) {
            if (remaining <= 0) break;
            builds.push({ type: 'build', location: loc, unitType: 'army' });
            remaining--;
          }
          game.submitHumanBuilds(builds);
        } else if (buildCount < 0) {
          const units = game.state.getUnits('klingon');
          const builds = [];
          let toDisband = Math.abs(buildCount);
          for (const unit of units) {
            if (toDisband <= 0) break;
            builds.push({ type: 'disband', location: unit.position });
            toDisband--;
          }
          game.submitHumanBuilds(builds);
        } else {
          game.submitHumanBuilds([]);
        }
      }
    }

    // Game should still be in a valid state
    const state = game.getPublicState();
    expect(state.turn).toBeGreaterThanOrEqual(1);
  });

  test('works with easy difficulty', () => {
    const game = new SinglePlayerManager('romulan', 'easy');
    const units = game.state.getUnits('romulan');
    const orders = units.map(u => ({ type: 'hold', location: u.position }));

    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);
  });

  test('works with medium difficulty', () => {
    const game = new SinglePlayerManager('cardassian', 'medium');
    const units = game.state.getUnits('cardassian');
    const orders = units.map(u => ({ type: 'hold', location: u.position }));

    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);
  });

  test('works with hard difficulty', () => {
    const game = new SinglePlayerManager('ferengi', 'hard');
    const units = game.state.getUnits('ferengi');
    const orders = units.map(u => ({ type: 'hold', location: u.position }));

    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);
  });

  test('works with per-faction difficulty object', () => {
    const game = new SinglePlayerManager('gorn', {
      federation: 'hard',
      klingon: 'hard',
      romulan: 'medium',
      cardassian: 'medium',
      ferengi: 'easy',
      breen: 'easy',
    });

    const units = game.state.getUnits('gorn');
    const orders = units.map(u => ({ type: 'hold', location: u.position }));

    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);
  });

  test('saveToDatabase is a no-op', async () => {
    const game = new SinglePlayerManager('federation', 'easy');
    // Should not throw
    await game.saveToDatabase();
  });

  test('AI generates valid orders that pass validation', () => {
    const game = new SinglePlayerManager('breen', 'medium');
    const units = game.state.getUnits('breen');
    const orders = units.map(u => ({ type: 'hold', location: u.position }));

    // This submits human orders then AI orders and resolves
    const result = game.submitHumanOrders(orders);
    expect(result.success).toBe(true);

    // If we got here without errors, AI orders passed validation
    // Check that resolution happened
    expect(result.resolution).toBeDefined();
  });
});
