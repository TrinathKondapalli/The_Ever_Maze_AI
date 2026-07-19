import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { GAME_CONFIG } from '@shared/gameConfig.js';

export default function HeroCanvas() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene Setup
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d0d0d, 0.015);

    // 2. Camera Setup
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(0, 0, 8);

    // 3. Renderer Setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0x0d1b2a, 1.5);
    scene.add(ambientLight);

    const goldLight = new THREE.PointLight(0xf4a828, 5, 15);
    goldLight.position.set(0, 0, 0);
    scene.add(goldLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);

    // 5. Hero Crystal Mesh (Low-poly)
    const geometry = new THREE.OctahedronGeometry(2, 0); // 8 faces (low-poly)
    const material = new THREE.MeshStandardMaterial({
      color: 0xf4a828,
      roughness: 0.1,
      metalness: 0.9,
      flatShading: true,
      emissive: 0xf4a828,
      emissiveIntensity: 0.2,
    });
    const crystal = new THREE.Mesh(geometry, material);
    scene.add(crystal);

    // 6. Particle Field (Performance Throttled)
    const cpuCores = navigator.hardwareConcurrency || 4;
    const particleCount = cpuCores < GAME_CONFIG.MOBILE_CPU_CORE_THRESHOLD 
      ? GAME_CONFIG.PARTICLES_REDUCED 
      : GAME_CONFIG.PARTICLES_FULL;

    console.log(`[HeroCanvas] CPU Cores: ${cpuCores}, Particles: ${particleCount}`);

    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      // Random coordinates in spherical range
      const radius = 3 + Math.random() * 6;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i + 2] = radius * Math.cos(phi);
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    // Particle material - tiny glowing gold points
    const particleMaterial = new THREE.PointsMaterial({
      color: 0xf4a261,
      size: 0.08,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const particleSystem = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particleSystem);

    // 7. Animation Loop
    let animationFrameId;
    let clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsedTime = clock.getElapsedTime();

      // Rotate crystal
      crystal.rotation.x = elapsedTime * 0.2;
      crystal.rotation.y = elapsedTime * 0.3;
      // Floating vertical bobbing motion
      crystal.position.y = Math.sin(elapsedTime * 1.5) * 0.3;

      // Rotate particle field
      particleSystem.rotation.y = elapsedTime * 0.05;
      particleSystem.rotation.x = elapsedTime * 0.02;

      renderer.render(scene, camera);
    };

    animate();

    // 8. Resize Handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();

      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);

      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }

      // Dispose resources
      geometry.dispose();
      material.dispose();
      particleGeometry.dispose();
      particleMaterial.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 w-full h-full -z-10 bg-[#0D0D0D]" />;
}
