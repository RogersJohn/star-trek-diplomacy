/**
 * STAR TREK DIPLOMACY - API Server
 *
 * Express server providing REST API and WebSocket support
 */

// Load environment variables from .env file (for local development)
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const { clerkClient } = require('@clerk/clerk-sdk-node');
const gameRoutes = require('./api/game-routes');
const lobbyRoutes = require('./api/lobby-routes');
const userRoutes = require('./api/user-routes');
const testRoutes = require('./api/test-routes');
const GameManager = require('./game-manager');
const { games } = require('./api/game-routes');
const { initializeDatabase, closeDatabase, getUserFactionInGame } = require('./database');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
});

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/game', gameRoutes);
app.use('/api/lobby', lobbyRoutes);
app.use('/api/user', userRoutes);
app.use('/api/test', testRoutes);

// Socket.io authentication middleware
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    // Verify the Clerk session token
    const sessionClaims = await clerkClient.verifyToken(token);
    socket.data.userId = sessionClaims.sub; // Clerk user ID
    next();
  } catch (err) {
    console.error('Socket auth error:', err.message);
    next(new Error('Invalid authentication token'));
  }
});

// WebSocket handling
io.on('connection', socket => {
  console.log('Client connected:', socket.id, 'User:', socket.data.userId);

  // Authenticated join - verifies user is a player in this game
  socket.on('join_game', async (gameId) => {
    const userId = socket.data.userId;

    // Validate game exists
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', { message: 'Game not found' });
      return;
    }

    // Verify user is a player in this game and get their faction
    const faction = await getUserFactionInGame(gameId, userId);
    if (!faction) {
      socket.emit('error', { message: 'You are not a player in this game' });
      return;
    }

    // Register socket with verified faction
    socket.data.gameId = gameId;
    socket.data.faction = faction;
    socketRegistry.set(socket.id, { gameId, faction });
    socket.join(`game:${gameId}`);
    console.log(`${socket.id} joined game ${gameId} as ${faction}`);

    // Send acknowledgement with faction info
    socket.emit('joined_game', { gameId, faction });
  });

  // Leave a game room
  socket.on('leave_game', gameId => {
    socket.leave(`game:${gameId}`);
    socketRegistry.delete(socket.id);
  });

  // Join a lobby room (no authentication needed for lobbies)
  socket.on('join_lobby', lobbyId => {
    socket.join(`lobby:${lobbyId}`);
    console.log(`${socket.id} joined lobby ${lobbyId}`);
  });

  // Private message - SECURITY: verify sender, only emit to sender + recipient
  socket.on('private_message', ({ to, message, timestamp }) => {
    const senderInfo = socketRegistry.get(socket.id);
    if (!senderInfo) {
      socket.emit('error', { message: 'Not authenticated to a game' });
      return;
    }

    const { gameId, faction: from } = senderInfo;
    const msgTimestamp = timestamp || Date.now();

    // Get recipient sockets
    const recipientSockets = getSocketsForFaction(gameId, to);

    // Get sender's other sockets (multi-tab support)
    const senderSockets = getSocketsForFaction(gameId, from);

    // Create the message object
    const privateMsg = { from, to, message, timestamp: msgTimestamp };

    // Emit only to sender and recipient sockets
    [...new Set([...senderSockets, ...recipientSockets])].forEach(socketId => {
      io.to(socketId).emit('private_message', privateMsg);
    });

    console.log(`Private message from ${from} to ${to}`);
  });

  // Broadcast message - SECURITY: use authenticated faction as sender
  socket.on('broadcast_message', ({ message, timestamp }) => {
    const senderInfo = socketRegistry.get(socket.id);
    if (!senderInfo) {
      socket.emit('error', { message: 'Not authenticated to a game' });
      return;
    }

    const { gameId, faction: from } = senderInfo;

    io.to(`game:${gameId}`).emit('broadcast_message', {
      from,
      to: 'all',
      message,
      timestamp: timestamp || Date.now(),
    });
    console.log(`Broadcast message from ${from}`);
  });

  // Broadcast order submission - SECURITY: use authenticated faction
  socket.on('order_submitted', () => {
    const senderInfo = socketRegistry.get(socket.id);
    if (!senderInfo) {
      return;
    }

    const { gameId, faction } = senderInfo;
    io.to(`game:${gameId}`).emit('player_ready', { faction });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    socketRegistry.delete(socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

// Socket-to-faction registry for message security
// Maps socket.id -> { gameId, faction }
const socketRegistry = new Map();

// Helper to get all sockets for a specific faction in a game
function getSocketsForFaction(gameId, faction) {
  const sockets = [];
  for (const [socketId, info] of socketRegistry) {
    if (info.gameId === gameId && info.faction === faction) {
      sockets.push(socketId);
    }
  }
  return sockets;
}

// Make registry accessible for testing
app.set('socketRegistry', socketRegistry);

const PORT = process.env.PORT || 3000;

// Async startup function
async function startServer() {
  try {
    // Initialize database schema
    console.log('Initializing database...');
    await initializeDatabase();

    // Load active games from database on startup
    console.log('Loading games from database...');
    const loadedGames = await GameManager.loadActiveGames();
    loadedGames.forEach((game, gameId) => {
      games.set(gameId, game);
    });
    console.log(`Loaded ${loadedGames.size} game(s) from database`);

    // Start server
    server.listen(PORT, () => {
      console.log(`Star Trek Diplomacy server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(async () => {
    await closeDatabase();
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { app, server, io };
