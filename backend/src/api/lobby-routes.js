/**
 * STAR TREK DIPLOMACY - Lobby API Routes
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game-manager');
const { games } = require('./game-routes');

// In-memory lobby storage (replace with database in production)
const lobbies = new Map();

// Create a new lobby
router.post('/create', (req, res) => {
    const { hostName, settings } = req.body;
    
    const lobbyId = generateLobbyId();
    const lobby = {
        id: lobbyId,
        host: hostName,
        players: [{ name: hostName, faction: null, ready: false }],
        settings: {
            turnTimer: settings?.turnTimer || 24 * 60 * 60 * 1000, // 24 hours default
            allowSpectators: settings?.allowSpectators ?? true,
            ...settings
        },
        status: 'waiting',
        createdAt: new Date().toISOString()
    };
    
    lobbies.set(lobbyId, lobby);
    
    res.json({ success: true, lobby });
});

// Join a lobby
router.post('/:lobbyId/join', (req, res) => {
    const { playerName } = req.body;
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    if (lobby.status !== 'waiting') {
        return res.status(400).json({ error: 'Game already started' });
    }
    
    if (lobby.players.length >= 7) {
        return res.status(400).json({ error: 'Lobby is full' });
    }
    
    if (lobby.players.some(p => p.name === playerName)) {
        return res.status(400).json({ error: 'Name already taken' });
    }
    
    lobby.players.push({ name: playerName, faction: null, ready: false });
    
    // Notify via WebSocket
    const io = req.app.get('io');
    io.to(`lobby:${req.params.lobbyId}`).emit('player_joined', { playerName });
    
    res.json({ success: true, lobby });
});

// Leave a lobby
router.post('/:lobbyId/leave', (req, res) => {
    const { playerName } = req.body;
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    lobby.players = lobby.players.filter(p => p.name !== playerName);
    
    // If host leaves, assign new host or delete lobby
    if (lobby.host === playerName) {
        if (lobby.players.length > 0) {
            lobby.host = lobby.players[0].name;
        } else {
            lobbies.delete(req.params.lobbyId);
            return res.json({ success: true, lobbyDeleted: true });
        }
    }
    
    const io = req.app.get('io');
    io.to(`lobby:${req.params.lobbyId}`).emit('player_left', { playerName });
    
    res.json({ success: true, lobby });
});

// Select faction
router.post('/:lobbyId/select-faction', (req, res) => {
    const { playerName, faction } = req.body;
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    // Check faction isn't taken
    if (faction && lobby.players.some(p => p.faction === faction && p.name !== playerName)) {
        return res.status(400).json({ error: 'Faction already taken' });
    }
    
    const player = lobby.players.find(p => p.name === playerName);
    if (player) {
        player.faction = faction;
    }
    
    const io = req.app.get('io');
    io.to(`lobby:${req.params.lobbyId}`).emit('faction_selected', { playerName, faction });
    
    res.json({ success: true, lobby });
});

// Mark ready
router.post('/:lobbyId/ready', (req, res) => {
    const { playerName, ready } = req.body;
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    const player = lobby.players.find(p => p.name === playerName);
    if (player) {
        player.ready = ready;
    }
    
    const io = req.app.get('io');
    io.to(`lobby:${req.params.lobbyId}`).emit('player_ready_changed', { playerName, ready });
    
    res.json({ success: true, lobby });
});

// Start the game
router.post('/:lobbyId/start', (req, res) => {
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    // Validate all players are ready and have factions
    const allReady = lobby.players.every(p => p.ready && p.faction);
    if (!allReady) {
        return res.status(400).json({ error: 'Not all players ready or have factions' });
    }
    
    if (lobby.players.length < 3) {
        return res.status(400).json({ error: 'Need at least 3 players' });
    }
    
    // Create the game
    const gameId = req.params.lobbyId; // Use same ID
    const playerFactions = {};
    lobby.players.forEach(p => {
        playerFactions[p.faction] = p.name;
    });
    
    const game = new GameManager(gameId, playerFactions, lobby.settings);
    games.set(gameId, game);
    
    lobby.status = 'started';
    lobby.gameId = gameId;
    
    const io = req.app.get('io');
    io.to(`lobby:${req.params.lobbyId}`).emit('game_started', { gameId });
    
    res.json({ success: true, gameId });
});

// Get lobby info
router.get('/:lobbyId', (req, res) => {
    const lobby = lobbies.get(req.params.lobbyId);
    
    if (!lobby) {
        return res.status(404).json({ error: 'Lobby not found' });
    }
    
    res.json(lobby);
});

// List public lobbies
router.get('/', (req, res) => {
    const publicLobbies = Array.from(lobbies.values())
        .filter(l => l.status === 'waiting')
        .map(l => ({
            id: l.id,
            host: l.host,
            playerCount: l.players.length,
            createdAt: l.createdAt
        }));
    
    res.json(publicLobbies);
});

// Helper function
function generateLobbyId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

module.exports = router;
