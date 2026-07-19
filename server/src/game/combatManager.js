import { GAME_CONFIG } from '../../../shared/gameConfig.js';

/**
 * CombatManager — calculates melee hit detection and cooldowns.
 */
export class CombatManager {
  /**
   * Evaluates a melee attack from an attacker and returns a list of hit sessionIds.
   * 
   * @param {object} attackerState { id, team, x, z, yaw, lastAttackTime }
   * @param {object} allPlayers Map of sessionId -> playerState
   * @returns {Array<string>} list of sessionIds that were successfully hit
   */
  static evaluateAttack(attackerState, allPlayers) {
    const hits = [];
    const now = Date.now();

    // 1. Check cooldown
    if (attackerState.lastAttackTime && (now - attackerState.lastAttackTime < GAME_CONFIG.ATTACK_COOLDOWN_MS)) {
      return hits; // Still on cooldown
    }

    attackerState.lastAttackTime = now;

    // 2. Cone Hit Detection
    const ax = attackerState.x;
    const az = attackerState.z;
    const ayaw = attackerState.yaw;

    // The attacker is facing `ayaw` (0 is +Z, though Three.js usually treats 0 as -Z depending on camera setup.
    // In our PlayerController, yaw rotates the movement vector.
    // Direction vector of attacker (based on our PlayerController logic: moveDir rotated by yaw)
    // Actually, in PlayerController: if (input.forward) moveDir.z -= 1. Then applyEuler(yaw).
    // So forward is -Z. Let's calculate the forward vector based on this.
    const fwdX = -Math.sin(ayaw);
    const fwdZ = -Math.cos(ayaw);

    const maxDist = GAME_CONFIG.ATTACK_RANGE;
    // Cosine of half the cone angle
    const cosHalfCone = Math.cos((GAME_CONFIG.ATTACK_CONE_DEGREES / 2) * (Math.PI / 180));

    for (const [targetId, targetState] of Object.entries(allPlayers)) {
      if (targetId === attackerState.sessionId) continue; // Don't hit self
      
      // Can't hit dead players
      if (targetState.health <= 0) continue;
      
      // Friendly fire check? Usually disabled in team games, but stealing treasure from teammate isn't allowed.
      // We'll allow hits on everyone here, but filter out friendly damage later, or filter here:
      if (targetState.team === attackerState.team) continue;

      const dx = targetState.x - ax;
      const dz = targetState.z - az;
      const distSq = dx * dx + dz * dz;

      // Distance check
      if (distSq <= maxDist * maxDist && distSq > 0) {
        const dist = Math.sqrt(distSq);
        // Normalize direction to target
        const dirX = dx / dist;
        const dirZ = dz / dist;

        // Dot product between forward vector and direction to target
        const dot = (fwdX * dirX) + (fwdZ * dirZ);

        if (dot >= cosHalfCone) {
          hits.push(targetId);
        }
      }
    }

    return hits;
  }
}
