/**
 * STAR TREK DIPLOMACY - Game API Routes
 *
 * All mutation endpoints require authentication and faction ownership verification.
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game-manager');
const { getGameList } = require('../database');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { requireFactionOwnership, attachUserFaction } = require('../middleware/game-auth');

const games = new Map();

// Get list of all games (for reconnection)
router.get('/', async (req, res) => {
  try {
    const gameList = await getGameList();
    res.json({ success: true, games: gameList });
  } catch (error) {
    console.error('Error fetching game list:', error);
    res.status(500).json({ error: 'Failed to fetch game list' });
  }
});

// Get game state (public)
router.get('/:gameId', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game.getPublicState());
});

// Get game state for specific player (includes their private info)
// Requires auth to ensure only the faction owner can see their private state
router.get('/:gameId/player/:faction', requireAuth, attachUserFaction, (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Verify the authenticated user owns this faction
  if (req.userFaction !== req.params.faction) {
    return res.status(403).json({
      error: 'You can only view your own faction state',
      yourFaction: req.userFaction,
    });
  }

  res.json(game.getPlayerState(req.params.faction));
});

// Submit orders - requires auth + faction ownership
router.post('/:gameId/orders', requireAuth, requireFactionOwnership, (req, res) => {
  const { orders } = req.body;
  const faction = req.verifiedFaction; // Use server-verified faction
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.submitOrders(faction, orders);

  if (result.success) {
    // Notify other players via WebSocket
    const io = req.app.get('io');
    io.to(`game:${req.params.gameId}`).emit('orders_submitted', { faction });

    // Check if all orders are in
    if (game.allOrdersSubmitted()) {
      const resolution = game.resolvePhase();
      io.to(`game:${req.params.gameId}`).emit('phase_resolved', resolution);
    }
  }

  res.json(result);
});

// Get available moves for a unit (public info)
router.get('/:gameId/moves/:location', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const moves = game.getAvailableMoves(req.params.location);
  res.json({ location: req.params.location, moves });
});

// Submit retreat orders - requires auth + faction ownership
router.post('/:gameId/retreats', requireAuth, requireFactionOwnership, (req, res) => {
  const { retreats } = req.body;
  const faction = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.submitRetreats(faction, retreats);
  res.json(result);
});

// Submit builds/disbands - requires auth + faction ownership
router.post('/:gameId/builds', requireAuth, requireFactionOwnership, (req, res) => {
  const { builds } = req.body;
  const faction = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.submitBuilds(faction, builds);
  res.json(result);
});

// Get turn history (public info)
router.get('/:gameId/history', (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  res.json(game.getHistory());
});

// Propose alliance - requires auth + faction ownership
// Note: uses 'from' field as the faction
router.post('/:gameId/alliance/propose', requireAuth, async (req, res, next) => {
  // Remap 'from' to 'faction' for the middleware
  req.body.faction = req.body.from;
  next();
}, requireFactionOwnership, (req, res) => {
  const { to, type } = req.body;
  const from = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.proposeAlliance(from, to, type);

  if (result.success) {
    const io = req.app.get('io');
    io.to(`game:${req.params.gameId}`).emit('alliance_proposed', {
      to,
      proposalId: result.proposal.id,
    });
  }

  res.json(result);
});

// Respond to alliance proposal - requires auth + faction ownership
router.post('/:gameId/alliance/respond', requireAuth, requireFactionOwnership, (req, res) => {
  const { proposalId, accept } = req.body;
  const faction = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = accept
    ? game.acceptAlliance(proposalId, faction)
    : game.rejectAlliance(proposalId, faction);

  if (result.success && accept) {
    const io = req.app.get('io');
    io.to(`game:${req.params.gameId}`).emit('alliance_formed', result);
  }

  res.json(result);
});

// Break alliance - requires auth + faction ownership
router.post('/:gameId/alliance/break', requireAuth, requireFactionOwnership, (req, res) => {
  const faction = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.alliances.breakAlliance(faction);

  if (result.success) {
    const io = req.app.get('io');
    io.to(`game:${req.params.gameId}`).emit('alliance_broken', {
      betrayer: faction,
      betrayed: result.betrayed,
    });
  }

  res.json(result);
});

// Use faction ability - requires auth + faction ownership
router.post('/:gameId/ability', requireAuth, requireFactionOwnership, (req, res) => {
  const { ability, params } = req.body;
  const faction = req.verifiedFaction;
  const game = games.get(req.params.gameId);

  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const result = game.useAbility(faction, ability, params);
  res.json(result);
});

// Set Romulan spy target for this turn
router.post('/:gameId/spy-target', requireAuth, requireFactionOwnership, (req, res) => {
  const { targetFaction } = req.body;
  const game = games.get(req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });
  const result = game.setRomulanSpyTarget(req.verifiedFaction, targetFaction);
  res.json(result);
});

// Check deadline and identify delinquent players (can be called by any player in game)
router.post('/:gameId/check-deadline', requireAuth, attachUserFaction, async (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  // Must be a player in this game
  if (!req.userFaction) {
    return res.status(403).json({ error: 'You are not a player in this game' });
  }

  const result = game.checkDeadline();
  await game.saveToDatabase();

  // Notify all players if deadline expired
  if (result.expired) {
    const io = req.app.get('io');
    io.to(`game:${req.params.gameId}`).emit('deadline_expired', {
      delinquentPlayers: result.delinquentPlayers,
    });
  }

  res.json(result);
});

// Vote to kick a delinquent player - requires auth + faction ownership
// Note: uses 'votingFaction' field as the faction
router.post('/:gameId/vote-kick', requireAuth, async (req, res, next) => {
  // Remap 'votingFaction' to 'faction' for the middleware
  req.body.faction = req.body.votingFaction;
  next();
}, requireFactionOwnership, async (req, res) => {
  const game = games.get(req.params.gameId);
  if (!game) {
    return res.status(404).json({ error: 'Game not found' });
  }

  const { targetFaction } = req.body;
  const votingFaction = req.verifiedFaction;

  if (!targetFaction) {
    return res.status(400).json({ error: 'Target faction required' });
  }

  const result = game.initiateKickVote(targetFaction, votingFaction);
  await game.saveToDatabase();

  // Emit socket event for real-time update
  const io = req.app.get('io');
  io.to(`game:${req.params.gameId}`).emit('kick_vote_update', {
    targetFaction,
    votes: game.kickVotes[targetFaction] || [],
    kicked: result.kicked || false,
    kickedPlayers: game.kickedPlayers,
  });

  res.json(result);
});

// Export for use in main server
module.exports = router;

// Also export games map for lobby routes to add games
module.exports.games = games;
