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

  const keys = useRef({ w: false, a: false, s: false, d: false, ArrowLeft: false, ArrowRight: false });
  const joystickRef = useRef({ x: 0, y: 0 });
  const headBobRef = useRef({ timer: 0, offset: 0 });

  // Network sync throttle
  const lastSyncRef = useRef(0);

  useEffect(() => {
    if (initialPosition) {
      playerRef.current = { ...initialPosition };
    }
  }, [initialPosition]);

  useEffect(() => {
    const handleKeyDown = (e) => { 
      const key = e.key.toLowerCase();
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
    
    if (myPlayer?.activeEffects?.FREEZE) {
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

    // Keyboard Movement
    if (keys.current.w) {
      if (maze[Math.floor(p.y)][Math.floor(p.x + p.dirX * moveSpeed)] !== TILE.WALL) p.x += p.dirX * moveSpeed;
      if (maze[Math.floor(p.y + p.dirY * moveSpeed)][Math.floor(p.x)] !== TILE.WALL) p.y += p.dirY * moveSpeed;
      moved = true;
    }
    if (keys.current.s) {
      if (maze[Math.floor(p.y)][Math.floor(p.x - p.dirX * moveSpeed)] !== TILE.WALL) p.x -= p.dirX * moveSpeed;
      if (maze[Math.floor(p.y - p.dirY * moveSpeed)][Math.floor(p.x)] !== TILE.WALL) p.y -= p.dirY * moveSpeed;
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
      if (maze[Math.floor(p.y)][Math.floor(p.x + p.dirX * moveSpeed * dir)] !== TILE.WALL) p.x += p.dirX * moveSpeed * dir;
      if (maze[Math.floor(p.y + p.dirY * moveSpeed * dir)][Math.floor(p.x)] !== TILE.WALL) p.y += p.dirY * moveSpeed * dir;
      moved = true;
    }
    if (jx !== 0) {
      // Strafe vector is perpendicular to direction (dirY, -dirX)
      const strafeX = p.dirY;
      const strafeY = -p.dirX;
      if (maze[Math.floor(p.y)][Math.floor(p.x + strafeX * moveSpeed * jx)] !== TILE.WALL) p.x += strafeX * moveSpeed * jx;
      if (maze[Math.floor(p.y + strafeY * moveSpeed * jx)][Math.floor(p.x)] !== TILE.WALL) p.y += strafeY * moveSpeed * jx;
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

    // Network Sync
    const now = Date.now();
    if (moved) {
      soundEngine.playFootstep();
      if (now - lastSyncRef.current > 50) {
        socket.emit(EVENTS.PLAYER_MOVE, p);
        lastSyncRef.current = now;
      }
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
    updateMovement
  };
}
