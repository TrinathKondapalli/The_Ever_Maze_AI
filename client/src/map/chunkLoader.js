import * as THREE from 'three';
import { buildChunkMesh, createBiomeMaterials } from './chunkMeshBuilder.js';
import { BIOME_TYPE } from '@shared/constants.js';

// ── Procedural Low-Poly Prop Geometries & Materials ──

function createPropResources() {
  const geometries = {
    tree_small: (() => {
      // Cylinder trunk + Cone foliage
      const g = new THREE.CylinderGeometry(0.15, 0.25, 1.2, 5);
      g.translate(0, 0.6, 0);
      const foliage = new THREE.ConeGeometry(0.9, 2.2, 5);
      foliage.translate(0, 1.8, 0);
      g.merge(foliage);
      return g;
    })(),
    shroom_glowing: (() => {
      // Cylinder stem + Sphere cap
      const g = new THREE.CylinderGeometry(0.08, 0.12, 0.4, 4);
      g.translate(0, 0.2, 0);
      const cap = new THREE.SphereGeometry(0.25, 5, 4);
      cap.translate(0, 0.4, 0);
      g.merge(cap);
      return g;
    })(),
    rock_small: new THREE.DodecahedronGeometry(0.5, 0),
    ruin_column_broken: (() => {
      const g = new THREE.CylinderGeometry(0.4, 0.45, 2.4, 6);
      g.translate(0, 1.2, 0);
      return g;
    })(),
    brick_stone: new THREE.BoxGeometry(0.8, 0.4, 0.5),
    crystal_cluster: (() => {
      // Octahedron stretched to form crystalline shard
      const g = new THREE.OctahedronGeometry(0.4, 0);
      g.scale(0.5, 2.5, 0.5);
      g.translate(0, 0.5, 0);
      return g;
    })(),
    cavelight_flower: (() => {
      const g = new THREE.CylinderGeometry(0.04, 0.04, 0.3, 4);
      g.translate(0, 0.15, 0);
      const petals = new THREE.ConeGeometry(0.2, 0.2, 4);
      petals.translate(0, 0.3, 0);
      g.merge(petals);
      return g;
    })(),
  };

  const materials = {
    tree_small: new THREE.MeshStandardMaterial({ color: 0x1b4332, roughness: 0.8, flatShading: true }),
    shroom_glowing: new THREE.MeshStandardMaterial({
      color: 0xe63946,
      roughness: 0.5,
      emissive: 0xe63946,
      emissiveIntensity: 0.4,
      flatShading: true,
    }),
    rock_small: new THREE.MeshStandardMaterial({ color: 0x5c677d, roughness: 0.7, flatShading: true }),
    ruin_column_broken: new THREE.MeshStandardMaterial({ color: 0x7b2cbf, roughness: 0.8, flatShading: true }),
    brick_stone: new THREE.MeshStandardMaterial({ color: 0x4a4e69, roughness: 0.85, flatShading: true }),
    crystal_cluster: new THREE.MeshStandardMaterial({
      color: 0x4cc9f0,
      roughness: 0.1,
      metalness: 0.9,
      emissive: 0x4cc9f0,
      emissiveIntensity: 0.8,
      flatShading: true,
    }),
    cavelight_flower: new THREE.MeshStandardMaterial({
      color: 0x7209b7,
      roughness: 0.6,
      emissive: 0xf72585,
      emissiveIntensity: 0.6,
      flatShading: true,
    }),
  };

  return { geometries, materials };
}

export class ChunkLoader {
  constructor(scene) {
    this.scene = scene;
    this.chunkMeshes = [];
    this.instancedMeshes = new Map();
    this.materials = createBiomeMaterials();
    this.propResources = createPropResources();
  }

  /**
   * Generates and renders all map chunks and instanced props in the scene.
   * @param {object} map Map object with chunks array
   */
  loadMap(map) {
    this.unloadMap();

    // 1. Build Chunk Meshes (Floor & Walls)
    map.chunks.forEach((chunk) => {
      const mesh = buildChunkMesh(chunk, this.materials);
      this.scene.add(mesh);
      this.chunkMeshes.push(mesh);
    });

    // 2. Count instances for each prop type
    const propCounts = new Map();
    map.chunks.forEach((chunk) => {
      chunk.decorations.forEach((prop) => {
        propCounts.set(prop, (propCounts.get(prop) || 0) + 1);
      });
    });

    // 3. Initialize InstancedMeshes
    const dummy = new THREE.Object3D();
    const propIndices = new Map();

    propCounts.forEach((count, propName) => {
      const geo = this.propResources.geometries[propName];
      const mat = this.propResources.materials[propName];
      
      if (geo && mat) {
        const instMesh = new THREE.InstancedMesh(geo, mat, count);
        instMesh.castShadow = true;
        instMesh.receiveShadow = true;
        this.scene.add(instMesh);
        this.instancedMeshes.set(propName, instMesh);
        propIndices.set(propName, 0);
      }
    });

    // 4. Position and set transform for each instance
    map.chunks.forEach((chunk) => {
      const chunkWorldX = chunk.x * 16 + 8;
      const chunkWorldZ = chunk.y * 16 + 8;

      chunk.decorations.forEach((prop) => {
        const instMesh = this.instancedMeshes.get(prop);
        const index = propIndices.get(prop);
        
        if (instMesh && index !== undefined) {
          // Place prop with slight random position offset and rotation inside chunk
          const seed = chunk.x * 100 + chunk.y;
          const rX = -3.5 + (Math.sin(seed) * 0.5 + 0.5) * 7.0;
          const rZ = -3.5 + (Math.cos(seed) * 0.5 + 0.5) * 7.0;
          const rotY = (Math.sin(seed * 2) * 0.5 + 0.5) * Math.PI * 2;
          const scale = 0.85 + (Math.cos(seed * 3) * 0.5 + 0.5) * 0.3;

          dummy.position.set(chunkWorldX + rX, 0, chunkWorldZ + rZ);
          dummy.rotation.set(0, rotY, 0);
          dummy.scale.set(scale, scale, scale);
          dummy.updateMatrix();
          
          instMesh.setMatrixAt(index, dummy.matrix);
          propIndices.set(prop, index + 1);
        }
      });
    });

    // Notify updates to graphics card
    this.instancedMeshes.forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });

    console.log(`[ChunkLoader] Successfully loaded ${map.chunks.length} chunks. Batch instances:`, Object.fromEntries(propCounts));
  }

  /**
   * Cleans up all chunk meshes and instanced meshes from the scene.
   */
  unloadMap() {
    // Remove individual chunk meshes
    this.chunkMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      mesh.traverse((child) => {
        if (child.geometry) child.geometry.dispose();
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((m) => m.dispose());
          } else {
            child.material.dispose();
          }
        }
      });
    });
    this.chunkMeshes = [];

    // Remove instanced meshes
    this.instancedMeshes.forEach((mesh) => {
      this.scene.remove(mesh);
      if (mesh.geometry) mesh.geometry.dispose();
      if (mesh.material) mesh.material.dispose();
    });
    this.instancedMeshes.clear();
  }

  /**
   * Dispose static resources on loader destruction.
   */
  dispose() {
    this.unloadMap();
    
    // Dispose static prop assets
    Object.values(this.propResources.geometries).forEach((g) => g.dispose());
    Object.values(this.propResources.materials).forEach((m) => m.dispose());
    
    // Dispose static biome materials
    Object.values(this.materials).forEach((matGroup) => {
      matGroup.floor.dispose();
      matGroup.wall.dispose();
    });
  }
}
