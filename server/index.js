import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { registerSocketHandlers } from './src/networking/socketHandler.js';
import { RoomManager } from './src/rooms/roomManager.js';
import { SessionManager } from './src/sessions/sessionManager.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize managers
const roomManager = new RoomManager();
const sessionManager = new SessionManager();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    rooms: roomManager.getRoomCount(),
    players: roomManager.getPlayerCount(),
    timestamp: Date.now()
  });
});

// Setup socket networking
registerSocketHandlers(io, roomManager, sessionManager);

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('Shutting down gracefully...');
  httpServer.close(() => {
    console.log('HTTP server closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`Lumina Server running on port ${PORT}`);
});
