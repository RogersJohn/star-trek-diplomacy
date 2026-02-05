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
const gameRoutes = require('./api/game-routes');
const lobbyRoutes = require('./api/lobby-routes');
const userRoutes = require('./api/user-routes');
const GameManager = require('./game-manager');
const { games } = require('./api/game-routes');
const { initializeDatabase, closeDatabase } = require('./database');

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

// WebSocket handling
io.on('connection', socket => {
  console.log('Client connected:', socket.id);

  // Join a game room
  socket.on('join_game', gameId => {
    socket.join(`game:${gameId}`);
    console.log(`${socket.id} joined game ${gameId}`);
  });

  // Leave a game room
  socket.on('leave_game', gameId => {
    socket.leave(`game:${gameId}`);
  });

  // Join a lobby room
  socket.on('join_lobby', lobbyId => {
    socket.join(`lobby:${lobbyId}`);
    console.log(`${socket.id} joined lobby ${lobbyId}`);
  });

  // Private message (direct to one faction)
  socket.on('private_message', ({ from, to, message, timestamp }) => {
    // Send to all clients in the game room - they'll filter client-side
    const rooms = Array.from(socket.rooms);
    const gameRoom = rooms.find(r => r.startsWith('game:'));

    if (gameRoom) {
      io.to(gameRoom).emit('private_message', {
        from,
        to,
        message,
        timestamp: timestamp || Date.now(),
      });
      console.log(`Private message from ${from} to ${to}`);
    }
  });

  // Broadcast message (to all players)
  socket.on('broadcast_message', ({ from, message, timestamp }) => {
    const rooms = Array.from(socket.rooms);
    const gameRoom = rooms.find(r => r.startsWith('game:'));

    if (gameRoom) {
      io.to(gameRoom).emit('broadcast_message', {
        from,
        to: 'all',
        message,
        timestamp: timestamp || Date.now(),
      });
      console.log(`Broadcast message from ${from}`);
    }
  });

  // Broadcast order submission
  socket.on('order_submitted', ({ gameId, faction }) => {
    io.to(`game:${gameId}`).emit('player_ready', { faction });
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes
app.set('io', io);

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
