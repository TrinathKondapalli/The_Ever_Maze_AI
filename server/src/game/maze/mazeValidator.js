const { TILE } = require('../../../../shared/constants.js');

function validateMaze(grid) {
  const size = grid.length;
  
  let startA = null;
  let startB = null;
  let exit = null;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (grid[y][x] === TILE.ENTRANCE_A) startA = { x, y };
      if (grid[y][x] === TILE.ENTRANCE_B) startB = { x, y };
      if (grid[y][x] === TILE.EXIT) exit = { x, y };
    }
  }

  if (!startA || !startB || !exit) return false;

  function canReach(start, target1, target2) {
    const queue = [start];
    const visited = new Set();
    visited.add(`${start.x},${start.y}`);
    
    let found1 = false;
    let found2 = false;

    const dirs = [
      { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
    ];

    while (queue.length > 0) {
      const curr = queue.shift();
      
      if (curr.x === target1.x && curr.y === target1.y) found1 = true;
      if (target2 && curr.x === target2.x && curr.y === target2.y) found2 = true;
      
      if (found1 && (!target2 || found2)) return true;

      for (const d of dirs) {
        const nx = curr.x + d.dx;
        const ny = curr.y + d.dy;
        
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
          if (grid[ny][nx] !== TILE.WALL && !visited.has(`${nx},${ny}`)) {
            visited.add(`${nx},${ny}`);
            queue.push({ x: nx, y: ny });
          }
        }
      }
    }
    
    return false;
  }

  // Validate path from Entrance A to Exit and Entrance B
  if (!canReach(startA, exit, startB)) return false;
  
  // Validate path from Entrance B to Exit (redundant since A reached B and Exit, but good for safety)
  if (!canReach(startB, exit, null)) return false;

  return true;
}

module.exports = { validateMaze };
