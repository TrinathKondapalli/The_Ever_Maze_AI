import React, { useMemo } from 'react';
import * as THREE from 'three';
import { TILE } from '../../../constants/index.js';

export default function Maze3D({ maze, matchPhase }) {
  const { walls, floorSize } = useMemo(() => {
    if (!maze || !maze.grid) return { walls: [], floorSize: { w: 0, h: 0 } };
    const w = maze.width;
    const h = maze.height;
    
    const newWalls = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (maze.grid[y][x] === TILE.WALL) {
          newWalls.push({ x, y });
        }
      }
    }
    return { walls: newWalls, floorSize: { w, h } };
  }, [maze]);

  if (!maze) return null;

  const isSuddenDeath = matchPhase === 'SUDDEN_DEATH';
  const wallColor = isSuddenDeath ? '#ff2222' : '#0de6b8';
  const floorColor = isSuddenDeath ? '#330000' : '#0a192f';

  return (
    <group>
      {/* Floor */}
      <mesh position={[floorSize.w / 2 - 0.5, -0.5, floorSize.h / 2 - 0.5]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[floorSize.w, floorSize.h]} />
        <meshStandardMaterial color={floorColor} />
      </mesh>

      {/* Grid Lines on Floor */}
      <gridHelper 
        args={[Math.max(floorSize.w, floorSize.h), Math.max(floorSize.w, floorSize.h), 0x0de6b8, 0x000000]} 
        position={[floorSize.w / 2 - 0.5, -0.49, floorSize.h / 2 - 0.5]} 
        transparent 
        opacity={isSuddenDeath ? 0.05 : 0.15} 
      />

      {/* Walls */}
      {walls.map((w, i) => (
        <mesh key={i} position={[w.x, 0, w.y]} castShadow receiveShadow>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial 
            color={wallColor}
            emissive={wallColor}
            emissiveIntensity={isSuddenDeath ? 0.4 : 0.15}
            roughness={0.2}
            metalness={0.8}
            transparent={true}
            opacity={0.9}
          />
        </mesh>
      ))}

      {/* Border Walls */}
      <mesh position={[floorSize.w / 2 - 0.5, 0, -1]} castShadow>
        <boxGeometry args={[floorSize.w + 2, 1, 1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[floorSize.w / 2 - 0.5, 0, floorSize.h]} castShadow>
        <boxGeometry args={[floorSize.w + 2, 1, 1]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-1, 0, floorSize.h / 2 - 0.5]} castShadow>
        <boxGeometry args={[1, 1, floorSize.h]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[floorSize.w, 0, floorSize.h / 2 - 0.5]} castShadow>
        <boxGeometry args={[1, 1, floorSize.h]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
    </group>
  );
}
