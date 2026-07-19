/**
 * RemotePlayerInterpolator — 100 ms snapshot buffer for smooth remote player movement.
 *
 * Each server STATE_UPDATE tick delivers a snapshot:
 *   { id, x, y, z, yaw, seq, timestamp }
 *
 * On every render frame we read the buffer at (now - BUFFER_MS) and
 * lerp between the two nearest snapshots to produce a smooth position.
 *
 * This eliminates the jitter from ~20 Hz server ticks while staying
 * within the 100 ms latency budget specified in the Blueprint.
 */

const BUFFER_MS = 100;   // how far in the past we render (ms)

export class RemotePlayerInterpolator {
  constructor() {
    // Map of playerId → Array of { x, y, z, yaw, t (ms) }
    this._buffers = new Map();
  }

  /**
   * Push a new server snapshot into the player's buffer.
   * @param {string} id
   * @param {object} snap  { x, y, z, yaw }
   */
  pushSnapshot(id, snap) {
    if (!this._buffers.has(id)) this._buffers.set(id, []);

    const buf = this._buffers.get(id);
    buf.push({ ...snap, t: performance.now() });

    // Keep buffer bounded (max 32 snapshots ~1.6 s at 20 Hz)
    if (buf.length > 32) buf.splice(0, buf.length - 32);
  }

  /**
   * Get the interpolated { x, y, z, yaw } for a player at render time.
   * Returns null if there aren't enough snapshots yet.
   * @param {string} id
   */
  getInterpolated(id) {
    const buf = this._buffers.get(id);
    if (!buf || buf.length < 2) return null;

    const renderTime = performance.now() - BUFFER_MS;

    // Find the two snapshots that straddle renderTime
    let prev = null;
    let next = null;

    for (let i = buf.length - 1; i >= 1; i--) {
      if (buf[i - 1].t <= renderTime && buf[i].t >= renderTime) {
        prev = buf[i - 1];
        next = buf[i];
        break;
      }
    }

    // If renderTime is older than all buffer entries, use the oldest pair
    if (!prev) {
      prev = buf[0];
      next = buf[1];
    }

    // Normalised t ∈ [0,1] between the two snapshots
    const span = next.t - prev.t;
    const t    = span > 0 ? Math.min(1, (renderTime - prev.t) / span) : 0;

    // Lerp position
    const x = prev.x + (next.x - prev.x) * t;
    const y = prev.y + (next.y - prev.y) * t;
    const z = prev.z + (next.z - prev.z) * t;

    // Slerp yaw (handle wrap-around at ±π)
    let dyaw = next.yaw - prev.yaw;
    if (dyaw >  Math.PI) dyaw -= 2 * Math.PI;
    if (dyaw < -Math.PI) dyaw += 2 * Math.PI;
    const yaw = prev.yaw + dyaw * t;

    return { x, y, z, yaw };
  }

  /** Remove buffer for a player who left. */
  remove(id) {
    this._buffers.delete(id);
  }

  /** Prune all buffers (call on scene teardown). */
  dispose() {
    this._buffers.clear();
  }
}
