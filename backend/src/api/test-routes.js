/**
 * Test Routes - Development only
 * Creates test games with mock players for local testing
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game-manager');
const { games } = require('./game-routes');
const { saveGame, createGamePlayer, pool } = require('../database');
const { requireAuth } = require('../middleware/auth');

// Only available in development
if (process.env.NODE_ENV !== 'development') {
  router.use((req, res) => {
    res.status(404).json({ error: 'Test routes not available in production' });
  });
  module.exports = router;
  return;
}

// 7 test players - one for each faction
const TEST_PLAYERS = [
  { id: 'test-user-federation', name: 'Captain Picard', faction: 'federation' },
  { id: 'test-user-klingon', name: 'General Martok', faction: 'klingon' },
  { id: 'test-user-romulan', name: 'Commander Tomalak', faction: 'romulan' },
  { id: 'test-user-cardassian', name: 'Gul Dukat', faction: 'cardassian' },
  { id: 'test-user-ferengi', name: 'Grand Nagus Zek', faction: 'ferengi' },
  { id: 'test-user-breen', name: 'Thot Gor', faction: 'breen' },
  { id: 'test-user-gorn', name: 'Captain Slar', faction: 'gorn' },
];

// Get test players list
router.get('/players', (req, res) => {
  res.json({
    message: 'Test players for development',
    players: TEST_PLAYERS,
    usage: 'Use X-Test-User header with player id to authenticate as that player'
  });
});

// Create a test game with all 7 factions
router.post('/create-game', async (req, res) => {
  try {
    // Create game in memory
    const gameId = `test-game-${Date.now()}`;

    // Build playerFactions map { faction: playerName }
    const playerFactions = {};
    for (const player of TEST_PLAYERS) {
      playerFactions[player.faction] = player.name;
    }

    // GameManager constructor: (gameId, playerFactions, settings)
    const game = new GameManager(gameId, playerFactions, {
      turnTimerDays: 0, // No time limit for testing
    });

    // Store in games map
    games.set(gameId, game);

    // Save to database using existing database functions
    await saveGame(gameId, game.toJSON(), playerFactions);

    // Save player-game associations
    for (const player of TEST_PLAYERS) {
      await createGamePlayer(gameId, player.id, player.faction);
    }

    res.json({
      success: true,
      gameId,
      message: 'Test game created with 7 players',
      players: TEST_PLAYERS,
      gameState: game.getPublicState()
    });
  } catch (error) {
    console.error('Error creating test game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get state of a test game
router.get('/game/:gameId', (req, res) => {
  const { gameId } = req.params;
  const game = games.get(gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json({
    gameId,
    state: game.getPublicState(),
    players: TEST_PLAYERS
  });
});

// Submit orders/retreats/builds for a test player (phase-aware)
router.post('/game/:gameId/orders', async (req, res) => {
  const { gameId } = req.params;
  const { faction, orders } = req.body;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    let result;
    const phase = game.phase;

    if (phase === 'orders') {
      result = game.submitOrders(faction, orders);
    } else if (phase === 'retreats') {
      result = game.submitRetreats(faction, orders);
    } else if (phase === 'builds') {
      result = game.submitBuilds(faction, orders);
    } else {
      return res.status(400).json({ error: `Game is in '${phase}' phase` });
    }

    if (!result.success && result.reason) {
      return res.status(400).json({ error: result.reason });
    }

    res.json({
      success: true,
      phase,
      faction,
      ordersSubmitted: orders.length,
      allSubmitted: phase === 'orders' ? game.allOrdersSubmitted() : undefined,
      result
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Resolve turn (process all orders)
router.post('/game/:gameId/resolve', async (req, res) => {
  const { gameId } = req.params;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  try {
    const result = game.resolvePhase();

    // Save updated state to database
    await saveGame(gameId, game.toJSON(), game.playerFactions);

    res.json({
      success: true,
      result,
      newState: game.getPublicState()
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Join a test game as a real Clerk user (replaces the test user for that faction)
router.post('/game/:gameId/join', requireAuth, async (req, res) => {
  const { gameId } = req.params;
  const { faction } = req.body;
  const userId = req.auth.userId;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (!game.playerFactions[faction]) {
    return res.status(400).json({ error: `Invalid faction: ${faction}` });
  }

  try {
    // Remove old test user for this faction, then insert real user
    await pool.query(
      `DELETE FROM game_players WHERE game_id = $1 AND faction = $2`,
      [gameId, faction]
    );
    await createGamePlayer(gameId, userId, faction);

    res.json({
      success: true,
      gameId,
      faction,
      userId,
      message: `Joined game as ${faction}`,
    });
  } catch (error) {
    console.error('Error joining test game:', error);
    res.status(500).json({ error: error.message });
  }
});

// Auto-submit hold orders for all AI factions (everyone except the specified faction)
router.post('/game/:gameId/auto-orders', async (req, res) => {
  const { gameId } = req.params;
  const { exceptFaction } = req.body;

  const game = games.get(gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  if (game.phase !== 'orders') {
    return res.status(400).json({ error: `Game is in '${game.phase}' phase, not 'orders'` });
  }

  const submitted = [];
  for (const faction of Object.keys(game.playerFactions)) {
    if (faction === exceptFaction) continue;
    if (game.pendingOrders[faction]) continue;
    if (game.state.isEliminated(faction)) continue;

    game.autoSubmitHolds(faction);
    submitted.push(faction);
  }

  const allIn = game.allOrdersSubmitted();

  // Auto-resolve if all orders are in
  let resolution = null;
  if (allIn) {
    resolution = game.resolvePhase();
    await saveGame(gameId, game.toJSON(), game.playerFactions);

    // Emit socket event so frontend updates
    const io = req.app.get('io');
    if (io) {
      io.to(`game:${gameId}`).emit('phase_resolved', resolution);
    }
  }

  res.json({
    success: true,
    submitted,
    allSubmitted: allIn,
    resolution,
    newState: game.getPublicState(),
  });
});

// Reset/delete all test games
router.delete('/games', async (req, res) => {
  try {
    // Find and remove test games from memory
    const testGameIds = [];
    for (const [gameId, game] of games) {
      if (gameId.startsWith('test-game-')) {
        testGameIds.push(gameId);
        games.delete(gameId);
      }
    }

    // Remove from database
    if (testGameIds.length > 0) {
      await pool.query(
        `DELETE FROM game_players WHERE game_id = ANY($1)`,
        [testGameIds]
      );
      await pool.query(
        `DELETE FROM games WHERE game_id = ANY($1)`,
        [testGameIds]
      );
    }

    res.json({
      success: true,
      deletedGames: testGameIds.length,
      gameIds: testGameIds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
