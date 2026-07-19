import * as THREE from 'three';
import { TEAM } from '@shared/constants.js';
import { GAME_CONFIG } from '@shared/gameConfig.js';

/** Shared geometries & materials (created once, reused across all instances) */
let _bodyGeo    = null;
let _headGeo    = null;
let _matA       = null;   // Team A outline
let _matB       = null;   // Team B outline
let _matBody    = null;

function getSharedResources() {
  if (!_bodyGeo) {
    // Capsule body: cylinder torso + sphere head
    _bodyGeo = new THREE.CylinderGeometry(0.28, 0.28, 1.2, 7);
    _bodyGeo.translate(0, 0.6, 0);          // feet at y=0
    _headGeo = new THREE.SphereGeometry(0.28, 7, 5);
    _headGeo.translate(0, 1.5, 0);

    // Neutral body fill (dark)
    _matBody = new THREE.MeshStandardMaterial({
      color: 0x1a1a2e,
      roughness: 0.8,
      flatShading: true,
    });

    // Team A = blue glow outline
    _matA = new THREE.MeshBasicMaterial({
      color: 0x2563EB,
      side: THREE.BackSide,       // render the backfaces so it looks like an outline
      transparent: true,
      opacity: 0.85,
    });

    // Team B = red glow outline
    _matB = new THREE.MeshBasicMaterial({
      color: 0xDC2626,
      side: THREE.BackSide,
      transparent: true,
      opacity: 0.85,
    });
  }
  return { _bodyGeo, _headGeo, _matA, _matB, _matBody };
}

/**
 * RemotePlayer — visual representation of another player in the scene.
 *
 * Hierarchy:
 *   root (Group)
 *     ├── bodyMesh    (cylinder, fill)
 *     ├── headMesh    (sphere, fill)
 *     ├── bodyOutline (cylinder scaled +5%, backSide)
 *     ├── headOutline (sphere scaled +5%, backSide)
 *     ├── healthPips  (small boxes above head)
 *     └── nametag     (Billboard sprite — canvas texture)
 */
export class RemotePlayer {
  /**
   * @param {THREE.Scene} scene
   * @param {object}      playerData  { id, name, team, health }
   */
  constructor(scene, playerData) {
    this.scene  = scene;
    this.id     = playerData.id;
    this.name   = playerData.name   || 'Unknown';
    this.team   = playerData.team   || TEAM.A;
    this.health = playerData.health ?? GAME_CONFIG.PLAYER_MAX_HEALTH;

    const res = getSharedResources();

    // Root group (we move this every frame)
    this.root = new THREE.Group();

    // ── Body fill ──────────────────────────────────────────────────────
    const bodyMesh = new THREE.Mesh(res._bodyGeo, res._matBody);
    bodyMesh.castShadow = true;
    this.root.add(bodyMesh);

    const headMesh = new THREE.Mesh(res._headGeo, res._matBody);
    headMesh.castShadow = true;
    this.root.add(headMesh);

    // ── Team outline (scaled 1.05 so it peeks out behind body) ────────
    const outlineMat = this.team === TEAM.A ? res._matA : res._matB;

    const bodyOutlineGeo = res._bodyGeo.clone();
    bodyOutlineGeo.scale(1.05, 1.02, 1.05);
    const bodyOutline = new THREE.Mesh(bodyOutlineGeo, outlineMat);
    this.root.add(bodyOutline);

    const headOutlineGeo = res._headGeo.clone();
    headOutlineGeo.scale(1.08, 1.08, 1.08);
    const headOutline = new THREE.Mesh(headOutlineGeo, outlineMat);
    this.root.add(headOutline);

    // ── Health pips (small coloured cubes above head) ──────────────────
    this._pipGroup = new THREE.Group();
    this._pipGroup.position.set(0, 2.1, 0);
    this._buildPips();
    this.root.add(this._pipGroup);

    // ── Nametag (canvas → sprite) ──────────────────────────────────────
    this._nameSprite = this._buildNametag(this.name, this.team);
    this._nameSprite.position.set(0, 2.55, 0);
    this._nameSprite.scale.set(2.2, 0.55, 1);
    this.root.add(this._nameSprite);

    scene.add(this.root);
  }

  // ── Private builders ─────────────────────────────────────────────────

  _buildPips() {
    // Remove old pips
    while (this._pipGroup.children.length) {
      const c = this._pipGroup.children[0];
      c.geometry.dispose();
      this._pipGroup.remove(c);
    }

    const pipGeo  = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    const full    = new THREE.MeshBasicMaterial({ color: 0x00C9A7 });
    const empty   = new THREE.MeshBasicMaterial({ color: 0x333355, transparent: true, opacity: 0.5 });
    const total   = GAME_CONFIG.PLAYER_MAX_HEALTH;
    const spacing = 0.18;
    const startX  = -((total - 1) * spacing) / 2;

    for (let i = 0; i < total; i++) {
      const pip = new THREE.Mesh(pipGeo, i < this.health ? full : empty);
      pip.position.set(startX + i * spacing, 0, 0);
      this._pipGroup.add(pip);
    }
  }

  _buildNametag(name, team) {
    const canvas  = document.createElement('canvas');
    canvas.width  = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    // Background pill
    ctx.clearRect(0, 0, 256, 64);
    ctx.fillStyle = 'rgba(10,10,30,0.75)';
    ctx.beginPath();
    ctx.roundRect(4, 4, 248, 56, 10);
    ctx.fill();

    // Team accent line
    ctx.fillStyle = team === TEAM.A ? '#2563EB' : '#DC2626';
    ctx.fillRect(4, 4, 4, 56);

    // Name text
    ctx.fillStyle = '#ffffff';
    ctx.font      = 'bold 28px sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, 20, 32);

    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
    return new THREE.Sprite(mat);
  }

  // ── Public API ────────────────────────────────────────────────────────

  /**
   * Teleport / set the visual position instantly (used by interpolator).
   */
  setPosition(x, y, z) {
    this.root.position.set(x, y, z);
  }

  /**
   * Rotate the body to face a yaw angle.
   */
  setYaw(yaw) {
    this.root.rotation.y = yaw;
  }

  /**
   * Update the health pip display.
   */
  setHealth(hp) {
    if (hp === this.health) return;
    this.health = hp;
    
    // Hide mesh if dead
    this.root.visible = (hp > 0);
    
    if (hp > 0) {
      this._buildPips();
    }
  }

  /**
   * Billboard nametag: call every frame so it always faces the camera.
   * (THREE.Sprite does this automatically, but this keeps the API clean.)
   */
  update(_camera) {
    // Sprite auto-faces camera — nothing to do here for now.
    // Module 14 will add carrier glow effect here.
  }

  /** Remove all scene objects and free GPU resources. */
  destroy() {
    this.scene.remove(this.root);

    this.root.traverse((child) => {
      if (child.isMesh || child.isSprite) {
        if (child.geometry && !child.geometry.isShared) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => {
              if (m.map) m.map.dispose();
              m.dispose();
            });
          } else {
            if (child.material.map) child.material.map.dispose();
            child.material.dispose();
          }
        }
      }
    });
  }
}
