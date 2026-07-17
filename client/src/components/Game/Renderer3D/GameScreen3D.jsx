import React, { useEffect, useState, useRef } from 'react';
import { useGameStore } from '../../../hooks/useGameStore.js';
import socket from '../../../socket/socket.js';
import { usePlayerController } from '../../../hooks/usePlayerController.js';
import { soundEngine } from '../../../game/audio/soundEngine.js';
import VirtualJoystick from '../VirtualJoystick.jsx';
import Minimap from '../Minimap.jsx';
import ChatBox from '../../Chat/ChatBox.jsx';
import GiftUI from '../GiftUI.jsx';
import { EVENTS } from '../../../constants/index.js';

// 3D Imports
import { Canvas } from '@react-three/fiber';
import { Environment, Stars } from '@react-three/drei';
import Maze3D from './Maze3D.jsx';
import Player3D from './Player3D.jsx';
import Item3D from './Item3D.jsx';
import GameCamera from './GameCamera.jsx';

export default function GameScreen3D() {
  const { room } = useGameStore();
  
  const [flashEffect, setFlashEffect] = useState(null);
  const [cameraMode, setCameraMode] = useState('thirdperson'); // 'topdown', 'isometric', 'thirdperson'
  
  const maze = room?.match?.maze;
  const players = room?.players || {};
  
  const myPlayer = players[socket.id];
  const myActualSocketId = socket.id;
  const initialPosition = myPlayer?.position;

  const { playerRef, keys, joystickRef, handleMouseMove, updateRotation, updateMovement } = usePlayerController(maze, initialPosition);

  const matchPhase = room?.match?.phase;

  // Handle 'C' key for camera switch
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'c' || e.key === 'C') {
        setCameraMode(prev => {
          if (prev === 'topdown') return 'isometric';
          if (prev === 'isometric') return 'thirdperson';
          return 'topdown';
        });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Audio Initialization
  useEffect(() => {
    const initAudio = () => soundEngine.init();
    window.addEventListener('click', initAudio, { once: true });
    window.addEventListener('keydown', initAudio, { once: true });
    return () => {
      window.removeEventListener('click', initAudio);
      window.removeEventListener('keydown', initAudio);
    }
  }, []);

  // Audio Events
  const activeGift = myPlayer?.activeGift;
  const prevGiftRef = useRef(activeGift);
  useEffect(() => {
    if (activeGift && activeGift !== prevGiftRef.current) {
      soundEngine.playPickup();
    }
    prevGiftRef.current = activeGift;
  }, [activeGift]);

  const lightCarrier = room?.match?.lostLight?.carrierId;
  const prevLightCarrierRef = useRef(lightCarrier);
  useEffect(() => {
    if (lightCarrier && lightCarrier !== prevLightCarrierRef.current) {
      if (prevLightCarrierRef.current) {
         soundEngine.playTag();
         if (lightCarrier === myActualSocketId) setFlashEffect('pickup');
         else if (prevLightCarrierRef.current === myActualSocketId) setFlashEffect('damage');
      } else {
         soundEngine.playPickup();
         if (lightCarrier === myActualSocketId) setFlashEffect('pickup');
      }
      setTimeout(() => setFlashEffect(null), 300);
    }
    prevLightCarrierRef.current = lightCarrier;
  }, [lightCarrier, myActualSocketId]);

  const isSuddenDeath = matchPhase === 'SUDDEN_DEATH';

  return (
    <div className="w-screen h-[100dvh] bg-black overflow-hidden relative select-none">
      
      {/* 3D Canvas Background */}
      <div className="absolute inset-0 z-0 cursor-crosshair" onMouseMove={handleMouseMove}>
        <Canvas shadows camera={{ position: [0, 20, 0], fov: 60 }}>
          
          <color attach="background" args={[isSuddenDeath ? '#220000' : '#030a16']} />
          <fog attach="fog" args={[isSuddenDeath ? '#220000' : '#030a16', 10, 50]} />
          
          <ambientLight intensity={isSuddenDeath ? 0.1 : 0.2} />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

          <GameCamera targetPosition={myPlayer?.position} cameraMode={cameraMode} />

          <Maze3D maze={maze} matchPhase={matchPhase} />
          
          {/* Players */}
          {Object.values(players).map(p => (
            <Player3D 
              key={p.id} 
              player={p} 
              isMe={p.socketId === myActualSocketId} 
              carrierId={lightCarrier} 
            />
          ))}

          {/* Gifts */}
          {room?.match?.gifts?.map((g, i) => (
            <Item3D key={`gift_${i}`} type={g.type} position={g.position} isLight={false} />
          ))}

          {/* Lost Light (if dropped) */}
          {room?.match?.lostLight?.position && !lightCarrier && (
            <Item3D type="LIGHT" position={room.match.lostLight.position} isLight={true} />
          )}

          {/* Exit */}
          {room?.match?.exit?.isOpen && room?.match?.exit?.position && (
            <group position={[room.match.exit.position.x, 0.5, room.match.exit.position.y]}>
              <mesh>
                <cylinderGeometry args={[0.8, 0.8, 0.2, 32]} />
                <meshStandardMaterial color="#0de6b8" emissive="#0de6b8" emissiveIntensity={2} />
              </mesh>
              <pointLight color="#0de6b8" intensity={5} distance={10} />
            </group>
          )}
        </Canvas>
      </div>

      {/* 2D Screen Overlay (Flashes) */}
      {flashEffect === 'damage' && <div className="absolute inset-0 bg-red-500/30 z-10 pointer-events-none animate-pulse"></div>}
      {flashEffect === 'pickup' && <div className="absolute inset-0 bg-cyan-400/30 z-10 pointer-events-none animate-pulse"></div>}
      {isSuddenDeath && <div className="absolute inset-0 bg-red-900/10 z-10 pointer-events-none border-8 border-red-500/50 animate-pulse mix-blend-overlay"></div>}

      {/* UI Layer */}
      <div className="absolute inset-0 z-20 pointer-events-none">
        {/* Top Left: Score / Info */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          <div className="bg-black/50 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 shadow-lg pointer-events-auto">
            <h2 className="text-white font-bold tracking-widest text-sm">
              LUMINA <span className="text-cyan-400">3D</span>
            </h2>
            <div className="text-xs text-slate-400">Press 'C' to change Camera</div>
            <div className="text-xs font-bold mt-1 text-purple-400">Mode: {cameraMode.toUpperCase()}</div>
          </div>
        </div>

        {/* Top Center: Timer & Phase */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-auto">
          <div className="bg-black/50 backdrop-blur-md px-6 py-2 rounded-2xl border border-white/10 flex flex-col items-center">
             <div className="text-xs font-bold text-slate-400 tracking-widest">{isSuddenDeath ? 'SUDDEN DEATH' : 'MATCH IN PROGRESS'}</div>
             <div className={`text-2xl font-mono font-bold tracking-widest ${isSuddenDeath ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                {room?.match?.timeLeft || 0}s
             </div>
          </div>
        </div>

        {/* HUD Elements */}
        {myPlayer && <GiftUI activeGift={myPlayer.activeGift} isCarrier={myPlayer.id === lightCarrier} />}
        
        {/* Mobile Joystick */}
        <VirtualJoystick joystickRef={joystickRef} />
        
        {/* Minimap */}
        <div className="absolute top-4 right-4 pointer-events-auto shadow-[0_0_20px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden border-2 border-white/10">
          <Minimap maze={maze} players={players} light={room?.match?.lostLight} myId={myActualSocketId} />
        </div>
      </div>

      {/* Chat Box */}
      <ChatBox roomCode={room?.code} />

    </div>
  );
}
