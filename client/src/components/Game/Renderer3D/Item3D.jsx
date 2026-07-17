import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

export default function Item3D({ type, position, isLight }) {
  const meshRef = useRef();

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    // Rotate and hover
    meshRef.current.rotation.y += delta * 2;
    meshRef.current.rotation.x += delta;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 5) * 0.1 + 0.3;
  });

  if (!position) return null;

  let color = '#ffffff';
  if (!isLight) {
    if (type === 'FREEZE') color = '#64c8ff';
    else if (type === 'DASH') color = '#ff6464';
    else if (type === 'SHIELD') color = '#ffc832';
    else if (type === 'COMPASS') color = '#64ff64';
  }

  return (
    <group position={[position.x, 0.3, position.y]}>
      <mesh ref={meshRef} castShadow>
        {isLight ? (
          <octahedronGeometry args={[0.3, 0]} />
        ) : (
          <boxGeometry args={[0.3, 0.3, 0.3]} />
        )}
        <meshStandardMaterial 
          color={color} 
          emissive={color}
          emissiveIntensity={isLight ? 2 : 0.8}
          roughness={0.1}
          metalness={0.8}
        />
      </mesh>
      {/* Light Source */}
      <pointLight color={color} intensity={isLight ? 3 : 1} distance={isLight ? 8 : 3} decay={2} />
    </group>
  );
}
