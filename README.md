# 🌀 The Ever Maze

A **real-time multiplayer 3D maze game** built with Node.js, Socket.IO, and React.

## 🎮 Gameplay

Two teams compete in a procedurally generated 3D maze. Find the **Lost Light**, carry it to the **Exit**, and channel it to win — but watch out, enemies can **tag** you and steal the light!

### Features
- 🏰 **3D First-Person Raycaster** — Wolfenstein-style rendering in a browser
- 👥 **Real-time Multiplayer** — Up to 14 players across 2 teams
- 💡 **Lost Light System** — Find, carry, and defend the glowing artifact
- 🎁 **7 Power-Ups** — Freeze, Dash, Shield, Mist, Compass, Magic Key, Silent Steps
- 🌀 **Wall Shifts** — Sections of the maze reconfigure mid-match
- ⏱️ **Sudden Death** — Overtime mode when the timer runs out
- 🤖 **Bot AI** — Play solo with CPU-controlled opponents
- 🗺️ **Minimap** — Real-time radar showing visible areas
- 🔊 **Sound Engine** — Footsteps, pickups, heartbeat, and more
- 📱 **Mobile Support** — Virtual joystick for touch devices

### Controls
- **W/S** — Move forward/back
- **A/D** — Turn left/right
- **Click & Drag** — Mouse look
- **E or Space** — Use power-up
- **Enter** — Open chat
- **Escape** — Close chat

## 🚀 Running Locally

```bash
# Install all dependencies
npm install
npm install --prefix client
npm install --prefix server

# Start development servers
npm run dev --prefix server   # Backend on :3001
npm run dev --prefix client   # Frontend on :5173
```

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, TailwindCSS |
| Rendering | HTML5 Canvas (Raycaster) |
| Backend | Node.js, Express |
| Real-time | Socket.IO |
| Maze Gen | Recursive DFS algorithm |
| Audio | Web Audio API |

## 📁 Project Structure

```
The_Ever_Maze_Game/
├── client/          # React frontend
│   └── src/
│       ├── components/   # UI components
│       ├── game/         # Renderer, Audio
│       ├── hooks/        # Player controller, store
│       └── socket/       # Socket.IO client
├── server/          # Node.js backend
│   └── src/
│       ├── game/         # Game loop, Bot AI, Maze gen
│       ├── networking/   # Socket event handlers
│       └── rooms/        # Room & player management
└── shared/          # Shared constants (events, config)
```

## 🌐 Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Server port | `3001` |
| `NODE_ENV` | Environment | `development` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `*` |
