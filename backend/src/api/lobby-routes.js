/**
 * STAR TREK DIPLOMACY - Lobby API Routes
 *
 * All lobby operations require Clerk authentication.
 */

const express = require('express');
const router = express.Router();
const GameManager = require('../game-manager');
const { games } = require('./game-routes');
const { requireAuth, getUserInfo } = require('../middleware/auth');
const { upsertUser, createUserGame, createGamePlayer } = require('../database');

// In-memory lobby storage (replace with database in production)
const lobbies = new Map();

// Create a new lobby - requires authentication
router.post('/create', requireAuth, async (req, res) => {
  const { hostName, settings } = req.body;
  const userInfo = getUserInfo(req);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Update user record with display name
  await upsertUser(userInfo.userId, hostName);

  const lobbyId = generateLobbyId();
  const lobby = {
    id: lobbyId,
    host: hostName,
    hostUserId: userInfo.userId,
    players: [{
      name: hostName,
      faction: null,
      ready: false,
      userId: userInfo.userId,
    }],
    settings: {
      turnTimer: settings?.turnTimer || 24 * 60 * 60 * 1000, // 24 hours default
      allowSpectators: settings?.allowSpectators ?? true,
      ...settings,
    },
    status: 'waiting',
    createdAt: new Date().toISOString(),
  };

  lobbies.set(lobbyId, lobby);
  res.json({ success: true, lobby });
});

// Join a lobby - requires authentication
router.post('/:lobbyId/join', requireAuth, async (req, res) => {
  const { playerName } = req.body;
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  if (lobby.status !== 'waiting') {
    return res.status(400).json({ error: 'Game already started' });
  }

  if (lobby.players.length >= 7) {
    return res.status(400).json({ error: 'Lobby is full' });
  }

  // Check for duplicate names or user IDs
  if (lobby.players.some(p => p.name === playerName)) {
    return res.status(400).json({ error: 'Name already taken' });
  }
  if (lobby.players.some(p => p.userId === userInfo.userId)) {
    return res.status(400).json({ error: 'You are already in this lobby' });
  }

  // Update user record with display name
  await upsertUser(userInfo.userId, playerName);

  lobby.players.push({
    name: playerName,
    faction: null,
    ready: false,
    userId: userInfo.userId,
  });

  // Notify via WebSocket
  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('player_joined', { playerName });

  res.json({ success: true, lobby });
});

// Leave a lobby - requires authentication
router.post('/:lobbyId/leave', requireAuth, (req, res) => {
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Find player by userId, not by name (more secure)
  const player = lobby.players.find(p => p.userId === userInfo.userId);
  if (!player) {
    return res.status(400).json({ error: 'You are not in this lobby' });
  }

  const playerName = player.name;
  lobby.players = lobby.players.filter(p => p.userId !== userInfo.userId);

  // If host leaves, assign new host or delete lobby
  if (lobby.hostUserId === userInfo.userId) {
    if (lobby.players.length > 0) {
      lobby.host = lobby.players[0].name;
      lobby.hostUserId = lobby.players[0].userId;
    } else {
      lobbies.delete(req.params.lobbyId);
      return res.json({ success: true, lobbyDeleted: true });
    }
  }

  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('player_left', { playerName });

  res.json({ success: true, lobby });
});

// Select faction - requires authentication
router.post('/:lobbyId/select-faction', requireAuth, (req, res) => {
  const { faction } = req.body;
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Find player by userId
  const player = lobby.players.find(p => p.userId === userInfo.userId);
  if (!player) {
    return res.status(400).json({ error: 'You are not in this lobby' });
  }

  // Check faction isn't taken
  if (faction && lobby.players.some(p => p.faction === faction && p.userId !== userInfo.userId)) {
    return res.status(400).json({ error: 'Faction already taken' });
  }

  player.faction = faction;

  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('faction_selected', {
    playerName: player.name,
    faction,
  });

  res.json({ success: true, lobby });
});

// Mark ready - requires authentication
router.post('/:lobbyId/ready', requireAuth, (req, res) => {
  const { ready } = req.body;
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Find player by userId
  const player = lobby.players.find(p => p.userId === userInfo.userId);
  if (!player) {
    return res.status(400).json({ error: 'You are not in this lobby' });
  }

  player.ready = ready;

  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('player_ready_changed', {
    playerName: player.name,
    ready,
  });

  res.json({ success: true, lobby });
});

// Start the game - requires authentication (host only)
router.post('/:lobbyId/start', requireAuth, async (req, res) => {
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Only host can start the game
  if (lobby.hostUserId !== userInfo.userId) {
    return res.status(403).json({ error: 'Only the host can start the game' });
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

  // Save initial game state to database
  await game.saveToDatabase();

  // Create game_players records for authorization
  // This is the authoritative record of who controls which faction
  for (const p of lobby.players) {
    await createGamePlayer(gameId, p.userId, p.faction);
    // Also create user_games for history tracking
    await createUserGame(p.userId, gameId, p.faction);
  }

  lobby.status = 'started';
  lobby.gameId = gameId;

  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('game_started', { gameId });

  res.json({ success: true, gameId });
});

// Update lobby settings (host only) - requires authentication
router.post('/:lobbyId/settings', requireAuth, (req, res) => {
  const userInfo = getUserInfo(req);
  const lobby = lobbies.get(req.params.lobbyId);

  if (!userInfo) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  // Only host can change settings
  if (lobby.hostUserId !== userInfo.userId) {
    return res.status(403).json({ error: 'Only the host can change settings' });
  }

  // Only allow updating settings when game hasn't started
  if (lobby.status !== 'waiting') {
    return res.status(400).json({ error: 'Cannot change settings after game started' });
  }

  // Merge new settings
  lobby.settings = { ...lobby.settings, ...req.body };

  // Notify via WebSocket
  const io = req.app.get('io');
  io.to(`lobby:${req.params.lobbyId}`).emit('settings_updated', lobby.settings);

  res.json({ success: true, settings: lobby.settings });
});

// Get lobby info (public)
router.get('/:lobbyId', (req, res) => {
  const lobby = lobbies.get(req.params.lobbyId);

  if (!lobby) {
    return res.status(404).json({ error: 'Lobby not found' });
  }

  res.json(lobby);
});

// List public lobbies (public)
router.get('/', (req, res) => {
  const publicLobbies = Array.from(lobbies.values())
    .filter(l => l.status === 'waiting')
    .map(l => ({
      id: l.id,
      host: l.host,
      playerCount: l.players.length,
      createdAt: l.createdAt,
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
