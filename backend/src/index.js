/**
 * STAR TREK DIPLOMACY - API Server
 * 
 * Express server providing REST API and WebSocket support
 */

const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const gameRoutes = require('./api/game-routes');
const lobbyRoutes = require('./api/lobby-routes');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST']
    }
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

// WebSocket handling
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Join a game room
    socket.on('join_game', (gameId) => {
        socket.join(`game:${gameId}`);
        console.log(`${socket.id} joined game ${gameId}`);
    });
    
    // Leave a game room
    socket.on('leave_game', (gameId) => {
        socket.leave(`game:${gameId}`);
    });
    
    // Join a lobby room
    socket.on('join_lobby', (lobbyId) => {
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
                timestamp: timestamp || Date.now()
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
                timestamp: timestamp || Date.now()
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

server.listen(PORT, () => {
    console.log(`Star Trek Diplomacy server running on port ${PORT}`);
});

module.exports = { app, server, io };
