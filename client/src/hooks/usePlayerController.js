import { useEffect, useRef } from 'react';
import socket from '../socket/socket.js';
import { EVENTS, TILE, GAME_CONFIG } from '../constants/index.js';
import { soundEngine } from '../game/audio/soundEngine.js';

export function usePlayerController(maze, initialPosition) {
  // Local predicted state
  const playerRef = useRef(initialPosition || {
    x: 1.5,
    y: 1.5,
    dirX: 1.0,
    dirY: 0.0,
    planeX: 0.0,
    planeY: 0.66,
  });

  const keys = useRef({ w: false, a: false, s: false, d: false, ArrowLeft: false, ArrowRight: false, v: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const headBobRef = useRef({ timer: 0, offset: 0 });
  const isThirdPersonRef = useRef(false);

  // Always sync position to server (even when standing still)
  // so the server can check proximity for gifts and the lost light
  const lastSyncRef = useRef(0);

  const hasInitialized = useRef(false);
  
  useEffect(() => {
    if (initialPosition && !hasInitialized.current) {
      playerRef.current = { ...initialPosition };
      hasInitialized.current = true;
      // Send initial position immediately so server knows we spawned
      socket.emit(EVENTS.PLAYER_MOVE, playerRef.current);
    }
  }, [initialPosition]);

  useEffect(() => {
    const handleKeyDown = (e) => { 
      const key = e.key.toLowerCase();
      if (key === 'v' && keys.current['v'] !== undefined && !keys.current['v']) {
        isThirdPersonRef.current = !isThirdPersonRef.current;
      }
      if (keys.current[key] !== undefined) keys.current[key] = true;
      if (keys.current[e.key] !== undefined) keys.current[e.key] = true; 
    };
    const handleKeyUp = (e) => { 
      const key = e.key.toLowerCase();
      if (keys.current[key] !== undefined) keys.current[key] = false;
      if (keys.current[e.key] !== undefined) keys.current[e.key] = false; 
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const updateRotation = (rotSpeed) => {
    const p = playerRef.current;
    const oldDirX = p.dirX;
    p.dirX = p.dirX * Math.cos(rotSpeed) - p.dirY * Math.sin(rotSpeed);
    p.dirY = oldDirX * Math.sin(rotSpeed) + p.dirY * Math.cos(rotSpeed);
    const oldPlaneX = p.planeX;
    p.planeX = p.planeX * Math.cos(rotSpeed) - p.planeY * Math.sin(rotSpeed);
    p.planeY = oldPlaneX * Math.sin(rotSpeed) + p.planeY * Math.cos(rotSpeed);
  };

  const handleMouseMove = (e) => {
    if (e.buttons === 1) { // Left click drag
      updateRotation(e.movementX * -0.005);
    }
  };

  const updateMovement = (dt, isCarrier = false, myPlayer = null) => {
    if (!maze) return playerRef.current;

    const p = playerRef.current;
    let moveSpeed = 4.0 * dt; 
    
    if (myPlayer?.isSpectator) {
       moveSpeed = 12.0 * dt; // Super fast spectator cam
    } else if (myPlayer?.activeEffects?.FREEZE) {
       moveSpeed = 0; 
    } else {
       if (isCarrier) {
          moveSpeed *= GAME_CONFIG.CARRIER_SPEED_MULTIPLIER; 
       }
       if (myPlayer?.activeEffects?.DASH) {
          moveSpeed *= 1.5; 
       }
    }
    const rotSpeed = 2.5 * dt;

    let moved = false;
    const isSpectator = myPlayer?.isSpectator;

    // Keyboard Movement
    if (keys.current.w) {
      if (isSpectator || maze[Math.floor(p.y)][Math.floor(p.x + p.dirX * moveSpeed)] !== TILE.WALL) p.x += p.dirX * moveSpeed;
      if (isSpectator || maze[Math.floor(p.y + p.dirY * moveSpeed)][Math.floor(p.x)] !== TILE.WALL) p.y += p.dirY * moveSpeed;
      moved = true;
    }
    if (keys.current.s) {
      if (isSpectator || maze[Math.floor(p.y)][Math.floor(p.x - p.dirX * moveSpeed)] !== TILE.WALL) p.x -= p.dirX * moveSpeed;
      if (isSpectator || maze[Math.floor(p.y - p.dirY * moveSpeed)][Math.floor(p.x)] !== TILE.WALL) p.y -= p.dirY * moveSpeed;
      moved = true;
    }
    if (keys.current.a || keys.current.ArrowLeft) {
      updateRotation(-rotSpeed);
      moved = true;
    }
    if (keys.current.d || keys.current.ArrowRight) {
      updateRotation(rotSpeed);
      moved = true;
    }

    // Joystick Movement
    const jx = joystickRef.current.x;
    const jy = joystickRef.current.y;
    
    if (jy !== 0) {
      const dir = -jy; // Joystick UP (negative Y) means Forward
      if (isSpectator || maze[Math.floor(p.y)][Math.floor(p.x + p.dirX * moveSpeed * dir)] !== TILE.WALL) p.x += p.dirX * moveSpeed * dir;
      if (isSpectator || maze[Math.floor(p.y + p.dirY * moveSpeed * dir)][Math.floor(p.x)] !== TILE.WALL) p.y += p.dirY * moveSpeed * dir;
      moved = true;
    }
    if (jx !== 0) {
      // Strafe vector is perpendicular to direction (dirY, -dirX)
      const strafeX = p.dirY;
      const strafeY = -p.dirX;
      if (isSpectator || maze[Math.floor(p.y)][Math.floor(p.x + strafeX * moveSpeed * jx)] !== TILE.WALL) p.x += strafeX * moveSpeed * jx;
      if (isSpectator || maze[Math.floor(p.y + strafeY * moveSpeed * jx)][Math.floor(p.x)] !== TILE.WALL) p.y += strafeY * moveSpeed * jx;
      moved = true;
    }

    // Head Bobbing logic
    if (moved) {
      headBobRef.current.timer += dt * 15; // Bob speed
      headBobRef.current.offset = Math.sin(headBobRef.current.timer) * 10; // 10px max offset
    } else {
      // Smoothly return to center
      headBobRef.current.offset *= 0.9;
    }

    // Network Sync — always send position, even when standing still
    // so the server can check proximity for gifts and the lost light
    const now = Date.now();
    const syncInterval = moved ? 50 : 200; // fast when moving, slow when still
    if (now - lastSyncRef.current > syncInterval) {
      if (moved) soundEngine.playFootstep();
      socket.emit(EVENTS.PLAYER_MOVE, p);
      lastSyncRef.current = now;
    }

    return p;
  };

  return {
    playerRef,
    keys,
    joystickRef,
    headBobRef,
    handleMouseMove,
    updateRotation,
    updateMovement,
    isThirdPersonRef
  };
}
