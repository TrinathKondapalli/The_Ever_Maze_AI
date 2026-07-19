import { TREASURE_STATE, EVENTS } from '../../../shared/constants.js';
import { GAME_CONFIG } from '../../../shared/gameConfig.js';

/**
 * TreasureManager — server-authoritative treasure lifecycle.
 *
 * State machine:
 *   HIDDEN  ──(TREASURE_FOUND)──►  ON_GROUND
 *   ON_GROUND ──(PICKUP)──────────►  CARRIED_A / CARRIED_B
 *   CARRIED_* ──(DROP/ELIM)───────►  DROPPED
 *   DROPPED  ──(PICKUP)───────────►  CARRIED_A / CARRIED_B
 *   CARRIED_* ──(EXIT reached)────►  VICTORY (handled in matchManager)
 */
export class TreasureManager {
  constructor(mapData) {
    this.state       = TREASURE_STATE.HIDDEN;
    this.carrierId   = null;   // sessionId of current carrier (null if none)
    this.carrierTeam = null;

    // World position of treasure chest (from map)
    this.worldX = mapData.treasurePos.worldX;
    this.worldZ = mapData.treasurePos.worldZ;

    // Drop position (set when carrier is eliminated or drops)
    this.dropX = this.worldX;
    this.dropZ = this.worldZ;

    // Pickup immunity: carrier cannot be instantly robbed
    this._pickupImmunityUntil = 0;

    // Timestamp when treasure became ON_GROUND (enables drop-delay protection)
    this._groundedAt = 0;
  }

  // ── Queries ──────────────────────────────────────────────────────────

  isHidden()   { return this.state === TREASURE_STATE.HIDDEN; }
  isOnGround() { return this.state === TREASURE_STATE.ON_GROUND || this.state === TREASURE_STATE.DROPPED; }
  isCarried()  { return this.state === TREASURE_STATE.CARRIED_A || this.state === TREASURE_STATE.CARRIED_B; }

  /** Return the current treasure world position. */
  getPosition() {
    if (this.isCarried()) return null;  // carried — use carrier player position
    return { x: this.dropX, z: this.dropZ };
  }

  /** Serialise for STATE_UPDATE broadcast. */
  toSnapshot() {
    return {
      state:     this.state,
      carrierId: this.carrierId,
      x:         this.isCarried() ? null : this.dropX,
      z:         this.isCarried() ? null : this.dropZ,
    };
  }

  // ── Transitions ──────────────────────────────────────────────────────

  /**
   * Mark treasure as discovered (first player sees it).
   * Treasure remains on the ground at its map position.
   */
  reveal() {
    if (this.state !== TREASURE_STATE.HIDDEN) return false;
    this.state = TREASURE_STATE.ON_GROUND;
    this._groundedAt = Date.now();
    return true;
  }

  /**
   * Attempt a pickup by a player.
   * @param {object} player   { sessionId, team, x, z }
   * @returns {{ ok: boolean, reason?: string }}
   */
  tryPickup(player) {
    const now = Date.now();

    // Must be on ground (initial or dropped)
    if (!this.isOnGround()) {
      return { ok: false, reason: 'Treasure is not on the ground.' };
    }

    // Drop-delay protection: cannot pick up immediately after it was dropped
    if (now - this._groundedAt < GAME_CONFIG.TREASURE_DROP_PICKUP_DELAY_MS) {
      return { ok: false, reason: 'Treasure just dropped — wait a moment.' };
    }

    // Range check
    const tx = this.dropX, tz = this.dropZ;
    const dist = Math.sqrt((player.x - tx) ** 2 + (player.z - tz) ** 2);
    if (dist > GAME_CONFIG.TREASURE_PICKUP_RADIUS) {
      return { ok: false, reason: 'Too far from the treasure.' };
    }

    // Assign carrier
    this.state       = player.team === 'A' ? TREASURE_STATE.CARRIED_A : TREASURE_STATE.CARRIED_B;
    this.carrierId   = player.sessionId;
    this.carrierTeam = player.team;
    this._pickupImmunityUntil = now + GAME_CONFIG.CARRIER_PICKUP_IMMUNITY_MS;

    return { ok: true };
  }

  /**
   * Drop the treasure at a given position (carrier eliminated or manual drop).
   * @param {number} x  world X of drop
   * @param {number} z  world Z of drop
   */
  drop(x, z) {
    if (!this.isCarried()) return false;

    this.state     = TREASURE_STATE.DROPPED;
    this.carrierId = null;
    this.carrierTeam = null;
    this.dropX     = x;
    this.dropZ     = z;
    this._groundedAt = Date.now();

    return true;
  }

  /**
   * Attempt to steal from current carrier by an opposing team player.
   * @param {object} attacker  { sessionId, team, x, z }
   * @param {object} carrier   { x, z }   current carrier world position
   * @returns {{ ok: boolean, reason?: string }}
   */
  trySteal(attacker, carrier) {
    const now = Date.now();
    if (!this.isCarried()) return { ok: false, reason: 'Treasure not carried.' };
    if (attacker.team === this.carrierTeam) return { ok: false, reason: 'Same team.' };
    if (now < this._pickupImmunityUntil) return { ok: false, reason: 'Carrier is immune.' };

    const dist = Math.sqrt((attacker.x - carrier.x) ** 2 + (attacker.z - carrier.z) ** 2);
    if (dist > GAME_CONFIG.ATTACK_RANGE) return { ok: false, reason: 'Out of range.' };

    // Transfer carry
    const prev = { carrierId: this.carrierId, team: this.carrierTeam };
    this.state       = attacker.team === 'A' ? TREASURE_STATE.CARRIED_A : TREASURE_STATE.CARRIED_B;
    this.carrierId   = attacker.sessionId;
    this.carrierTeam = attacker.team;
    this._pickupImmunityUntil = now + GAME_CONFIG.CARRIER_PICKUP_IMMUNITY_MS;

    return { ok: true, prev };
  }

  /**
   * Validate an exit attempt by the carrier.
   * @param {object} carrier  { x, z }
   * @param {object} exitPos  { worldX, worldZ }
   */
  tryExit(carrier, exitPos) {
    if (!this.isCarried()) return { ok: false, reason: 'Not carrying treasure.' };

    const dist = Math.sqrt(
      (carrier.x - exitPos.worldX) ** 2 + (carrier.z - exitPos.worldZ) ** 2
    );
    if (dist > GAME_CONFIG.EXIT_TRIGGER_RADIUS) {
      return { ok: false, reason: 'Not at the exit.' };
    }

    return { ok: true };
  }
}
