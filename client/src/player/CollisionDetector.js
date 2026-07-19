import { GAME_CONFIG } from '@shared/gameConfig.js';
import { CHUNK_TYPE } from '@shared/constants.js';

/**
 * CollisionDetector — AABB sweep check against the map's blocked chunks.
 *
 * The player is represented as a capsule: a circle of radius PLAYER_RADIUS
 * on the XZ plane (Y is vertical). We check the 9 chunks surrounding the
 * player's current chunk position and reject moves that would overlap a
 * BLOCKED chunk's world-space bounding box.
 */

const CHUNK_SIZE  = GAME_CONFIG.CHUNK_SIZE;   // 16 m
const PLAYER_RADIUS = 0.35;                    // m — half width of bounding box

export class CollisionDetector {
  constructor(chunks, gridSize = GAME_CONFIG.MAP_GRID_SIZE) {
    this.chunks   = chunks;     // flat array length gridSize²
    this.gridSize = gridSize;
  }

  /** Return the chunk at grid coords (cx, cy), or null. */
  _chunkAt(cx, cy) {
    if (cx < 0 || cx >= this.gridSize || cy < 0 || cy >= this.gridSize) return null;
    return this.chunks[cy * this.gridSize + cx];
  }

  /** Convert a world X position to a chunk column index. */
  _toChunkX(worldX) { return Math.floor(worldX / CHUNK_SIZE); }
  /** Convert a world Z position to a chunk row index. */
  _toChunkZ(worldZ) { return Math.floor(worldZ / CHUNK_SIZE); }

  /**
   * Test whether the AABB centered at (x, z) with half-extents PLAYER_RADIUS
   * overlaps a blocked chunk.
   */
  _overlapsBlocked(x, z) {
    const cx = this._toChunkX(x);
    const cz = this._toChunkZ(z);

    // Check 3x3 neighbourhood
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const chunk = this._chunkAt(cx + dx, cz + dz);
        if (!chunk || !chunk.blocked) continue;

        // Chunk world AABB
        const minX = chunk.x * CHUNK_SIZE;
        const maxX = minX + CHUNK_SIZE;
        const minZ = chunk.y * CHUNK_SIZE;
        const maxZ = minZ + CHUNK_SIZE;

        // Player AABB
        const pMinX = x - PLAYER_RADIUS;
        const pMaxX = x + PLAYER_RADIUS;
        const pMinZ = z - PLAYER_RADIUS;
        const pMaxZ = z + PLAYER_RADIUS;

        if (pMaxX > minX && pMinX < maxX && pMaxZ > minZ && pMinZ < maxZ) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Attempt to move from (currentX, currentZ) by (dx, dz).
   * Returns the resolved {x, z} after axis-separated sliding collision.
   */
  resolve(currentX, currentZ, dx, dz) {
    // Try full move
    const nx = currentX + dx;
    const nz = currentZ + dz;

    if (!this._overlapsBlocked(nx, nz)) {
      return { x: nx, z: nz };
    }

    // Try X only
    if (!this._overlapsBlocked(nx, currentZ)) {
      return { x: nx, z: currentZ };
    }

    // Try Z only
    if (!this._overlapsBlocked(currentX, nz)) {
      return { x: currentX, z: nz };
    }

    // Fully blocked — no movement
    return { x: currentX, z: currentZ };
  }

  /**
   * Clamp world position to map boundary.
   */
  clampToBounds(x, z) {
    const max = this.gridSize * CHUNK_SIZE;
    return {
      x: Math.max(PLAYER_RADIUS, Math.min(max - PLAYER_RADIUS, x)),
      z: Math.max(PLAYER_RADIUS, Math.min(max - PLAYER_RADIUS, z)),
    };
  }
}
