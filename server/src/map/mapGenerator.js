import { CHUNK_TYPE, BIOME_TYPE } from '../../../shared/constants.js';
import { GAME_CONFIG } from '../../../shared/gameConfig.js';
import { bfsPath, getFallbackMap } from './mapValidator.js';

/**
 * Seeded Random number generator (Mulberry32)
 * @param {number} seed 32-bit integer seed
 * @returns {function} random float generator [0, 1)
 */
export function createRandom(seed) {
  let s = seed;
  return () => {
    let t = s += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Server-side procedural map generator.
 * @param {number} inputSeed Random integer seed
 * @returns {object} Full Map JSON object
 */
export function generateMap(inputSeed) {
  let attempt = 0;
  let currentSeed = inputSeed;

  while (attempt < GAME_CONFIG.MAP_GEN_MAX_RETRIES) {
    try {
      const map = runGenerationAttempt(currentSeed);
      if (map) return map;
    } catch (e) {
      console.warn(`[Map Gen] Attempt ${attempt + 1} failed: ${e.message}`);
    }
    currentSeed += 12345; // Mutate seed for next attempt
    attempt++;
  }

  // Fallback map if all attempts failed
  console.error(`[Map Gen] Failed all attempts. Reverting to fallback map.`);
  return getFallbackMap(Math.abs(inputSeed) % GAME_CONFIG.FALLBACK_MAP_COUNT);
}

function runGenerationAttempt(seed) {
  const rand = createRandom(seed);
  const size = GAME_CONFIG.MAP_GRID_SIZE;
  const chunks = new Array(size * size);

  const getIndex = (x, y) => y * size + x;

  // NW quadrant Team A spawn (3x3)
  const isSpawnA = (x, y) => x < 3 && y < 3;
  // SE quadrant Team B spawn (3x3)
  const isSpawnB = (x, y) => x >= size - 3 && y >= size - 3;
  // Central 8x8 Treasure Zone
  const isTreasureZone = (x, y) => x >= 8 && x < 16 && y >= 8 && y < 16;

  const spawnCenterA = { x: 1, y: 1 };
  const spawnCenterB = { x: size - 2, y: size - 2 };

  // 1. Initial Biome seed based on position
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let initialBiome = BIOME_TYPE.RUINS;
      
      // Seed cellular biomes by coordinate zones with some noise
      const r = rand();
      if (y + x < 15 + r * 4) {
        initialBiome = BIOME_TYPE.FOREST;
      } else if (y + x > 30 - r * 4) {
        initialBiome = BIOME_TYPE.CRYSTAL_CAVES;
      }

      chunks[getIndex(x, y)] = {
        x,
        y,
        type: CHUNK_TYPE.OPEN,
        biome: initialBiome,
        blocked: false,
        decorations: []
      };
    }
  }

  // 2. Cellular Automata passes (3 Passes) to smooth biomes
  for (let pass = 0; pass < 3; pass++) {
    const tempBiomes = new Array(size * size);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        // Count biomes in 3x3 neighbors
        const counts = { [BIOME_TYPE.FOREST]: 0, [BIOME_TYPE.RUINS]: 0, [BIOME_TYPE.CRYSTAL_CAVES]: 0 };
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
              const b = chunks[getIndex(nx, ny)].biome;
              counts[b] = (counts[b] || 0) + 1;
            }
          }
        }
        // Take majority biome
        let maxBiome = chunks[getIndex(x, y)].biome;
        let maxCount = 0;
        Object.keys(counts).forEach(k => {
          if (counts[k] > maxCount) {
            maxCount = counts[k];
            maxBiome = k;
          }
        });
        tempBiomes[getIndex(x, y)] = maxBiome;
      }
    }
    // Apply smooth
    for (let i = 0; i < chunks.length; i++) {
      chunks[i].biome = tempBiomes[i];
    }
  }

  // 3. Mark Spawns
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = getIndex(x, y);
      if (isSpawnA(x, y)) {
        chunks[idx].type = CHUNK_TYPE.SPAWN_A;
      } else if (isSpawnB(x, y)) {
        chunks[idx].type = CHUNK_TYPE.SPAWN_B;
      }
    }
  }

  // 4. Place Obstacles (20-35% random blocked)
  const obstaclePercent = GAME_CONFIG.OBSTACLE_PERCENT_MIN + rand() * (GAME_CONFIG.OBSTACLE_PERCENT_MAX - GAME_CONFIG.OBSTACLE_PERCENT_MIN);
  const targetBlockedCount = Math.floor(size * size * obstaclePercent);
  let currentBlocked = 0;

  while (currentBlocked < targetBlockedCount) {
    const rx = Math.floor(rand() * size);
    const ry = Math.floor(rand() * size);
    
    // Do not block spawns or central treasure zone
    if (!isSpawnA(rx, ry) && !isSpawnB(rx, ry) && !isTreasureZone(rx, ry)) {
      const cell = chunks[getIndex(rx, ry)];
      if (!cell.blocked) {
        cell.blocked = true;
        cell.type = CHUNK_TYPE.BLOCKED;
        currentBlocked++;
      }
    }
  }

  // 5. Select Treasure Position inside central 8x8
  let treasurePos = null;
  while (!treasurePos) {
    const tx = 8 + Math.floor(rand() * 8);
    const ty = 8 + Math.floor(rand() * 8);
    const cell = chunks[getIndex(tx, ty)];
    if (!cell.blocked) {
      cell.type = CHUNK_TYPE.TREASURE_ZONE;
      treasurePos = { x: tx, y: ty };
    }
  }

  // 6. Select Exit Position (Equidistant within 10% from spawns)
  let exitPos = null;
  let candidates = [];
  
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (isSpawnA(x, y) || isSpawnB(x, y) || isTreasureZone(x, y)) continue;
      
      const cell = chunks[getIndex(x, y)];
      if (cell.blocked) continue;

      // Calculate Manhattan distances from spawns
      const distA = Math.abs(x - spawnCenterA.x) + Math.abs(y - spawnCenterA.y);
      const distB = Math.abs(x - spawnCenterB.x) + Math.abs(y - spawnCenterB.y);

      // Equidistant within 10% margin check
      const diff = Math.abs(distA - distB);
      const averageDist = (distA + distB) / 2;

      // At least 80 meters (5 chunks) from treasure position
      const distToTreasure = Math.sqrt(Math.pow(x - treasurePos.x, 2) + Math.pow(y - treasurePos.y, 2));

      if (diff / averageDist <= 0.1 && distToTreasure >= 5) {
        candidates.push({ x, y, distToTreasure });
      }
    }
  }

  if (candidates.length > 0) {
    // Select a candidate exit pos randomly
    const chosen = candidates[Math.floor(rand() * candidates.length)];
    exitPos = { x: chosen.x, y: chosen.y };
    chunks[getIndex(chosen.x, chosen.y)].type = CHUNK_TYPE.EXIT;
  } else {
    // Fallback exit pos in middle-right open area
    exitPos = { x: 18, y: 11 };
    const cell = chunks[getIndex(exitPos.x, exitPos.y)];
    cell.type = CHUNK_TYPE.EXIT;
    cell.blocked = false;
  }

  // 7. BFS Clear critical paths (unblocks cells on paths if they got blocked)
  const forceUnblockPath = (start, end) => {
    // A temporary pathing run allowing walking through blocked cells to find a path
    const pathGrid = chunks.map(c => ({ ...c, blocked: false }));
    const path = bfsPath(pathGrid, start, end);
    if (path) {
      path.forEach(node => {
        const cell = chunks[getIndex(node.x, node.y)];
        if (cell.blocked) {
          cell.blocked = false;
          cell.type = CHUNK_TYPE.OPEN;
        }
      });
    }
  };

  forceUnblockPath(spawnCenterA, treasurePos);
  forceUnblockPath(spawnCenterB, treasurePos);
  forceUnblockPath(treasurePos, exitPos);

  // 8. Validate paths Autoritatively
  const pathA = bfsPath(chunks, spawnCenterA, treasurePos);
  const pathB = bfsPath(chunks, spawnCenterB, treasurePos);
  const pathExit = bfsPath(chunks, treasurePos, exitPos);

  if (!pathA || !pathB || !pathExit) {
    throw new Error('Paths unreachable after unblocking step.');
  }

  // Add random props/decorations based on biomes for non-blocked chunks
  // (Module 05 checklist: "7. Decorate: place props, trees, rocks based on biome rules")
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cell = chunks[getIndex(x, y)];
      if (cell.blocked) continue;

      // Small decoration placement chance
      if (rand() < 0.15 && cell.type === CHUNK_TYPE.OPEN) {
        let prop = 'rock_small';
        if (cell.biome === BIOME_TYPE.FOREST) {
          prop = rand() < 0.5 ? 'shroom_glowing' : 'tree_small';
        } else if (cell.biome === BIOME_TYPE.RUINS) {
          prop = rand() < 0.5 ? 'ruin_column_broken' : 'brick_stone';
        } else if (cell.biome === BIOME_TYPE.CRYSTAL_CAVES) {
          prop = rand() < 0.5 ? 'crystal_cluster' : 'cavelight_flower';
        }
        cell.decorations.push(prop);
      }
    }
  }

  return {
    seed,
    gridSize: { w: size, h: size },
    chunks,
    spawnA: spawnCenterA,
    spawnB: spawnCenterB,
    treasurePos: { x: treasurePos.x, y: treasurePos.y, worldX: treasurePos.x * 16 + 8, worldZ: treasurePos.y * 16 + 8 },
    exitPos: { x: exitPos.x, y: exitPos.y, worldX: exitPos.x * 16 + 8, worldZ: exitPos.y * 16 + 8 },
    pathAtoTreasure: pathA,
    pathBtoTreasure: pathB,
    pathTreasureToExit: pathExit
  };
}
