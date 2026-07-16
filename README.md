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
