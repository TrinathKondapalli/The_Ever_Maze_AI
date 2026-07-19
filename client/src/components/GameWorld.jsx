import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { generateMap } from '../map/mapGenerator.js';
import { ChunkLoader } from '../map/chunkLoader.js';
import { ExitDoor } from '../entities/ExitDoor.js';
import { RemotePlayer } from '../entities/RemotePlayer.js';
import { Treasure } from '../entities/Treasure.js';
import { InputManager } from '../input/InputManager.js';
import { PlayerController } from '../player/PlayerController.js';
import { CameraController } from '../player/CameraController.js';
import { RemotePlayerInterpolator } from '../player/RemotePlayerInterpolator.js';
import { useGameStore } from '../store/gameStore.js';
import socket from '../socket/socket.js';
import { EVENTS } from '@shared/constants.js';

export default function GameWorld({ seed }) {
  const containerRef        = useRef(null);
  const [loading, setLoading]             = useState(true);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [cameraMode, setCameraMode]       = useState('FP');
  const [isDead, setIsDead]               = useState(false);

  const room            = useGameStore((s) => s.room);
  const player          = useGameStore((s) => s.player);
  const remotePlayers   = useGameStore((s) => s.remotePlayers);

  useEffect(() => {
    if (!containerRef.current || !seed) return;
    const container = containerRef.current;

    // Snapshot of remotePlayers at mount time; live updates handled below
    const remoteSnapshots = { ...remotePlayers };

    // ── 1. Generate map ────────────────────────────────────────────────
    console.time('[GameWorld] map generate');
    const map = generateMap(seed);
    console.timeEnd('[GameWorld] map generate');

    // ── 2. Renderer ────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // ── 3. Scene ───────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);
    scene.fog = new THREE.FogExp2(0x050510, 0.011);

    // ── 4. Camera ──────────────────────────────────────────────────────
    const camera = new THREE.PerspectiveCamera(
      GAME_CONFIG_FOV,
      container.clientWidth / container.clientHeight,
      0.1,
      600
    );

    // ── 5. Lights ──────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0xffffff, 0.18));

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
    dirLight.position.set(80, 120, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    const sd = 140;
    dirLight.shadow.camera.left   = -sd;
    dirLight.shadow.camera.right  =  sd;
    dirLight.shadow.camera.top    =  sd;
    dirLight.shadow.camera.bottom = -sd;
    dirLight.shadow.camera.far    = 400;
    scene.add(dirLight);

    // Biome accent lights
    scene.add(Object.assign(new THREE.PointLight(0x00c9a7, 5, 100), { position: { x: 4*16, y: 12, z: 4*16 } }));
    scene.add(Object.assign(new THREE.PointLight(0x4cc9f0, 5, 100), { position: { x: 12*16, y: 12, z: 12*16 } }));
    scene.add(Object.assign(new THREE.PointLight(0xf72585, 5, 100), { position: { x: 20*16, y: 12, z: 20*16 } }));

    // ── 6. Map chunks & instanced props ───────────────────────────────
    const chunkLoader = new ChunkLoader(scene);
    chunkLoader.loadMap(map);

    // ── 7. Exit Door portal ────────────────────────────────────────────
    const exitDoor = new ExitDoor(scene, map.exitPos);

    // ── 8. Treasure entity (replaces placeholder box) ───────────────────────
    const treasureEntity = new Treasure(scene, map.treasurePos);

    // Subscribe to treasure state from store and drive entity
    const unsubTreasure = useGameStore.subscribe(
      (s) => s.treasure,
      (snap) => treasureEntity.applySnapshot(snap)
    );
    // Apply initial state (may already be FOUND if rejoining)
    treasureEntity.applySnapshot(useGameStore.getState().treasure);

    // Pickup cooldown guard (don't spam server)
    let lastPickupEmit = 0;
    let lastExitEmit = 0;

    // ── 9. Player Controller ───────────────────────────────────────────
    const spawnGrid  = map.spawnA;
    const playerCtrl = new PlayerController(spawnGrid, map.chunks, map.gridSize.w);

    // ── 10. Camera Controller ──────────────────────────────────────────
    const camCtrl = new CameraController(camera, map.chunks, map.gridSize.w);

    // ── 11. Input Manager ──────────────────────────────────────────────
    const input = new InputManager(renderer.domElement);

    // ── 12. Remote Player system ───────────────────────────────────────
    const interpolator      = new RemotePlayerInterpolator();
    // id → RemotePlayer mesh instance
    const remotePlayerMeshes = new Map();

    // Helper: ensure a mesh exists for a given player snapshot
    const syncRemoteMesh = (snap) => {
      if (!remotePlayerMeshes.has(snap.id)) {
        remotePlayerMeshes.set(snap.id, new RemotePlayer(scene, snap));
      }
      interpolator.pushSnapshot(snap.id, snap);
      // Update health live
      remotePlayerMeshes.get(snap.id).setHealth(snap.health ?? 3);
    };

    // Seed with any already-connected players
    Object.values(remoteSnapshots).forEach(syncRemoteMesh);

    // Live subscription — runs while component mounted
    const unsubRemote = useGameStore.subscribe(
      (s) => s.remotePlayers,
      (players) => {
        // Add/update
        Object.values(players).forEach(syncRemoteMesh);
        // Remove departed players
        remotePlayerMeshes.forEach((mesh, id) => {
          if (!players[id]) {
            mesh.destroy();
            remotePlayerMeshes.delete(id);
            interpolator.remove(id);
          }
        });
      }
    );

    // ── 12. Crosshair overlay ──────────────────────────────────────────
    // (rendered in JSX, see return below)

    // ── 13. Pointer-lock state relay ───────────────────────────────────
    const onPLChange = () => {
      const locked = document.pointerLockElement === renderer.domElement;
      setIsPointerLocked(locked);
    };
    document.addEventListener('pointerlockchange', onPLChange);

    // ── 13b. Combat Socket Listeners ───────────────────────────────────
    const onEliminated = ({ id }) => {
      if (id === player?.sessionId) setIsDead(true);
    };
    const onRespawned = ({ id, x, y, z }) => {
      if (id === player?.sessionId) {
        setIsDead(false);
        playerCtrl.position.set(x, y, z);
        playerCtrl.velocity.set(0, 0, 0);
      }
    };
    socket.on(EVENTS.PLAYER_ELIMINATED, onEliminated);
    socket.on(EVENTS.PLAYER_RESPAWNED, onRespawned);

    // ── 14. Draw-call debug HUD ────────────────────────────────────────
    let frameCount = 0;

    // ── 15. Animation Loop ─────────────────────────────────────────────
    const clock = new THREE.Clock();
    let rafId;

    const animate = () => {
      rafId = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05); // cap at 50 ms
      const elapsed = clock.getElapsedTime();

      // Read input → update player physics
      const inputState = input.getState();
      playerCtrl.update(inputState, delta);

      // Sync camera
      camCtrl.update(playerCtrl);

      // Relay camera mode to React HUD
      if (frameCount % 6 === 0) {
        setCameraMode(playerCtrl.isThirdPerson ? 'TP' : 'FP');
      }

      // Animate treasure entity + proximity pickup detection
      treasureEntity.update(delta);

      // Detect local player near treasure and emit pickup
      const now = Date.now();
      if (treasureEntity.isInPickupRange(playerCtrl.position) && now - lastPickupEmit > 800) {
        lastPickupEmit = now;
        socket.emit(EVENTS.TREASURE_PICKUP, {
          x: playerCtrl.position.x,
          z: playerCtrl.position.z,
        });
      }

      // Update Exit Door Portal animations
      exitDoor.update(delta);

      // Detect local player near exit door and emit exit attempt
      if (now - lastExitEmit > 1000) {
        const dx = playerCtrl.position.x - exitDoor.root.position.x;
        const dz = playerCtrl.position.z - exitDoor.root.position.z;
        const distSq = dx * dx + dz * dz;
        const triggerRadius = GAME_CONFIG.EXIT_TRIGGER_RADIUS || 1.5;

        if (distSq <= triggerRadius * triggerRadius) {
          // Check if we are the carrier before emitting
          const currentTreasure = useGameStore.getState().treasure;
          if (currentTreasure && currentTreasure.carrierId === socket.id) {
            lastExitEmit = now;
            socket.emit(EVENTS.EXIT_ATTEMPT);
          }
        }
      }

      // Drive remote player meshes via interpolator
      remotePlayerMeshes.forEach((mesh, id) => {
        const pos = interpolator.getInterpolated(id);
        if (pos) {
          mesh.setPosition(pos.x, pos.y, pos.z);
          mesh.setYaw(pos.yaw);
        }
        mesh.update(camera);
      });

      renderer.render(scene, camera);
      frameCount++;
    };

    animate();
    setLoading(false);

    // ── 16. Resize handler ─────────────────────────────────────────────
    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // ── 17. Cleanup ────────────────────────────────────────────────────
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onPLChange);
      
      socket.off(EVENTS.PLAYER_ELIMINATED, onEliminated);
      socket.off(EVENTS.PLAYER_RESPAWNED, onRespawned);

      unsubRemote();
      unsubTreasure();
      input.dispose();

      // Destroy treasure
      treasureEntity.destroy();

      // Destroy all remote player meshes
      remotePlayerMeshes.forEach((mesh) => mesh.destroy());
      remotePlayerMeshes.clear();
      interpolator.dispose();

      chunkLoader.dispose();
      exitDoor.destroy();
      renderer.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [seed]);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#050510]">

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-[#050510]">
          <div className="text-center flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full border-4 border-[#00C9A7] border-t-transparent animate-spin" />
            <p className="text-sm uppercase tracking-[0.3em] text-[#00C9A7] font-bold animate-pulse">
              Building Arena…
            </p>
          </div>
        </div>
      )}

      {/* Death Overlay */}
      {isDead && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-red-900/60 backdrop-blur-sm pointer-events-none">
          <h1 className="text-6xl font-black text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] uppercase tracking-wider mb-4">
            Eliminated
          </h1>
          <p className="text-xl text-red-200 font-bold animate-pulse">
            Respawning in 5 seconds...
          </p>
        </div>
      )}

      {/* Crosshair (FP only, pointer locked) */}
      {!loading && isPointerLocked && cameraMode === 'FP' && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-30">
          <div className="relative w-5 h-5">
            <div className="absolute top-1/2 left-0 right-0 h-px -translate-y-1/2 bg-white/70" />
            <div className="absolute left-1/2 top-0 bottom-0 w-px -translate-x-1/2 bg-white/70" />
          </div>
        </div>
      )}

      {/* Click-to-lock prompt */}
      {!loading && !isPointerLocked && (
        <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
          <div className="bg-[#0D1B2A]/90 border border-[#00C9A7]/30 rounded-xl px-8 py-5 text-center shadow-2xl">
            <p className="text-[#00C9A7] font-bold uppercase tracking-widest text-sm mb-1">
              Click to enter arena
            </p>
            <p className="text-gray-500 text-xs tracking-wider">
              Mouse look · WASD move · Shift sprint · Space jump · V camera
            </p>
          </div>
        </div>
      )}

      {/* HUD — top-right corner info */}
      {!loading && (
        <div className="absolute top-4 right-4 z-30 flex flex-col items-end gap-1 pointer-events-none">
          <div className="bg-[#0D1B2A]/80 border border-white/10 rounded px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-gray-400">
            Camera: <span className="text-[#00C9A7]">{cameraMode}</span>
          </div>
          <div className="bg-[#0D1B2A]/80 border border-white/10 rounded px-3 py-1 text-[10px] uppercase tracking-widest font-bold text-gray-400">
            Seed: <span className="text-[#F4A828] font-mono">{seed}</span>
          </div>
        </div>
      )}

      {/* Three.js canvas mount point */}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  );
}

// Inline constant to avoid circular import with GAME_CONFIG (FOV only)
const GAME_CONFIG_FOV = 75;
