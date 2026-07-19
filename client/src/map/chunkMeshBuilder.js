import * as THREE from 'three';
import { BIOME_TYPE, CHUNK_TYPE } from '@shared/constants.js';

/**
 * Creates the standard material palette for Lumina biomes.
 */
export function createBiomeMaterials() {
  return {
    [BIOME_TYPE.FOREST]: {
      floor: new THREE.MeshStandardMaterial({
        color: 0x2d6a4f, // deep forest green
        roughness: 0.8,
        metalness: 0.1,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0x5c3d2e, // dirt / bark brown
        roughness: 0.9,
        metalness: 0.05,
        flatShading: true,
      }),
    },
    [BIOME_TYPE.RUINS]: {
      floor: new THREE.MeshStandardMaterial({
        color: 0x8d99ae, // stone grey
        roughness: 0.7,
        metalness: 0.2,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0x4a4e69, // dark stone ruins
        roughness: 0.85,
        metalness: 0.15,
        flatShading: true,
      }),
    },
    [BIOME_TYPE.CRYSTAL_CAVES]: {
      floor: new THREE.MeshStandardMaterial({
        color: 0x1d1a39, // dark void purple
        roughness: 0.6,
        metalness: 0.3,
        flatShading: true,
      }),
      wall: new THREE.MeshStandardMaterial({
        color: 0x312244, // dark cave amethyst
        roughness: 0.5,
        metalness: 0.5,
        flatShading: true,
        emissive: 0x7209b7,
        emissiveIntensity: 0.1,
      }),
    },
  };
}

/**
 * Builds the visual mesh group for a single chunk.
 * @param {object} chunk 
 * @param {object} materials Biome materials mapping
 * @returns {THREE.Group} mesh group
 */
export function buildChunkMesh(chunk, materials) {
  const group = new THREE.Group();
  
  // Floor Plane (16x16)
  const floorGeo = new THREE.PlaneGeometry(16, 16);
  floorGeo.rotateX(-Math.PI / 2); // align face up
  
  const floorMat = materials[chunk.biome].floor;
  const floorMesh = new THREE.Mesh(floorGeo, floorMat);
  floorMesh.receiveShadow = true;
  group.add(floorMesh);

  // Blocked Obstacle wall
  if (chunk.blocked) {
    // 16m wide, 16m deep, 6m tall block
    const wallGeo = new THREE.BoxGeometry(16, 6, 16);
    wallGeo.translate(0, 3, 0); // seat base on ground

    const wallMat = materials[chunk.biome].wall;
    const wallMesh = new THREE.Mesh(wallGeo, wallMat);
    wallMesh.castShadow = true;
    wallMesh.receiveShadow = true;
    group.add(wallMesh);
  }

  // Team Spawn base plates
  if (chunk.type === CHUNK_TYPE.SPAWN_A) {
    const plateGeo = new THREE.BoxGeometry(10, 0.05, 10);
    const plateMat = new THREE.MeshBasicMaterial({ color: 0x2563EB, transparent: true, opacity: 0.4 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.03, 0);
    group.add(plate);
  } else if (chunk.type === CHUNK_TYPE.SPAWN_B) {
    const plateGeo = new THREE.BoxGeometry(10, 0.05, 10);
    const plateMat = new THREE.MeshBasicMaterial({ color: 0xDC2626, transparent: true, opacity: 0.4 });
    const plate = new THREE.Mesh(plateGeo, plateMat);
    plate.position.set(0, 0.03, 0);
    group.add(plate);
  } else if (chunk.type === CHUNK_TYPE.TREASURE_ZONE) {
    const ringGeo = new THREE.RingGeometry(2, 2.2, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0xF4A828, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(0, 0.04, 0);
    group.add(ring);
  }

  // Position chunk in world coordinates (chunk centers)
  const worldX = chunk.x * 16 + 8;
  const worldZ = chunk.y * 16 + 8;
  group.position.set(worldX, 0, worldZ);

  return group;
}
