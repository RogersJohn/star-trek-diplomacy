/**
 * Single-Player API Routes
 *
 * No authentication required. Games are stored in-memory only.
 */

const express = require('express');
const router = express.Router();
const SinglePlayerManager = require('../single-player-manager');

// In-memory game storage
const spGames = new Map();

// POST /create — Create a new single-player game
router.post('/create', (req, res) => {
  const { faction, difficulty = 'medium' } = req.body;

  if (!faction) {
    return res.status(400).json({ success: false, reason: 'Faction is required' });
  }

  try {
    const game = new SinglePlayerManager(faction, difficulty);
    spGames.set(game.gameId, game);

    res.json({
      success: true,
      gameId: game.gameId,
      gameState: game.getPublicState(),
      playerState: game.getHumanState(),
    });
  } catch (error) {
    res.status(500).json({ success: false, reason: error.message });
  }
});

// GET /:gameId/state — Get human player state
router.get('/:gameId/state', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  res.json({
    success: true,
    playerState: game.getHumanState(),
  });
});

// GET /:gameId/public — Get public game state
router.get('/:gameId/public', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  res.json({
    success: true,
    gameState: game.getPublicState(),
  });
});

// POST /:gameId/orders — Submit orders and resolve
router.post('/:gameId/orders', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  const { orders } = req.body;
  if (!orders || !Array.isArray(orders)) {
    return res.status(400).json({ success: false, reason: 'Orders array is required' });
  }

  const result = game.submitHumanOrders(orders);
  res.json(result);
});

// POST /:gameId/retreats — Submit retreats and resolve
router.post('/:gameId/retreats', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  const { retreats } = req.body;
  if (!retreats || !Array.isArray(retreats)) {
    return res.status(400).json({ success: false, reason: 'Retreats array is required' });
  }

  const result = game.submitHumanRetreats(retreats);
  res.json(result);
});

// POST /:gameId/builds — Submit builds and resolve
router.post('/:gameId/builds', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  const { builds } = req.body;
  if (!builds || !Array.isArray(builds)) {
    return res.status(400).json({ success: false, reason: 'Builds array is required' });
  }

  const result = game.submitHumanBuilds(builds);
  res.json(result);
});

// POST /:gameId/ability — Use a faction ability
router.post('/:gameId/ability', (req, res) => {
  const game = spGames.get(req.params.gameId);
  if (!game) return res.status(404).json({ success: false, reason: 'Game not found' });

  const { ability, abilityName, params } = req.body;
  const resolvedAbility = ability || abilityName;
  if (!resolvedAbility) {
    return res.status(400).json({ success: false, reason: 'ability is required' });
  }

  const result = game.useAbility(game.humanFaction, resolvedAbility, params || {});
  res.json(result);
});

// DELETE /:gameId — Delete a single-player game
router.delete('/:gameId', (req, res) => {
  const deleted = spGames.delete(req.params.gameId);
  res.json({ success: deleted });
});

module.exports = router;
