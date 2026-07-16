import React, { useEffect, useRef, useState } from 'react';
import { useGameStore } from '../../hooks/useGameStore.js';
import socket from '../../socket/socket.js';
import { drawMaze } from '../../game/renderer/mazeRenderer.js';
import { usePlayerController } from '../../hooks/usePlayerController.js';
import { soundEngine } from '../../game/audio/soundEngine.js';
import VirtualJoystick from './VirtualJoystick.jsx';
import Minimap from './Minimap.jsx';

export default function GameScreen() {
  const { room } = useGameStore();
  const canvasRef = useRef(null);
  const requestRef = useRef();
  
  const [flashEffect, setFlashEffect] = useState(null);
  const [screenShake, setScreenShake] = useState(false);
  
  const maze = room?.match?.maze;
  const players = room?.players || {};
  
  // Find my initial spawn position from the server state
  const myPlayer = players[socket.id];
  const initialPosition = myPlayer?.position;

  const { playerRef, keys, joystickRef, headBobRef, handleMouseMove, updateRotation, updateMovement } = usePlayerController(maze, initialPosition);

  const matchPhase = room?.match?.phase;

  // Keep players and phase in a ref so the game loop doesn't restart every 50ms
  const playersRef = useRef(players);
  const matchPhaseRef = useRef(matchPhase);
  useEffect(() => {
    playersRef.current = players;
    matchPhaseRef.current = matchPhase;
  }, [players, matchPhase]);

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
         soundEngine.playTag(); // Transferred from another player
         if (lightCarrier === socket.id) setFlashEffect('pickup');
         else if (prevLightCarrierRef.current === socket.id) setFlashEffect('damage');
      } else {
         soundEngine.playPickup(); // Picked up from floor
         if (lightCarrier === socket.id) setFlashEffect('pickup');
      }
      setTimeout(() => setFlashEffect(null), 300);
    }
    prevLightCarrierRef.current = lightCarrier;
  }, [lightCarrier]);

  const wallShiftWarning = room?.match?.wallShifts?.warningActive;
  const prevWarningRef = useRef(wallShiftWarning);
  useEffect(() => {
    if (wallShiftWarning && !prevWarningRef.current) {
      soundEngine.playAlarm();
    } else if (!wallShiftWarning && prevWarningRef.current) {
      // Shift executed
      setScreenShake(true);
      setTimeout(() => setScreenShake(false), 500);
    }
    prevWarningRef.current = wallShiftWarning;
  }, [wallShiftWarning]);

  useEffect(() => {
    if (matchPhase === 'SUDDEN_DEATH') {
      soundEngine.startHeartbeat();
    } else {
      soundEngine.stopHeartbeat();
    }
  }, [matchPhase]);

  useEffect(() => {
    if (!maze || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Internal resolution for retro 3D look
    canvas.width = 640;
    canvas.height = 360;

    let lastTime = performance.now();

    const renderFrame = (time) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Check if I am carrying the light
      const isCarrier = room?.match?.lostLight?.carrierId === socket.id;

      // Update my position
      const p = updateMovement(dt, isCarrier, myPlayer);
      
      // Draw 3D world (walls + other players + light + gifts)
      drawMaze(ctx, maze, canvas.width, canvas.height, p, playersRef.current, socket.id, room?.match?.lostLight, room?.match?.gifts, myPlayer, matchPhaseRef.current, headBobRef.current.offset);
      
      requestRef.current = requestAnimationFrame(renderFrame);
    };

    requestRef.current = requestAnimationFrame(renderFrame);

    return () => cancelAnimationFrame(requestRef.current);
  }, [maze, myPlayer]);

  // E key for Gift usage
  useEffect(() => {
    const handleKeyDown = (e) => {
       if (e.key.toLowerCase() === 'e') {
          socket.emit('USE_GIFT');
       }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const lostLight = room?.match?.lostLight;
  let lightStatusMessage = "Find the Lost Light in the maze!";
  let lightStatusColor = "text-yellow-400";
  if (lostLight?.carrierId) {
    if (lostLight.carrierId === socket.id) {
       lightStatusMessage = "YOU HAVE THE LIGHT! RUN TO THE EXIT!";
       lightStatusColor = "text-yellow-300 font-black animate-pulse";
    } else {
       const carrier = players[lostLight.carrierId];
       if (carrier) {
         lightStatusMessage = `${carrier.name} (${carrier.team}) has the Light!`;
         lightStatusColor = carrier.team === myPlayer?.team ? "text-cyan-300" : "text-pink-400";
       }
    }
  }

  const channel = room?.match?.channel;
  const matchResult = room?.match?.result;
  const wallShifts = room?.match?.wallShifts;
  const suddenDeath = room?.match?.suddenDeath;

  let sdTimeLeft = 60;
  if (matchPhase === 'SUDDEN_DEATH' && suddenDeath?.startedAt) {
     sdTimeLeft = Math.max(0, 60 - Math.floor((Date.now() - suddenDeath.startedAt) / 1000));
  }

  return (
    <div className={`min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative ${screenShake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}>
      {/* Flash Effects */}
      {flashEffect === 'damage' && <div className="absolute inset-0 bg-red-600/50 z-40 pointer-events-none animate-pulse"></div>}
      {flashEffect === 'pickup' && <div className="absolute inset-0 bg-yellow-400/50 z-40 pointer-events-none animate-[pulse_0.2s_ease-out]"></div>}

      {/* Light Status UI */}
      {matchPhase !== 'MATCH_END' && (
        <div className={`absolute top-4 left-1/2 -translate-x-1/2 text-2xl z-20 bg-slate-900/80 px-6 py-2 rounded-full border-2 border-slate-700 shadow-xl ${lightStatusColor}`}>
          {lightStatusMessage}
        </div>
      )}

      {/* Wall Shift Warning UI */}
      {wallShifts?.warningActive && wallShifts?.pendingShiftZone && matchPhase !== 'MATCH_END' && (
        <div className="absolute top-32 left-1/2 -translate-x-1/2 z-20 bg-red-900/90 text-white p-4 rounded-xl border-4 border-red-500 shadow-2xl animate-pulse text-center">
          <p className="text-xl font-black mb-1 text-red-300">WARNING: MAZE SHIFT DETECTED</p>
          <p className="font-mono">SECTOR [{wallShifts.pendingShiftZone.x}, {wallShifts.pendingShiftZone.y}] RECONFIGURING</p>
        </div>
      )}

      {/* Sudden Death UI */}
      {matchPhase === 'SUDDEN_DEATH' && (
        <div className="absolute top-48 right-4 z-20 bg-black/80 p-4 rounded-xl border-2 border-red-600 text-red-500 text-center animate-pulse">
          <p className="font-bold text-sm">SUDDEN DEATH</p>
          <p className="font-black text-4xl font-mono">0:{sdTimeLeft.toString().padStart(2, '0')}</p>
        </div>
      )}

      {/* Minimap UI */}
      {matchPhase !== 'MATCH_END' && maze && myPlayer && (
        <div className="absolute top-4 right-4 z-20">
          <Minimap 
            maze={maze} 
            myPlayer={myPlayer} 
            players={players} 
            lostLight={room?.match?.lostLight} 
            myId={socket.id} 
          />
        </div>
      )}

      {/* Channeling Progress UI */}
      {channel?.startedAt && !channel.interrupted && matchPhase !== 'MATCH_END' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 w-96 bg-slate-900/90 p-4 rounded-xl border border-yellow-500/50 shadow-2xl">
          <p className="text-center text-yellow-400 font-bold mb-2">CHANNELING AT THE EXIT...</p>
          <div className="w-full bg-slate-800 rounded-full h-4 overflow-hidden border border-slate-700">
            <div 
              className="bg-yellow-400 h-full transition-all duration-100" 
              style={{ width: `${(channel.progress || 0) * 100}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Match End Overlay / Scoreboard */}
      {matchPhase === 'MATCH_END' && matchResult && (
        <div className="absolute inset-0 bg-black/90 z-50 flex flex-col items-center justify-center p-4">
           <div className={`w-full max-w-2xl p-8 rounded-3xl border-4 shadow-2xl flex flex-col items-center ${(matchResult.winnerTeam === myPlayer?.team || matchResult.winnerTeam === 'DRAW') ? 'border-yellow-400 bg-slate-900 shadow-yellow-500/20' : 'border-red-500 bg-slate-900 shadow-red-500/20'}`}>
              
              <h1 className={`text-6xl font-black mb-2 tracking-widest uppercase ${(matchResult.winnerTeam === myPlayer?.team || matchResult.winnerTeam === 'DRAW') ? 'text-yellow-400' : 'text-red-500'}`}>
                {matchResult.winnerTeam === 'DRAW' ? 'DRAW!' : (matchResult.winnerTeam === myPlayer?.team ? 'VICTORY!' : 'DEFEAT')}
              </h1>
              
              <p className="text-xl text-slate-300 text-center mb-8 font-semibold">
                {matchResult.winnerTeam === 'DRAW' 
                  ? 'Time ran out during Sudden Death!' 
                  : (matchResult.winnerTeam === myPlayer?.team 
                      ? 'Your team claimed the Lost Light.' 
                      : 'The enemy team claimed the Light.')}
              </p>

              <div className="w-full bg-slate-950 p-6 rounded-xl border border-slate-700 mb-8 flex flex-col items-center">
                <h2 className="text-cyan-400 text-sm font-bold tracking-widest mb-4">MATCH STATISTICS</h2>
                
                {matchResult.mvpId && players[matchResult.mvpId] && (
                  <div className="flex flex-col items-center mb-6">
                    <span className="text-slate-400 text-xs mb-1">MOST VALUABLE PLAYER</span>
                    <div className="bg-slate-800 px-6 py-2 rounded-full border border-yellow-500/50 flex items-center gap-3">
                      <span className="text-2xl text-yellow-400">👑</span>
                      <span className="text-xl font-bold text-white">{players[matchResult.mvpId].name}</span>
                      <span className="text-sm text-slate-400">({players[matchResult.mvpId].team})</span>
                    </div>
                  </div>
                )}

                <div className="flex justify-between w-full max-w-md gap-4">
                  <div className="flex-1 bg-slate-900 p-4 rounded text-center border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">WINNING TEAM</div>
                    <div className="text-2xl font-black text-white">{matchResult.winnerTeam}</div>
                  </div>
                  <div className="flex-1 bg-slate-900 p-4 rounded text-center border border-slate-700">
                    <div className="text-slate-400 text-xs mb-1">TOTAL TRANSFERS</div>
                    <div className="text-2xl font-black text-cyan-300">{room?.match?.lostLight?.transferCount || 0}</div>
                  </div>
                </div>
              </div>

              {myPlayer?.isHost ? (
                <button 
                  onClick={() => socket.emit('RETURN_TO_LOBBY')} 
                  className="w-full max-w-sm py-4 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-xl border border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.5)] active:scale-95"
                >
                  Return to Lobby
                </button>
              ) : (
                <div className="text-slate-400 italic font-medium animate-pulse">
                  Waiting for host to return to lobby...
                </div>
              )}
           </div>
        </div>
      )}

      <div className="absolute top-4 left-4 text-cyan-400 font-mono text-sm z-10 bg-black/50 p-4 rounded border border-cyan-900/50 flex flex-col gap-4">
        <div>
          <p className="font-bold text-white mb-2">1ST-PERSON 3D RAYCASTER</p>
          <p>W/S : Move Forward/Back</p>
          <p>A/D : Turn Left/Right</p>
          <p>Click & Drag : Mouse Look</p>
        </div>
        
        {/* Gift UI */}
        <div className={`border p-2 rounded ${activeGift ? 'border-green-400 bg-green-900/30 text-green-300' : 'border-slate-700 bg-slate-800/50 text-slate-500'}`}>
          <p className="font-bold mb-1">INVENTORY</p>
          <p className="text-lg">{activeGift ? `[E] USE ${activeGift}` : 'Empty Slot'}</p>
        </div>
      </div>

      {maze ? (
        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 shadow-2xl w-full max-w-4xl relative">
          <canvas 
            ref={canvasRef}
            onMouseMove={handleMouseMove}
            onTouchStart={(e) => {
              // Only track right half of the screen for camera rotation
              const touch = e.touches[0];
              if (touch && touch.clientX > window.innerWidth / 2) {
                 canvasRef.current.lastTouchX = touch.clientX;
              }
            }}
            onTouchMove={(e) => {
              const touch = e.touches[0];
              if (touch && canvasRef.current.lastTouchX !== undefined && canvasRef.current.lastTouchX !== null) {
                 const deltaX = touch.clientX - canvasRef.current.lastTouchX;
                 updateRotation(deltaX * -0.005);
                 canvasRef.current.lastTouchX = touch.clientX;
              }
            }}
            onTouchEnd={() => { canvasRef.current.lastTouchX = null; }}
            onTouchCancel={() => { canvasRef.current.lastTouchX = null; }}
            className="block w-full rounded-lg shadow-inner cursor-crosshair aspect-video bg-black"
            style={{ imageRendering: 'pixelated', touchAction: 'none' }}
          />
          
          {/* Mobile Controls */}
          <div className="absolute bottom-8 left-8 md:hidden z-10 opacity-80">
            <VirtualJoystick onMove={(vec) => { joystickRef.current = vec; }} />
          </div>
          
          {activeGift && (
            <div className="absolute bottom-8 right-8 md:hidden z-10 opacity-80">
              <button 
                onClick={() => socket.emit('USE_GIFT')}
                className="w-24 h-24 bg-green-600/80 rounded-full border-4 border-green-400 text-white font-black text-xl shadow-[0_0_20px_rgba(74,222,128,0.5)] active:bg-green-500 active:scale-95 transition-all touch-none"
              >
                USE<br/>GIFT
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <div className="text-cyan-400 text-xl tracking-widest uppercase font-bold">Generating 3D Maze...</div>
        </div>
      )}
    </div>
  );
}
