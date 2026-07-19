import * as THREE from 'three';
import { GAME_CONFIG } from '@shared/gameConfig.js';
import { CollisionDetector } from './CollisionDetector.js';

/**
 * CameraController — First-person and Third-person camera system.
 *
 * FP mode: camera sits at player eye position, rotates with yaw/pitch.
 * TP mode: camera orbits BEHIND the player at a fixed arm distance,
 *           auto-zooms in if the arm ray hits a blocked chunk wall.
 */

const TP_ARM      = GAME_CONFIG.TP_CAMERA_DISTANCE;   // 4 m behind
const TP_HEIGHT   = GAME_CONFIG.TP_CAMERA_HEIGHT;     // 1.5 m above player

export class CameraController {
  /**
   * @param {THREE.Camera}   camera
   * @param {Array}          chunks   flat map chunk array (for TP wall check)
   * @param {number}         gridSize
   */
  constructor(camera, chunks, gridSize) {
    this.camera     = camera;
    this._collision = new CollisionDetector(chunks, gridSize);

    // Reusable objects (avoid GC pressure in hot loop)
    this._euler      = new THREE.Euler(0, 0, 0, 'YXZ');
    this._tpTarget   = new THREE.Vector3();
    this._tpOffset   = new THREE.Vector3();
    this._raycaster  = new THREE.Raycaster();
    this._rayDir     = new THREE.Vector3();
  }

  /**
   * Update the Three.js camera to match the player's position/orientation.
   *
   * @param {PlayerController} player
   */
  update(player) {
    if (player.isThirdPerson) {
      this._updateTP(player);
    } else {
      this._updateFP(player);
    }
  }

  // ── First-Person ────────────────────────────────────────────────────────────

  _updateFP(player) {
    const eye = player.getEyePosition();
    this.camera.position.copy(eye);

    // Apply yaw then pitch (YXZ order prevents gimbal lock)
    this._euler.set(player.pitch, player.yaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(this._euler);
  }

  // ── Third-Person ────────────────────────────────────────────────────────────

  _updateTP(player) {
    const eyePos = player.getEyePosition();

    // Direction the player is facing (yaw only for TP pivot)
    const fwdX = Math.sin(player.yaw);
    const fwdZ = Math.cos(player.yaw);

    // Ideal camera position = behind player
    let armLen = TP_ARM;
    const idealX = eyePos.x + fwdX * armLen;
    const idealY = eyePos.y + TP_HEIGHT;
    const idealZ = eyePos.z + fwdZ * armLen;

    // Auto-zoom: shorten arm if it clips into a wall (XZ plane check only)
    const dx = idealX - eyePos.x;
    const dz = idealZ - eyePos.z;
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const testX = eyePos.x + dx * t;
      const testZ = eyePos.z + dz * t;
      if (this._collision._overlapsBlocked(testX, testZ)) {
        // Shorten arm to just before this hit
        armLen = TP_ARM * ((i - 1) / steps);
        armLen = Math.max(GAME_CONFIG.TP_AUTOZOOM_MIN_CLEARANCE, armLen);
        break;
      }
    }

    const camX = eyePos.x + fwdX * armLen;
    const camY = eyePos.y + TP_HEIGHT;
    const camZ = eyePos.z + fwdZ * armLen;

    this.camera.position.set(camX, camY, camZ);

    // Look at player torso
    this._tpTarget.set(
      eyePos.x,
      eyePos.y - GAME_CONFIG.PLAYER_HEIGHT * 0.2,
      eyePos.z,
    );
    this.camera.lookAt(this._tpTarget);
  }
}
