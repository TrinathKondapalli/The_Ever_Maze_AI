const { TILE } = require('../../../../shared/constants.js');

function generateMaze(size) {
  // Ensure size is odd for proper wall/path generation
  size = size % 2 === 0 ? size + 1 : size;
  
  // 1. Initialize grid with walls
  const grid = Array.from({ length: size }, () => Array(size).fill(TILE.WALL));
  
  // Directions for distance-2 jumps (Recursive backtracking)
  const dirs = [
    { dx: 0, dy: -2 }, // Up
    { dx: 2, dy: 0 },  // Right
    { dx: 0, dy: 2 },  // Down
    { dx: -2, dy: 0 }  // Left
  ];

  function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
  }

  function inBounds(x, y) {
    return x > 0 && x < size - 1 && y > 0 && y < size - 1;
  }

  // 2. Recursive backtracking to carve paths
  function carve(cx, cy) {
    grid[cy][cx] = TILE.FLOOR;
    
    const shuffledDirs = [...dirs];
    shuffle(shuffledDirs);
    
    for (const dir of shuffledDirs) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      
      if (inBounds(nx, ny) && grid[ny][nx] === TILE.WALL) {
        // Carve wall between
        grid[cy + dir.dy / 2][cx + dir.dx / 2] = TILE.FLOOR;
        carve(nx, ny);
      }
    }
  }

  // Start carving from (1, 1)
  carve(1, 1);

  // 3. Remove dead ends to create loops (makes it better for multiplayer)
  const deadEndRemovalChance = 0.5; // 50% chance to break a dead end
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y][x] === TILE.FLOOR) {
        let wallCount = 0;
        let possibleCarves = [];
        
        const neighbors = [
          { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
        ];
        
        for (const n of neighbors) {
          if (grid[y + n.dy][x + n.dx] === TILE.WALL) {
            wallCount++;
            if (inBounds(x + n.dx * 2, y + n.dy * 2) && grid[y + n.dy * 2][x + n.dx * 2] === TILE.FLOOR) {
              possibleCarves.push(n);
            }
          }
        }
        
        // If it's a dead end (3 walls) and we randomly decide to break it
        if (wallCount >= 3 && possibleCarves.length > 0 && Math.random() < deadEndRemovalChance) {
          const carveDir = possibleCarves[Math.floor(Math.random() * possibleCarves.length)];
          grid[y + carveDir.dy][x + carveDir.dx] = TILE.FLOOR;
        }
      }
    }
  }

  // 4. Place Entrances and Exit
  const center = Math.floor(size / 2);
  
  // Exit in the center
  // Ensure center is floor, and surrounding is carved out enough to reach it
  grid[center][center] = TILE.EXIT;
  // Make sure at least one adjacent is floor so it's reachable
  if (grid[center - 1][center] !== TILE.FLOOR && grid[center + 1][center] !== TILE.FLOOR &&
      grid[center][center - 1] !== TILE.FLOOR && grid[center][center + 1] !== TILE.FLOOR) {
        grid[center - 1][center] = TILE.FLOOR;
  }

  // Entrance A (Top Left)
  // Find first floor tile near top left
  let placedA = false;
  for (let y = 1; y < 5; y++) {
    for (let x = 1; x < 5; x++) {
      if (grid[y][x] === TILE.FLOOR) {
        grid[y][x] = TILE.ENTRANCE_A;
        placedA = true;
        break;
      }
    }
    if (placedA) break;
  }
  
  if (!placedA) grid[1][1] = TILE.ENTRANCE_A;

  // Entrance B (Bottom Right)
  // Find first floor tile near bottom right
  let placedB = false;
  for (let y = size - 2; y > size - 6; y--) {
    for (let x = size - 2; x > size - 6; x--) {
      if (grid[y][x] === TILE.FLOOR) {
        grid[y][x] = TILE.ENTRANCE_B;
        placedB = true;
        break;
      }
    }
    if (placedB) break;
  }
  
  if (!placedB) grid[size - 2][size - 2] = TILE.ENTRANCE_B;

  return grid;
}

module.exports = { generateMaze };
