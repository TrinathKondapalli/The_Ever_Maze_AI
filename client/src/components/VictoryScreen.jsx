import React, { useEffect, useState } from 'react';
import { TEAM, UI_SCREEN } from '@shared/constants.js';
import { useGameStore } from '../store/gameStore.js';

export default function VictoryScreen({ winData, onReturnToLobby }) {
  const [countdown, setCountdown] = useState(60);
  const player = useGameStore((s) => s.player);

  useEffect(() => {
    const int = setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(int);
  }, []);

  if (!winData) return null;

  const { team, reason, carrierId } = winData;
  const isDraw = reason === 'timeout';
  
  const didIWin = !isDraw && player?.team === team;
  const isMyTeam = player?.team === team;

  let title = isDraw ? 'MATCH DRAW' : (isMyTeam ? 'VICTORY' : 'DEFEAT');
  let subtitle = isDraw 
    ? 'Time expired before the treasure was secured.'
    : `Team ${team} secured the Treasure!`;
  
  const textColor = isDraw 
    ? 'text-gray-300' 
    : (team === TEAM.A ? 'text-[#2563EB]' : 'text-[#DC2626]');

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#050510] bg-opacity-95 backdrop-blur-md">
      
      {/* Celebration / Result Title */}
      <h1 className={`text-7xl font-black uppercase tracking-widest drop-shadow-[0_0_20px_rgba(255,255,255,0.2)] mb-4 animate-bounce ${textColor}`}>
        {title}
      </h1>
      
      <p className="text-2xl text-gray-200 font-medium mb-12 animate-pulse">
        {subtitle}
      </p>

      {/* Stats / Details Panel */}
      <div className="bg-[#0f111a] border border-[#2c2f44] rounded-lg p-8 shadow-2xl max-w-md w-full text-center">
        {!isDraw && carrierId && (
          <div className="mb-6">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest mb-1">MVP Carrier</h3>
            {/* Find name from gameStore if needed, or just keep it simple */}
            <p className="text-xl font-bold text-white">Carrier secured the exit!</p>
          </div>
        )}

        <div className="text-sm text-gray-500 mb-6">
          Returning to lobby in {countdown}s...
        </div>

        <button
          onClick={onReturnToLobby}
          className="w-full py-4 bg-[#2c2f44] hover:bg-[#3f435e] text-white font-bold rounded uppercase tracking-wider transition-all active:scale-95"
        >
          Return to Lobby Early
        </button>
      </div>

    </div>
  );
}
