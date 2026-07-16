mkdir -p client/src/socket client/src/constants client/src/store
mkdir -p server/src/networking server/src/rooms server/src/constants
mkdir -p shared

cat << 'EOF' > shared/constants.js
const EVENTS = {
  PLAYER_MOVE: 'PLAYER_MOVE',
  USE_GIFT: 'USE_GIFT',
  PLAYER_READY: 'PLAYER_READY',
  START_GAME: 'START_GAME',
  JOIN_ROOM: 'JOIN_ROOM',
  CREATE_ROOM: 'CREATE_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  STATE_UPDATE: 'STATE_UPDATE',
  PHASE_CHANGE: 'PHASE_CHANGE',
  LIGHT_FOUND: 'LIGHT_FOUND',
  LIGHT_TRANSFER: 'LIGHT_TRANSFER',
  LIGHT_DROPPED: 'LIGHT_DROPPED',
  GIFT_SPAWN: 'GIFT_SPAWN',
  GIFT_PICKUP: 'GIFT_PICKUP',
  TAG_EVENT: 'TAG_EVENT',
  WALL_SHIFT_WARNING: 'WALL_SHIFT_WARNING',
  WALL_SHIFT_EXECUTE: 'WALL_SHIFT_EXECUTE',
  EXIT_OPEN: 'EXIT_OPEN',
  CHANNEL_START: 'CHANNEL_START',
  CHANNEL_PROGRESS: 'CHANNEL_PROGRESS',
  CHANNEL_COMPLETE: 'CHANNEL_COMPLETE',
  MATCH_END: 'MATCH_END',
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_ERROR: 'ROOM_ERROR',
  PLAYER_JOINED: 'PLAYER_JOINED',
  PLAYER_LEFT: 'PLAYER_LEFT',
};

const GAME_CONFIG = {
  TICK_RATE: 20,
  VISIBILITY_RADIUS: 6,
  TILE_SIZE: 32,
  TAG_RADIUS: 1.5,
  PICKUP_IMMUNITY: 2000,
  CARRIER_SPEED_MULTIPLIER: 0.9,
  CHANNEL_DURATION: 3000,
  CHANNEL_GRACE: 2000,
  WALL_SHIFT_WARNING: 3000,
  MAX_WALL_SHIFTS: 3,
  GIFT_SPAWN_INITIAL: 4,
  GIFT_SPAWN_INTERVAL: 60000,
  GIFT_SPAWN_AMOUNT: 3,
  REGIONAL_UPDATE_INTERVAL: 15000,
  WARMTH_RADIUS: 8,
  PROXIMITY_REVEAL_RADIUS: 3,
  AFK_WARNING: 45000,
  AFK_KICK: 10000,
  ROOM_TIMEOUT: 7200000,
  MATCH_DURATION: 300000,
  PHASE_3_TRIGGER: 0.7,
  SUDDEN_DEATH_DURATION: 60000,
  TAG_COOLDOWN: 3000,
  REJOIN_WINDOW: 60000,
  SMALL_MAZE: 21,
  MEDIUM_MAZE: 31,
  LARGE_MAZE: 41,
};

const TILE = { WALL: 0, FLOOR: 1, ENTRANCE_A: 2, ENTRANCE_B: 3, EXIT: 4, GATE: 5 };
const PHASE = { EXPLORE: 'EXPLORE', HUNT: 'HUNT', ESCAPE: 'ESCAPE', SUDDEN_DEATH: 'SUDDEN_DEATH' };
const TEAM = { A: 'A', B: 'B' };
const GIFT = {
  FREEZE: 'FREEZE',
  DASH: 'DASH',
  MIST: 'MIST',
  COMPASS: 'COMPASS',
  MAGIC_KEY: 'MAGIC_KEY',
  SHIELD: 'SHIELD',
  SILENT_STEPS: 'SILENT_STEPS'
};

module.exports = {
  EVENTS: Object.freeze(EVENTS),
  GAME_CONFIG: Object.freeze(GAME_CONFIG),
  TILE: Object.freeze(TILE),
  PHASE: Object.freeze(PHASE),
  TEAM: Object.freeze(TEAM),
  GIFT: Object.freeze(GIFT),
};
EOF

cat << 'EOF' > server/src/constants/index.js
const shared = require('../../../shared/constants.js');
module.exports = shared;
EOF

cat << 'EOF' > server/src/rooms/roomManager.js
class RoomManager {
  constructor() {
    this.rooms = new Map();
  }
  createRoom() { return null; }
  joinRoom() { return null; }
  leaveRoom() { return null; }
  getRoom() { return null; }
  getRoomCount() { return this.rooms.size; }
  getPlayerCount() { return 0; }
}
module.exports = { RoomManager };
EOF

cat << 'EOF' > server/src/networking/socketHandler.js
const { EVENTS } = require('../constants/index.js');
const { RoomManager } = require('../rooms/roomManager.js');
const roomManager = new RoomManager();

function registerHandlers(io) {
  io.on('connection', (socket) => {
    if (process.env.DEBUG === 'true') {
      console.log(`[Socket Connected]: ${socket.id}`);
    }
    socket.emit(EVENTS.ROOM_ERROR, { message: 'Server ready' });

    socket.on(EVENTS.CREATE_ROOM, (data, callback) => {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Not implemented yet' });
      }
    });

    socket.on(EVENTS.JOIN_ROOM, (data, callback) => {
      if (typeof callback === 'function') {
        callback({ success: false, error: 'Not implemented yet' });
      }
    });

    socket.on('disconnect', () => {
      if (process.env.DEBUG === 'true') {
        console.log(`[Socket Disconnected]: ${socket.id}`);
      }
    });
  });
}
module.exports = { registerHandlers };
EOF

cat << 'EOF' > server/index.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
const { registerHandlers } = require('./src/networking/socketHandler.js');
const { RoomManager } = require('./src/rooms/roomManager.js');

const app = express();
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';
const DEBUG = process.env.DEBUG !== 'false';

app.get('/health', (req, res) => {
  const roomManager = new RoomManager();
  res.json({
    status: 'ok',
    rooms: roomManager.getRoomCount(),
    players: roomManager.getPlayerCount()
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, methods: ['GET', 'POST'] }
});

registerHandlers(io);

if (process.env.NODE_ENV !== 'production') {
  import('vite').then(({ createServer: createViteServer }) => {
    createViteServer({
      server: { middlewareMode: true, hmr: false, watch: null },
      appType: 'spa',
      configFile: path.resolve(__dirname, '../client/vite.config.js'),
      root: path.resolve(__dirname, '../client')
    }).then(vite => {
      app.use(vite.middlewares);
      server.listen(PORT, '0.0.0.0', () => {
        if (DEBUG) console.log(`[Dev] Server & Vite listening on port ${PORT}`);
      });
    });
  });
} else {
  const distPath = path.join(__dirname, '../client/dist');
  app.use(express.static(distPath));
  app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  server.listen(PORT, '0.0.0.0', () => {
    if (DEBUG) console.log(`[Prod] Server listening on port ${PORT}`);
  });
}

process.on('SIGTERM', () => {
  if (DEBUG) console.log('SIGTERM received. Shutting down gracefully.');
  server.close(() => process.exit(0));
});
EOF

cat << 'EOF' > server/package.json
{
  "name": "evermaze-server",
  "version": "1.0.0",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.21.2",
    "socket.io": "^4.7.5",
    "cors": "^2.8.5",
    "uuid": "^9.0.1"
  }
}
EOF

cat << 'EOF' > client/src/constants/index.js
import shared from '../../../shared/constants.js';
export const { EVENTS, GAME_CONFIG, TILE, PHASE, TEAM, GIFT } = shared;
EOF

cat << 'EOF' > client/src/socket/socket.js
import { io } from 'socket.io-client';
const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? window.location.origin;
const socket = io(SERVER_URL, { autoConnect: false });
export default socket;
EOF

cat << 'EOF' > client/src/store/gameState.js
export const initialGameState = {
  phase: null,
  myPlayerId: null,
  myTeam: null,
  players: {},
  maze: null,
  lostLight: { carrierId: null, position: null, isOnFloor: false },
  gifts: [],
  myGift: null,
  exit: null,
  channel: null,
  matchTimer: 0,
  roomCode: null,
  roomPlayers: [],
};
export let gameState = { ...initialGameState };
export function resetGameState() {
  gameState = { ...initialGameState };
  return gameState;
}
EOF

cat << 'EOF' > client/src/App.jsx
import { useState, useEffect } from 'react';
import socket from './socket/socket.js';
import { EVENTS } from './constants/index.js';

export default function App() {
  const [view, setView] = useState('landing');
  const [socketReady, setSocketReady] = useState(false);

  useEffect(() => {
    socket.connect();
    socket.on('connect', () => setSocketReady(true));
    socket.on(EVENTS.ROOM_ERROR, (data) => console.log('Room message:', data.message));
    return () => socket.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-neutral-900 text-white flex items-center justify-center font-sans">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">The Ever Maze</h1>
        <div className="p-4 border border-neutral-700 rounded-lg bg-neutral-800">
          <p className="text-xl">Current View: <span className="font-mono text-emerald-400">{view}</span></p>
          <p className="text-sm text-neutral-400 mt-2">Socket status: {socketReady ? 'Connected' : 'Connecting...'}</p>
        </div>
        <div className="mt-8 flex gap-4 justify-center">
          <button onClick={() => setView('landing')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Landing</button>
          <button onClick={() => setView('lobby')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Lobby</button>
          <button onClick={() => setView('game')} className="px-4 py-2 bg-neutral-700 hover:bg-neutral-600 rounded">Game</button>
        </div>
      </div>
    </div>
  );
}
EOF

cat << 'EOF' > client/src/index.css
@import "tailwindcss";
EOF

cat << 'EOF' > client/src/main.jsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
EOF

cat << 'EOF' > client/index.html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>The Ever Maze</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
EOF

cat << 'EOF' > client/vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@shared': path.resolve(__dirname, '../shared')
    }
  },
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3000',
        ws: true
      }
    }
  }
});
EOF

cat << 'EOF' > client/tailwind.config.js
// Note: Using Tailwind CSS v4 via Vite plugin, this file is included for architectural compliance.
module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: { extend: {} },
  plugins: [],
}
EOF

cat << 'EOF' > client/postcss.config.js
// Note: Using Tailwind CSS v4 via Vite plugin, this file is included for architectural compliance.
module.exports = {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
EOF

cat << 'EOF' > client/package.json
{
  "name": "evermaze-client",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^19.0.1",
    "react-dom": "^19.0.1",
    "socket.io-client": "^4.7.5"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^5.0.4",
    "vite": "^6.2.3",
    "tailwindcss": "^4.1.14",
    "@tailwindcss/vite": "^4.1.14"
  }
}
EOF

cat << 'EOF' > README.md
# The Ever Maze

Browser-based real-time multiplayer maze game.

## Development Setup

### Prerequisites
- Node.js 20+
- npm 9+

### Install

```bash
# Backend
cd server && npm install

# Frontend
cd client && npm install
```

### Run (development)

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

*Note: In the AI Studio environment, the server is unified on port 3000 to comply with network constraints, serving the Vite frontend via middleware.*

Backend runs on: http://localhost:3000
Frontend runs on: http://localhost:3000
Health check: http://localhost:3000/health

### Environment Variables

Backend (server/.env):
PORT=3000
CLIENT_ORIGIN=*
DEBUG=true

Frontend (client/.env):
VITE_SERVER_URL=http://localhost:3000
EOF

