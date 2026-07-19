import { GAME_CONFIG } from '../../../shared/gameConfig.js';
import { TEAM } from '../../../shared/constants.js';

/**
 * PlayerState — tracks authoritative world position, physics state, and health.
 */
export class PlayerState {
  /**
   * @param {string} sessionId
   * @param {string} name
   * @param {string} team (TEAM.A or TEAM.B)
   * @param {object} spawnPos { worldX, worldZ }
   */
  constructor(sessionId, name, team, spawnPos) {
    this.sessionId = sessionId;
    this.name = name;
    this.team = team;
    
    // Server-authoritative position
    this.x = spawnPos.worldX;
    this.y = 0; // Ground level
    this.z = spawnPos.worldZ;
    
    this.yaw = 0;
    this.health = GAME_CONFIG.PLAYER_MAX_HEALTH;
    
    // Last processed input sequence number for client reconciliation
    this.lastProcessedSeq = 0;
    
    // Pending input packets queued for the next tick
    this.inputQueue = [];
  }

  /**
   * Serialise for STATE_UPDATE broadcast.
   */
  toSnapshot() {
    return {
      id: this.sessionId,
      name: this.name,
      team: this.team,
      health: this.health,
      x: this.x,
      y: this.y,
      z: this.z,
      yaw: this.yaw,
      seq: this.lastProcessedSeq,
    };
  }
}
