/**
 * STAR TREK DIPLOMACY - Game API Routes
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game-manager');

const games = new Map();

// Get game state
router.get('/:gameId', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game.getPublicState());
});

// Get game state for specific player (includes their private info)
router.get('/:gameId/player/:faction', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game.getPlayerState(req.params.faction));
});

// Submit orders
router.post('/:gameId/orders', (req, res) => {
    const { faction, orders } = req.body;
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

// Get available moves for a unit
router.get('/:gameId/moves/:location', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const moves = game.getAvailableMoves(req.params.location);
    res.json({ location: req.params.location, moves });
});

// Submit retreat orders
router.post('/:gameId/retreats', (req, res) => {
    const { faction, retreats } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const result = game.submitRetreats(faction, retreats);
    res.json(result);
});

// Submit builds/disbands
router.post('/:gameId/builds', (req, res) => {
    const { faction, builds } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const result = game.submitBuilds(faction, builds);
    res.json(result);
});

// Get turn history
router.get('/:gameId/history', (req, res) => {
    const game = games.get(req.params.gameId);
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    res.json(game.getHistory());
});

// Alliance actions
router.post('/:gameId/alliance/propose', (req, res) => {
    const { from, to, type } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const result = game.proposeAlliance(from, to, type);
    
    if (result.success) {
        const io = req.app.get('io');
        io.to(`game:${req.params.gameId}`).emit('alliance_proposed', {
            to,
            proposalId: result.proposal.id
        });
    }
    
    res.json(result);
});

router.post('/:gameId/alliance/respond', (req, res) => {
    const { proposalId, faction, accept } = req.body;
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

// Break alliance
router.post('/:gameId/alliance/break', (req, res) => {
    const { faction } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const result = game.alliances.breakAlliance(faction);
    
    if (result.success) {
        const io = req.app.get('io');
        io.to(`game:${req.params.gameId}`).emit('alliance_broken', {
            betrayer: faction,
            betrayed: result.betrayed
        });
    }
    
    res.json(result);
});

// Use faction ability
router.post('/:gameId/ability', (req, res) => {
    const { faction, ability, params } = req.body;
    const game = games.get(req.params.gameId);
    
    if (!game) {
        return res.status(404).json({ error: 'Game not found' });
    }
    
    const result = game.useAbility(faction, ability, params);
    res.json(result);
});

// Export for use in main server
module.exports = router;

// Also export games map for lobby routes to add games
module.exports.games = games;
