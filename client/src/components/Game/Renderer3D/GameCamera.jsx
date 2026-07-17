import React, { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export default function GameCamera({ targetPosition, cameraMode }) {
  const { camera } = useThree();
  const currentPos = useRef(new THREE.Vector3());
  const currentLookAt = useRef(new THREE.Vector3());
  
  useEffect(() => {
    // Initialize position when component mounts to avoid sudden jumps
    if (targetPosition) {
      currentLookAt.current.set(targetPosition.x, 0, targetPosition.y);
      if (cameraMode === 'topdown') {
        currentPos.current.set(targetPosition.x, 20, targetPosition.y + 0.1);
      } else if (cameraMode === 'isometric') {
        currentPos.current.set(targetPosition.x - 10, 15, targetPosition.y + 10);
      } else if (cameraMode === 'thirdperson') {
        currentPos.current.set(targetPosition.x, 4, targetPosition.y + 8);
      }
      camera.position.copy(currentPos.current);
      camera.lookAt(currentLookAt.current);
    }
  }, []);

  useFrame((state, delta) => {
    if (!targetPosition) return;

    // The point we want to look at (the player)
    const targetLookAt = new THREE.Vector3(targetPosition.x, 0, targetPosition.y);
    
    // The desired camera position based on the mode
    const targetCameraPos = new THREE.Vector3();
    
    if (cameraMode === 'topdown') {
      targetCameraPos.set(targetPosition.x, 25, targetPosition.y + 0.1);
    } else if (cameraMode === 'isometric') {
      targetCameraPos.set(targetPosition.x - 12, 18, targetPosition.y + 12);
    } else if (cameraMode === 'thirdperson') {
      // For third person, we place the camera slightly behind and above
      targetCameraPos.set(targetPosition.x, 5, targetPosition.y + 8);
    }

    // Smoothly interpolate current position/lookAt towards target (Lerp)
    const lerpSpeed = 5.0 * delta;
    currentPos.current.lerp(targetCameraPos, lerpSpeed);
    currentLookAt.current.lerp(targetLookAt, lerpSpeed);

    // Apply to camera
    camera.position.copy(currentPos.current);
    camera.lookAt(currentLookAt.current);
  });

  return null;
}
