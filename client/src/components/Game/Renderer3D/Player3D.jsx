import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function Player3D({ player, isMe, carrierId }) {
  const meshRef = useRef();
  const targetPos = useRef(new THREE.Vector3());
  const isCarrier = carrierId === player.id;
  const isGhost = !player.isConnected || (player.isSpectator && !isCarrier);

  // Initialize position immediately
  React.useEffect(() => {
    if (player.position && meshRef.current) {
      meshRef.current.position.set(player.position.x, 0, player.position.y);
      targetPos.current.set(player.position.x, 0, player.position.y);
    }
  }, []);

  useFrame((state, delta) => {
    if (!player.position || !meshRef.current) return;
    
    // Smooth interpolation (Lerp) towards the server position
    targetPos.current.set(player.position.x, 0, player.position.y);
    meshRef.current.position.lerp(targetPos.current, 10 * delta);

    // Add a floating animation
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 3 + player.position.x) * 0.1 + 0.1;
    
    // Rotate the player slightly based on movement direction (if we had rotation)
    // For now, just spin them slowly
    meshRef.current.rotation.y += delta * 1.5;
  });

  if (!player.position) return null;

  return (
    <group ref={meshRef}>
      {/* Shadow Caster */}
      <mesh castShadow receiveShadow position={[0, 0.4, 0]}>
        <capsuleGeometry args={[0.3, 0.4, 4, 16]} />
        <meshStandardMaterial 
          color={player.color} 
          roughness={0.2} 
          metalness={0.5}
          transparent={isGhost}
          opacity={isGhost ? 0.3 : 1}
          emissive={isCarrier ? '#ffffff' : player.color}
          emissiveIntensity={isCarrier ? 1 : 0.2}
        />
      </mesh>

      {/* Name Tag (HTML overlay or simple text, but for now we'll rely on a 3D ring to identify me) */}
      {isMe && (
        <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.4, 0.5, 32]} />
          <meshBasicMaterial color={player.color} transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Carrier Glow */}
      {isCarrier && (
        <pointLight color="#ffffff" intensity={2} distance={5} decay={2} position={[0, 1, 0]} />
      )}
    </group>
  );
}
