import * as THREE from 'three';
import { TREASURE_STATE } from '@shared/constants.js';
import { GAME_CONFIG } from '@shared/gameConfig.js';

/**
 * Treasure — animated gold chest entity rendered in the 3D world.
 *
 * Hierarchy:
 *   root (Group)  — floats up/down
 *     ├── chestBase    (box, gold lower body)
 *     ├── chestLid     (box, gold lid with hinge)
 *     ├── glowRing     (torus on ground — discovery range indicator)
 *     └── light        (PointLight — warm gold glow)
 */
export class Treasure {
  /**
   * @param {THREE.Scene} scene
   * @param {object}      treasurePos  { worldX, worldZ }
   */
  constructor(scene, treasurePos) {
    this.scene  = scene;
    this.worldX = treasurePos.worldX;
    this.worldZ = treasurePos.worldZ;

    this.state      = TREASURE_STATE.HIDDEN;
    this.carrierId  = null;
    this.visible    = false;

    this._time = 0;

    // ── Root group ─────────────────────────────────────────────────────
    this.root = new THREE.Group();
    this.root.position.set(this.worldX, GAME_CONFIG.TREASURE_FLOAT_HEIGHT, this.worldZ);
    this.root.visible = false;

    // ── Chest base (lower box) ─────────────────────────────────────────
    const baseGeo = new THREE.BoxGeometry(0.9, 0.55, 0.6);
    const goldMat = new THREE.MeshStandardMaterial({
      color:      0xd4a017,
      metalness:  0.95,
      roughness:  0.12,
      emissive:   0xf4a828,
      emissiveIntensity: 0.25,
      flatShading: false,
    });
    const base = new THREE.Mesh(baseGeo, goldMat);
    base.position.set(0, 0, 0);
    base.castShadow = true;
    this.root.add(base);

    // ── Chest lid ──────────────────────────────────────────────────────
    const lidGeo = new THREE.BoxGeometry(0.9, 0.28, 0.6);
    const lid    = new THREE.Mesh(lidGeo, goldMat);
    lid.position.set(0, 0.4, 0);
    lid.castShadow = true;
    this.root.add(lid);
    this._lid = lid;

    // ── Lock (small bright cube on front) ─────────────────────────────
    const lockMat = new THREE.MeshStandardMaterial({
      color: 0xffe066, metalness: 1.0, roughness: 0.05,
      emissive: 0xffd700, emissiveIntensity: 0.9,
    });
    const lockGeo  = new THREE.BoxGeometry(0.18, 0.18, 0.04);
    const lockMesh = new THREE.Mesh(lockGeo, lockMat);
    lockMesh.position.set(0, 0.02, 0.32);
    this.root.add(lockMesh);

    // ── Discovery ring (on ground, shows pickup radius) ────────────────
    const ringGeo = new THREE.RingGeometry(
      GAME_CONFIG.TREASURE_PICKUP_RADIUS - 0.04,
      GAME_CONFIG.TREASURE_PICKUP_RADIUS,
      48
    );
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xf4a828, side: THREE.DoubleSide,
      transparent: true, opacity: 0.35,
    });
    this._ring = new THREE.Mesh(ringGeo, ringMat);
    this._ring.position.set(this.worldX, 0.02, this.worldZ); // flat on ground
    this._ring.visible = false;
    scene.add(this._ring);   // separate from root so it stays flat

    // ── Gold glow point light ──────────────────────────────────────────
    this._light = new THREE.PointLight(0xf4a828, 5, GAME_CONFIG.TREASURE_GLOW_RADIUS);
    this._light.position.set(0, 0.5, 0);
    this.root.add(this._light);

    scene.add(this.root);
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Update treasure from a server snapshot.
   * @param {object} snap  { state, carrierId, x, z }
   */
  applySnapshot(snap) {
    this.state     = snap.state;
    this.carrierId = snap.carrierId;

    const onGround = (
      snap.state === TREASURE_STATE.ON_GROUND ||
      snap.state === TREASURE_STATE.DROPPED
    );
    const carried  = (
      snap.state === TREASURE_STATE.CARRIED_A ||
      snap.state === TREASURE_STATE.CARRIED_B
    );

    if (onGround) {
      // Move to drop position
      if (snap.x != null) {
        this.root.position.set(snap.x, GAME_CONFIG.TREASURE_FLOAT_HEIGHT, snap.z);
        this._ring.position.set(snap.x, 0.02, snap.z);
      }
      this._show(true);
    } else if (carried) {
      // Hide the chest (carrier holds it — Module 10 attaches it to carrier mesh)
      this._show(false);
    } else {
      // Hidden
      this._show(false);
    }
  }

  /**
   * Move treasure to follow a carrier's world position (called every frame
   * while state is CARRIED).
   * @param {THREE.Vector3|{x,y,z}} pos
   */
  followCarrier(pos) {
    if (!this.visible) return;
    this.root.position.set(pos.x, pos.y + 0.9, pos.z);
  }

  /**
   * Main animation loop — float, spin, pulse ring.
   * @param {number} delta seconds
   */
  update(delta) {
    this._time += delta;

    if (!this.root.visible) return;

    // Float bob
    this.root.position.y = GAME_CONFIG.TREASURE_FLOAT_HEIGHT + Math.sin(this._time * 1.8) * 0.12;

    // Slow spin
    this.root.rotation.y += delta * 0.9;

    // Pulse the glow intensity
    this._light.intensity = 4 + Math.sin(this._time * 3) * 1.5;

    // Pulse the discovery ring opacity
    if (this._ring.visible) {
      this._ring.material.opacity = 0.2 + Math.abs(Math.sin(this._time * 2)) * 0.25;
    }
  }

  /**
   * Check whether the local player is within pickup range.
   * @param {THREE.Vector3} playerPos
   * @returns {boolean}
   */
  isInPickupRange(playerPos) {
    if (!this.root.visible) return false;
    const dx = playerPos.x - this.root.position.x;
    const dz = playerPos.z - this.root.position.z;
    return Math.sqrt(dx * dx + dz * dz) <= GAME_CONFIG.TREASURE_PICKUP_RADIUS;
  }

  // ── Private ───────────────────────────────────────────────────────────

  _show(visible) {
    this.visible         = visible;
    this.root.visible    = visible;
    this._ring.visible   = visible;
  }

  /** Remove all scene objects and free GPU resources. */
  destroy() {
    this.scene.remove(this.root);
    this.scene.remove(this._ring);

    this.root.traverse((child) => {
      if (child.isMesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });

    this._ring.geometry.dispose();
    this._ring.material.dispose();
  }
}
