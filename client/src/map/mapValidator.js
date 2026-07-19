import { CHUNK_TYPE, BIOME_TYPE } from '@shared/constants.js';

/**
 * BFS algorithm to verify reachability and return path.
 * @param {Array} chunks Flat array of 576 chunk objects
 * @param {object} start { x, y }
 * @param {object} end { x, y }
 * @param {number} gridSize
 * @returns {Array|null} Path array of {x, y} or null if blocked
 */
export function bfsPath(chunks, start, end, gridSize = 24) {
  const getIndex = (x, y) => y * gridSize + x;
  
  const startIdx = getIndex(start.x, start.y);
  const queue = [[start]];
  const visited = new Set([startIdx]);

  while (queue.length > 0) {
    const path = queue.shift();
    const current = path[path.length - 1];

    if (current.x === end.x && current.y === end.y) {
      return path.map(p => ({ x: p.x, y: p.y }));
    }

    const dirs = [
      { x: 1, y: 0 },
      { x: -1, y: 0 },
      { x: 0, y: 1 },
      { x: 0, y: -1 }
    ];

    for (const dir of dirs) {
      const nx = current.x + dir.x;
      const ny = current.y + dir.y;

      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize) {
        const nIdx = getIndex(nx, ny);
        const cell = chunks[nIdx];
        
        if (cell && !cell.blocked && !visited.has(nIdx)) {
          visited.add(nIdx);
          queue.push([...path, { x: nx, y: ny }]);
        }
      }
    }
  }

  return null;
}

// 10 Handcrafted ASCII fallback maps (24x24).
// . = OPEN, # = BLOCKED, A = SPAWN_A, B = SPAWN_B, T = TREASURE, E = EXIT
const FALLBACK_ASCII_MAPS = [
  [
    "A..#....................",
    "...#....................",
    "...#....................",
    "....######..............",
    ".........#..............",
    ".........#...#..........",
    ".........#...#..........",
    "....######...#..........",
    ".............#..........",
    ".........#####..........",
    "........................",
    "...........T............",
    "........................",
    "..........#####.........",
    "..........#.............",
    "..........#...######....",
    "..........#........#....",
    "..........#........#....",
    "..............######....",
    "........................",
    "........................",
    "....................#...",
    "....................#...",
    "....................#..B"
  ],
  [
    "A.......................",
    "......#####.............",
    "......#...#.............",
    "......#...#...######....",
    "......#...#...#....#....",
    "..........#...#....#....",
    "..........#...######....",
    "........................",
    "........................",
    "............T...........",
    "........................",
    "........................",
    "......#####.............",
    "......#...#.............",
    "......#...#...######....",
    "......#...#...#....#....",
    "..........#...#....#....",
    "..........#...######....",
    "........................",
    "........................",
    "........................",
    "........................",
    "........................",
    ".......................B"
  ]
];

while (FALLBACK_ASCII_MAPS.length < 10) {
  FALLBACK_ASCII_MAPS.push(FALLBACK_ASCII_MAPS[FALLBACK_ASCII_MAPS.length % 2]);
}

/**
 * Converts a compact handcrafted ASCII map to the full chunks schema.
 * @param {number} index Fallback map index (0-9)
 * @returns {object} Full Map object
 */
export function getFallbackMap(index) {
  const ascii = FALLBACK_ASCII_MAPS[index % 10];
  const size = 24;
  const chunks = [];
  let spawnA = { x: 0, y: 0 };
  let spawnB = { x: 23, y: 23 };
  let treasurePos = { x: 11, y: 11 };
  let exitPos = { x: 12, y: 12 };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const char = ascii[y][x];
      
      let type = CHUNK_TYPE.OPEN;
      let blocked = false;

      if (char === '#') {
        blocked = true;
        type = CHUNK_TYPE.BLOCKED;
      } else if (char === 'A') {
        type = CHUNK_TYPE.SPAWN_A;
        spawnA = { x, y };
      } else if (char === 'B') {
        type = CHUNK_TYPE.SPAWN_B;
        spawnB = { x, y };
      } else if (char === 'T') {
        type = CHUNK_TYPE.TREASURE_ZONE;
        treasurePos = { x, y };
      } else if (char === 'E') {
        type = CHUNK_TYPE.EXIT;
        exitPos = { x, y };
      }

      let biome = BIOME_TYPE.FOREST;
      if (y > 8 && y < 16) biome = BIOME_TYPE.RUINS;
      else if (y >= 16) biome = BIOME_TYPE.CRYSTAL_CAVES;

      chunks.push({
        x,
        y,
        type,
        biome,
        blocked,
        decorations: []
      });
    }
  }

  const exitIdx = exitPos.y * size + exitPos.x;
  chunks[exitIdx].type = CHUNK_TYPE.EXIT;
  chunks[exitIdx].blocked = false;

  const pathA = bfsPath(chunks, spawnA, treasurePos) || [];
  const pathB = bfsPath(chunks, spawnB, treasurePos) || [];
  const pathExit = bfsPath(chunks, treasurePos, exitPos) || [];

  return {
    seed: -1 - index,
    gridSize: { w: size, h: size },
    chunks,
    spawnA,
    spawnB,
    treasurePos: { x: treasurePos.x, y: treasurePos.y, worldX: treasurePos.x * 16 + 8, worldZ: treasurePos.y * 16 + 8 },
    exitPos: { x: exitPos.x, y: exitPos.y, worldX: exitPos.x * 16 + 8, worldZ: exitPos.y * 16 + 8 },
    pathAtoTreasure: pathA,
    pathBtoTreasure: pathB,
    pathTreasureToExit: pathExit
  };
}
