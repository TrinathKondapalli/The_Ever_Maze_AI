const { PHASE } = require('../../../shared/constants.js');

const { generateMaze } = require('./maze/mazeGenerator.js');
const { validateMaze } = require('./maze/mazeValidator.js');

function createMatchState(room) {
  let maze = null;
  let isValid = false;
  const size = room.settings.mazeSize || 31;
  const type = room.settings.mazeType || 'STANDARD';

  while (!isValid) {
    maze = generateMaze(size, type);
    isValid = validateMaze(maze);
  }

  const { TILE, PHASE, GAME_CONFIG, GIFT } = require('../../../shared/constants.js');
  let spawnA = null, spawnB = null;
  const floorTiles = []; // Keep track of all floor tiles for gift spawning
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (maze[y][x] === TILE.ENTRANCE_A) spawnA = { x: x + 0.5, y: y + 0.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 };
      if (maze[y][x] === TILE.ENTRANCE_B) spawnB = { x: x + 0.5, y: y + 0.5, dirX: -1, dirY: 0, planeX: 0, planeY: -0.66 };
      if (maze[y][x] === TILE.FLOOR) floorTiles.push({ x, y });
    }
  }

  // Assign players to spawns
  let offsetA = 0;
  let offsetB = 0;
  for (const socketId in room.players) {
    const p = room.players[socketId];
    p.activeGift = null; // Initialize empty gift slot
    p.activeEffects = {}; // For DASH, FREEZE, SHIELD, etc.
    if (p.team === 'A' && spawnA) {
      // Spawn slightly behind/around the entrance so they aren't nose-to-nose
      p.position = { ...spawnA, x: spawnA.x - (offsetA * 0.5), y: spawnA.y - (offsetA * 0.5) };
      offsetA++;
    } else if (p.team === 'B' && spawnB) {
      p.position = { ...spawnB, x: spawnB.x + (offsetB * 0.5), y: spawnB.y + (offsetB * 0.5) };
      offsetB++;
    } else {
      // Fallback
      p.position = spawnA ? { ...spawnA } : { x: 1.5, y: 1.5, dirX: 1, dirY: 0, planeX: 0, planeY: 0.66 };
    }
  }

  // Find a central floor tile for the Lost Light
  let center = Math.floor(size / 2);
  let lightPos = null;
  // Simple spiral search for a floor tile
  for (let r = 0; r < center; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        let cx = center + dx;
        let cy = center + dy;
        if (cx >= 0 && cx < size && cy >= 0 && cy < size && maze[cy][cx] === TILE.FLOOR && !lightPos) {
           lightPos = { x: cx + 0.5, y: cy + 0.5 };
        }
      }
    }
    if (lightPos) break;
  }

  // Spawn initial gifts
  const gifts = [];
  const giftTypes = [GIFT.DASH, GIFT.FREEZE, GIFT.SHIELD, GIFT.COMPASS];
  
  // Shuffle floor tiles
  for (let i = floorTiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [floorTiles[i], floorTiles[j]] = [floorTiles[j], floorTiles[i]];
  }
  
  for (let i = 0; i < Math.min(GAME_CONFIG.GIFT_SPAWN_INITIAL, floorTiles.length); i++) {
     const t = floorTiles[i];
     // Don't spawn exactly on the light
     if (t.x + 0.5 === lightPos?.x && t.y + 0.5 === lightPos?.y) continue;
     
     gifts.push({
       id: `gift_${Date.now()}_${i}`,
       type: giftTypes[Math.floor(Math.random() * giftTypes.length)],
       position: { x: t.x + 0.5, y: t.y + 0.5 }
     });
  }

  return {
    startedAt: Date.now(),
    duration: room.settings.matchDuration,
    phase: PHASE.EXPLORE,
    phaseStartedAt: Date.now(),
    maze: maze,
    lostLight: {
      carrierId: null,
      position: lightPos,
      isOnFloor: true,
      foundAt: null,
      transferCount: 0,
      pickupImmunityUntil: null
    },
    gifts: gifts,
    wallShifts: {
      count: 0,
      nextShiftAt: Date.now() + 60000,
      warningActive: false,
      pendingShiftZone: null
    },
    exit: {
      position: null,
      openedAt: null
    },
    channel: {
      playerId: null,
      startedAt: null,
      progress: 0,
      interrupted: false
    },
    suddenDeath: {
      active: false,
      startedAt: null
    },
    tickCount: 0,
    lastTickAt: null,
    result: null
  };
}

module.exports = { createMatchState };
