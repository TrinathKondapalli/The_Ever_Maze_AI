import * as THREE from 'three';
import { GAME_CONFIG } from '@shared/gameConfig.js';
import { EVENTS } from '@shared/constants.js';
import { CollisionDetector } from './CollisionDetector.js';
import socket from '../socket/socket.js';
import { audioManager } from '../audio/AudioManager.js';

/**
 * PlayerController — handles movement physics with client-side prediction.
 *
 * Responsibilities:
 *  - Read InputManager state each tick
 *  - Apply walk/run/sprint speeds
 *  - Apply gravity + jump
 *  - Resolve AABB collision against map chunks
 *  - Maintain a short input history buffer for server reconciliation (Module 10)
 */

const GRAVITY         = -18;          // m/s²
const GROUND_Y        = 0;            // ground plane Y
const MAX_FALL_SPEED  = -30;          // terminal velocity m/s
const HISTORY_MAX     = 64;           // frames of prediction history

export class PlayerController {
  /**
   * @param {object}  spawn       { x, y } chunk-grid spawn position
   * @param {Array}   chunks      flat array of map chunk objects
   * @param {number}  gridSize
   */
  constructor(spawn, chunks, gridSize) {
    // Convert spawn grid coords → world center
    const worldX = spawn.x * GAME_CONFIG.CHUNK_SIZE + GAME_CONFIG.CHUNK_SIZE / 2;
    const worldZ = spawn.y * GAME_CONFIG.CHUNK_SIZE + GAME_CONFIG.CHUNK_SIZE / 2;

    this.position = new THREE.Vector3(worldX, GROUND_Y, worldZ);
    this.velocity = new THREE.Vector3(0, 0, 0);

    this.yaw   = 0;  // horizontal look angle (radians)
    this.pitch = 0;  // vertical look angle (radians)

    this.isGrounded   = true;
    this.isSprinting  = false;

    this._collision = new CollisionDetector(chunks, gridSize);

    // Client-side prediction history  { seq, position, velocity, yaw }
    this._inputHistory  = [];
    this._sequenceNum   = 0;
    this._lastAttackTime = 0;

    // One-shot jump guard (don't hold Space to bunny-hop)
    this._jumpPressed   = false;

    this._stepDistance = 0;

    // Camera toggle
    this.isThirdPerson = false;
    this._togglePressed = false;
  }

  /**
   * Called every animation frame.
   * @param {object} input   result of InputManager.getState()
   * @param {number} delta   seconds since last frame
   */
  update(input, delta) {
    // ── 1. Camera toggle ──────────────────────────────────────────────
    if (input.toggleCamera && !this._togglePressed) {
      this.isThirdPerson = !this.isThirdPerson;
    }
    this._togglePressed = input.toggleCamera;

    // ── 2. Mouse-look ────────────────────────────────────────────────
    const sensitivity = GAME_CONFIG.CAMERA_SENSITIVITY_DEFAULT * 0.002;
    this.yaw   -= input.mouseDX * sensitivity;
    this.pitch -= input.mouseDY * sensitivity;

    // Clamp pitch so player can't look fully upside-down
    this.pitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.pitch));

    // ── 3. Horizontal movement ───────────────────────────────────────
    this.isSprinting = input.sprint && input.forward;
    const speed = this.isSprinting
      ? GAME_CONFIG.PLAYER_RUN_SPEED
      : GAME_CONFIG.PLAYER_WALK_SPEED;

    // Build direction from yaw
    const moveDir = new THREE.Vector3();
    if (input.forward)  moveDir.z -= 1;
    if (input.backward) moveDir.z += 1;
    if (input.left)     moveDir.x -= 1;
    if (input.right)    moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      // Rotate movement vector by player's yaw
      moveDir.applyEuler(new THREE.Euler(0, this.yaw, 0));
    }

    const dx = moveDir.x * speed * delta;
    const dz = moveDir.z * speed * delta;

    // ── 4. Collision resolve ─────────────────────────────────────────
    const resolved = this._collision.resolve(
      this.position.x, this.position.z, dx, dz
    );
    const clamped = this._collision.clampToBounds(resolved.x, resolved.z);
    this.position.x = clamped.x;
    this.position.z = clamped.z;

    // Footstep sounds
    if (this.isGrounded && (dx !== 0 || dz !== 0)) {
      this._stepDistance += Math.sqrt(dx * dx + dz * dz);
      // Play step every ~1.5 meters (faster if sprinting)
      if (this._stepDistance > 1.8) {
        this._stepDistance = 0;
        audioManager.play('step', 0.2);
      }
    } else {
      this._stepDistance = 0;
    }

    // ── 5. Vertical / gravity / jump ─────────────────────────────────
    if (input.jump && this.isGrounded && !this._jumpPressed) {
      // v² = 2gh → v = sqrt(2 * |g| * jumpHeight)
      this.velocity.y = Math.sqrt(2 * Math.abs(GRAVITY) * GAME_CONFIG.JUMP_HEIGHT);
      this.isGrounded = false;
      audioManager.play('jump', 0.4);
    }
    this._jumpPressed = input.jump;

    if (!this.isGrounded) {
      this.velocity.y += GRAVITY * delta;
      this.velocity.y  = Math.max(this.velocity.y, MAX_FALL_SPEED);
      this.position.y += this.velocity.y * delta;

      if (this.position.y <= GROUND_Y) {
        this.position.y  = GROUND_Y;
        this.velocity.y  = 0;
        this.isGrounded  = true;
      }
    }

    // ── 6. Store prediction snapshot ─────────────────────────────────
    this._sequenceNum++;
    this._inputHistory.push({
      seq:      this._sequenceNum,
      position: this.position.clone(),
      velocity: this.velocity.clone(),
      yaw:      this.yaw,
    });
    if (this._inputHistory.length > HISTORY_MAX) {
      this._inputHistory.shift();
    }

    // ── 7. Emit input to server ──────────────────────────────────────
    // We send the inputs we just processed, along with the sequence number.
    // For Module 10's basic server implementation, we also send the resulting
    // position so the server can track us blindly. A full authoritative
    // server would only accept inputs and recalculate position.
    socket.emit(EVENTS.PLAYER_MOVE, {
      seq:      this._sequenceNum,
      dt:       delta,
      forward:  input.forward,
      backward: input.backward,
      left:     input.left,
      right:    input.right,
      sprint:   input.sprint,
      yaw:      this.yaw,
      // For basic server state syncing:
      x:        this.position.x,
      y:        this.position.y,
      z:        this.position.z,
    });

    // ── 8. Emit Attack ───────────────────────────────────────────────
    if (input.attack) {
      const now = Date.now();
      if (now - this._lastAttackTime >= GAME_CONFIG.ATTACK_COOLDOWN_MS) {
        this._lastAttackTime = now;
        socket.emit(EVENTS.PLAYER_ATTACK);
        audioManager.play('attack', 0.5);
        
        // Local hit animation (optional, Module 11 visual feedback)
        // We could dispatch a custom event here for GameWorld/HUD to catch
        window.dispatchEvent(new CustomEvent('localPlayerAttacked'));
      }
    }
  }

  /**
   * Reconcile with a server-authoritative position snapshot.
   * @param {object} serverState  { seq, x, y, z }
   */
  reconcile(serverState) {
    // Find the matching snapshot
    const idx = this._inputHistory.findIndex(s => s.seq === serverState.seq);
    if (idx === -1) return;

    const snap = this._inputHistory[idx];
    const serverPos = new THREE.Vector3(serverState.x, serverState.y, serverState.z);
    const err = snap.position.distanceTo(serverPos);

    if (err > GAME_CONFIG.PREDICTION_RECONCILE_THRESHOLD) {
      // Hard snap — smoothing lerp added in Module 10
      this.position.copy(serverPos);
    }

    // Discard history older than reconciled snapshot
    this._inputHistory.splice(0, idx + 1);
  }

  /**
   * Return the eye-level world position for camera attachment.
   */
  getEyePosition() {
    return new THREE.Vector3(
      this.position.x,
      this.position.y + GAME_CONFIG.EYE_HEIGHT,
      this.position.z,
    );
  }

  /**
   * Serialise current state for server tick transmission (Module 10).
   */
  getNetworkSnapshot() {
    return {
      seq: this._sequenceNum,
      x:   this.position.x,
      y:   this.position.y,
      z:   this.position.z,
      yaw: this.yaw,
    };
  }
}
