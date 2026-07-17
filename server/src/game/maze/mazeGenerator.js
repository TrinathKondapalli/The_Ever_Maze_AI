const { TILE } = require('../../../../shared/constants.js');

function generateMaze(size, type = 'STANDARD') {
  size = size % 2 === 0 ? size + 1 : size;
  
  if (type === 'CAVE') {
    return generateCave(size);
  } else if (type === 'ARENA') {
    return generateArena(size);
  } else {
    return generateStandardMaze(size);
  }
}

function generateStandardMaze(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(TILE.WALL));
  const dirs = [
    { dx: 0, dy: -2 }, { dx: 2, dy: 0 }, { dx: 0, dy: 2 }, { dx: -2, dy: 0 }
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

  function carve(cx, cy) {
    grid[cy][cx] = TILE.FLOOR;
    const shuffledDirs = [...dirs];
    shuffle(shuffledDirs);
    
    for (const dir of shuffledDirs) {
      const nx = cx + dir.dx;
      const ny = cy + dir.dy;
      if (inBounds(nx, ny) && grid[ny][nx] === TILE.WALL) {
        grid[cy + dir.dy / 2][cx + dir.dx / 2] = TILE.FLOOR;
        carve(nx, ny);
      }
    }
  }

  carve(1, 1);

  const deadEndRemovalChance = 0.5;
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
        if (wallCount >= 3 && possibleCarves.length > 0 && Math.random() < deadEndRemovalChance) {
          const carveDir = possibleCarves[Math.floor(Math.random() * possibleCarves.length)];
          grid[y + carveDir.dy][x + carveDir.dx] = TILE.FLOOR;
        }
      }
    }
  }

  return placeEntrancesAndExit(grid, size);
}

function generateCave(size) {
  let grid = Array.from({ length: size }, () => Array(size).fill(TILE.WALL));
  
  // Random initialization
  const fillProb = 0.45;
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      grid[y][x] = Math.random() < fillProb ? TILE.WALL : TILE.FLOOR;
    }
  }

  // Cellular Automata smoothing
  for (let step = 0; step < 5; step++) {
    const newGrid = Array.from({ length: size }, () => Array(size).fill(TILE.WALL));
    for (let y = 1; y < size - 1; y++) {
      for (let x = 1; x < size - 1; x++) {
        let wallNeighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (grid[y + dy][x + dx] === TILE.WALL) wallNeighbors++;
          }
        }
        if (wallNeighbors > 4 || wallNeighbors === 0) {
           newGrid[y][x] = TILE.WALL;
        } else {
           newGrid[y][x] = TILE.FLOOR;
        }
      }
    }
    grid = newGrid;
  }
  
  // Ensure border is solid
  for (let i = 0; i < size; i++) {
    grid[0][i] = grid[size-1][i] = grid[i][0] = grid[i][size-1] = TILE.WALL;
  }

  // Ensure center is open for the exit/light
  const c = Math.floor(size/2);
  for (let dy = -2; dy <= 2; dy++) {
    for (let dx = -2; dx <= 2; dx++) {
      grid[c+dy][c+dx] = TILE.FLOOR;
    }
  }

  // Ensure corners are open for spawns
  grid[1][1] = grid[1][2] = grid[2][1] = TILE.FLOOR;
  grid[size-2][size-2] = grid[size-3][size-2] = grid[size-2][size-3] = TILE.FLOOR;

  return placeEntrancesAndExit(grid, size);
}

function generateArena(size) {
  const grid = Array.from({ length: size }, () => Array(size).fill(TILE.FLOOR));
  
  // Solid borders
  for (let i = 0; i < size; i++) {
    grid[0][i] = grid[size-1][i] = grid[i][0] = grid[i][size-1] = TILE.WALL;
  }

  // Place symmetrical pillars
  const spacing = 4;
  for (let y = spacing; y < size - spacing; y += spacing) {
    for (let x = spacing; x < size - spacing; x += spacing) {
      grid[y][x] = TILE.WALL;
      // Add a bit of thickness randomly
      if (Math.random() < 0.5) grid[y][x+1] = TILE.WALL;
      if (Math.random() < 0.5) grid[y+1][x] = TILE.WALL;
    }
  }
  
  // Ensure center is clear
  const c = Math.floor(size/2);
  for(let dy = -2; dy <= 2; dy++) {
    for(let dx = -2; dx <= 2; dx++) {
       grid[c+dy][c+dx] = TILE.FLOOR;
    }
  }

  return placeEntrancesAndExit(grid, size);
}

function placeEntrancesAndExit(grid, size) {
  const center = Math.floor(size / 2);
  
  grid[center][center] = TILE.EXIT;
  if (grid[center - 1][center] !== TILE.FLOOR && grid[center + 1][center] !== TILE.FLOOR &&
      grid[center][center - 1] !== TILE.FLOOR && grid[center][center + 1] !== TILE.FLOOR) {
        grid[center - 1][center] = TILE.FLOOR;
  }

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
