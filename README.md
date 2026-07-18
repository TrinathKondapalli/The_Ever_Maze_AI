# Lumina

> **Two Teams. One Treasure. One Winner.**

Browser-Based · Real-Time Multiplayer · No Accounts · Procedural Maps

---

## Tech Stack

| Layer | Technology |
|---|---|
| Client Renderer | Three.js / WebGL |
| Client UI | React + TailwindCSS |
| Client State | Zustand |
| Transport | Socket.io 4.x |
| Game Server | Node.js + Socket.io |
| HTTP Server | Express |
| Shared Logic | JavaScript ESM |

---

## Project Structure

```
lumina/
├── client/          # Vite + React frontend
├── server/          # Node.js + Express backend
├── shared/          # Shared constants & game config (imported by both)
│   ├── constants.js # ALL event names and enums
│   └── gameConfig.js# ALL numeric game values
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### 1. Start the Backend

```bash
cd server
npm install
npm run dev
```

Server will start on **http://localhost:3001**

Verify: `GET http://localhost:3001/health` should return:
```json
{ "status": "ok", "rooms": 0, "players": 0, "timestamp": ... }
```

### 2. Start the Frontend

```bash
cd client
npm install
npm run dev
```

Frontend will start on **http://localhost:5173**

---

## Environment Variables

### Server (`server/.env`)
```
PORT=3001
CLIENT_ORIGIN=http://localhost:5173
```

### Client (`client/.env`)
```
VITE_SERVER_URL=http://localhost:3001
```

---

## Module Build Order

All 25 modules must be built in strict order. Never skip. Never combine.

| # | Module | Status |
|---|---|---|
| 01 | Project Architecture | ✅ COMPLETE |
| 02 | Session System | PENDING |
| 03 | Landing UI | PENDING |
| 04 | Lobby System | PENDING |
| 05 | Map Generator | PENDING |
| 06 | Map Renderer | PENDING |
| 07 | Character Controller | PENDING |
| 08 | Third-Person Camera | PENDING |
| 09 | Animation System | PENDING |
| 10 | Multiplayer Sync | PENDING |
| 11 | Treasure System | PENDING |
| 12 | Timer System | PENDING |
| 13 | Combat System | PENDING |
| 14 | Win & Draw System | PENDING |
| 15 | Game HUD | PENDING |
| 16 | Victory & Draw Screens | PENDING |
| 17 | Audio System | PENDING |
| 18 | Mobile Controls | PENDING |
| 19 | Optimization | PENDING |
| 20 | Accessibility | PENDING |
| 21 | Testing Suite | PENDING |
| 22 | Security & Anti-Cheat | PENDING |
| 23 | Deployment | PENDING |
| 24 | Production QA | PENDING |
| 25 | Launch | PENDING |

---

## Coding Standards

- All numeric values live in `shared/gameConfig.js` — **no magic numbers elsewhere**
- All event names live in `shared/constants.js`
- Server is always the authority. Client only renders what the server sends.
- One module per session. Testing checklist is the gate before moving on.
