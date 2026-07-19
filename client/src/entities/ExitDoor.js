import * as THREE from 'three';

export class ExitDoor {
  constructor(scene, exitPos) {
    this.scene = scene;
    
    // exitPos contains { x, y, worldX, worldZ }
    this.x = exitPos.worldX;
    this.z = exitPos.worldZ;
    this.y = 0; // Ground height

    this.group = new THREE.Group();
    this.group.position.set(this.x, this.y, this.z);

    // 1. Teal Portal Mesh structure (Torus / Ring standing upright)
    const portalGeo = new THREE.TorusGeometry(1.5, 0.15, 8, 24);
    portalGeo.rotateY(Math.PI / 4); // Rotate slightly to look nice from distance
    const portalMat = new THREE.MeshBasicMaterial({
      color: 0x00c9a7,
      transparent: true,
      opacity: 0.8,
      wireframe: true,
    });
    this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
    this.portalMesh.position.y = 1.6; // Center height
    this.group.add(this.portalMesh);

    // Inner glowing disk
    const diskGeo = new THREE.CylinderGeometry(1.4, 1.4, 0.05, 16);
    diskGeo.rotateX(Math.PI / 2);
    diskGeo.rotateY(Math.PI / 4);
    const diskMat = new THREE.MeshBasicMaterial({
      color: 0x00c9a7,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    this.diskMesh = new THREE.Mesh(diskGeo, diskMat);
    this.diskMesh.position.y = 1.6;
    this.group.add(this.diskMesh);

    // 2. Teal Point Light source (Visible from 20m, doesn't cast shadow to save performance)
    this.light = new THREE.PointLight(0x00c9a7, 3, 10);
    this.light.position.set(0, 1.6, 0);
    this.group.add(this.light);

    // 3. Particle System (Continuous upward stream)
    this.particleCount = 40;
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    this.velocities = [];

    for (let i = 0; i < this.particleCount; i++) {
      // Place randomly inside portal disk base
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 1.3;
      
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = Math.random() * 3.2; // vertical spread
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Vertical speed only
      this.velocities.push(0.01 + Math.random() * 0.02);
    }

    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleMaterial = new THREE.PointsMaterial({
      color: 0x48cae4,
      size: 0.12,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.group.add(this.particles);

    this.scene.add(this.group);
    console.log(`[ExitDoor] Rendered glowing portal at world position: x=${this.x}, z=${this.z}`);
  }

  /**
   * Updates animations of portal rotation and particles.
   * @param {number} delta time elapsed
   */
  update(delta) {
    // Spin portal rings
    if (this.portalMesh) {
      this.portalMesh.rotation.z += 0.01;
    }
    if (this.diskMesh) {
      this.diskMesh.rotation.z -= 0.005;
    }

    // Upward particle flow
    if (this.particles) {
      const positions = this.particles.geometry.attributes.position.array;
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3 + 1] += this.velocities[i]; // Move up
        
        // Reset when passing portal top (3.2m height)
        if (positions[i * 3 + 1] > 3.2) {
          positions[i * 3 + 1] = 0; // reset to bottom
          
          const angle = Math.random() * Math.PI * 2;
          const radius = Math.random() * 1.3;
          positions[i * 3] = Math.cos(angle) * radius;
          positions[i * 3 + 2] = Math.sin(angle) * radius;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  /**
   * Cleans up ExitDoor assets from scene.
   */
  destroy() {
    this.scene.remove(this.group);
    
    // Dispose geometry and materials
    this.portalMesh.geometry.dispose();
    this.portalMesh.material.dispose();
    this.diskMesh.geometry.dispose();
    this.diskMesh.material.dispose();
    this.particles.geometry.dispose();
    this.particleMaterial.dispose();
  }
}
