import { TILE } from '../../constants/index.js';

export function calculateVisibility(maze, cx, cy, radius) {
  const size = maze.length;
  const mask = Array.from({ length: size }, () => Array(size).fill(false));

  function castRay(x0, y0, x1, y1) {
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let sx = (x0 < x1) ? 1 : -1;
    let sy = (y0 < y1) ? 1 : -1;
    let err = dx - dy;

    let currX = x0;
    let currY = y0;

    while (true) {
      if (currX >= 0 && currX < size && currY >= 0 && currY < size) {
        mask[currY][currX] = true;
        
        // Stop if we hit a wall
        if (maze[currY][currX] === TILE.WALL) {
          break;
        }
      } else {
        break;
      }

      if (currX === x1 && currY === y1) break;
      
      let e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        currX += sx;
      }
      if (e2 < dx) {
        err += dx;
        currY += sy;
      }
    }
  }

  // Iterate over perimeter of the bounding box defined by radius
  const minX = Math.max(0, cx - radius);
  const maxX = Math.min(size - 1, cx + radius);
  const minY = Math.max(0, cy - radius);
  const maxY = Math.min(size - 1, cy + radius);

  // Top and Bottom edges
  for (let x = minX; x <= maxX; x++) {
    castRay(cx, cy, x, minY);
    castRay(cx, cy, x, maxY);
  }
  // Left and Right edges
  for (let y = minY; y <= maxY; y++) {
    castRay(cx, cy, minX, y);
    castRay(cx, cy, maxX, y);
  }

  return mask;
}
