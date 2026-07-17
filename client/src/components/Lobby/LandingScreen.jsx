import React, { useState, useEffect } from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, PLAYER_COLORS } from '../../constants/index.js';

// Simple pixel-art SVG Avatar component
const PixelAvatar = ({ color }) => (
  <svg viewBox="0 0 32 32" className="w-32 h-32" style={{ filter: 'drop-shadow(2px 4px 0px rgba(0,0,0,0.5))' }}>
    <g transform="scale(2) translate(4, 2)">
      {/* Head */}
      <rect x="3" y="1" width="4" height="1" fill="#000" />
      <rect x="2" y="2" width="1" height="5" fill="#000" />
      <rect x="7" y="2" width="1" height="5" fill="#000" />
      <rect x="3" y="2" width="4" height="5" fill={color} />
      
      {/* Headband/Blindfold */}
      <rect x="2" y="3" width="6" height="2" fill="#000" />
      <rect x="1" y="3" width="1" height="1" fill="#000" />
      <rect x="8" y="3" width="1" height="1" fill="#000" />
      <rect x="0" y="2" width="1" height="1" fill="#000" />
      <rect x="0" y="1" width="1" height="1" fill="#000" />
      
      {/* Smile */}
      <rect x="3" y="5" width="1" height="1" fill="#000" />
      <rect x="6" y="5" width="1" height="1" fill="#000" />
      <rect x="4" y="6" width="2" height="1" fill="#000" />
      
      {/* Body */}
      <rect x="3" y="7" width="4" height="1" fill="#000" />
      <rect x="2" y="8" width="6" height="4" fill={color} />
      <rect x="1" y="9" width="1" height="3" fill={color} />
      <rect x="8" y="9" width="1" height="3" fill={color} />
      
      {/* Body Outlines */}
      <rect x="1" y="8" width="1" height="1" fill="#000" />
      <rect x="8" y="8" width="1" height="1" fill="#000" />
      <rect x="0" y="9" width="1" height="3" fill="#000" />
      <rect x="9" y="9" width="1" height="3" fill="#000" />
      <rect x="0" y="12" width="10" height="1" fill="#000" />
    </g>
  </svg>
);

export default function LandingScreen() {
  const { preferredColor } = useGameStore();
  const [name, setName] = useState(localStorage.getItem('playerName') || '');
  const [colorIndex, setColorIndex] = useState(
    Math.max(0, PLAYER_COLORS.indexOf(preferredColor))
  );
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    localStorage.setItem('preferredColor', PLAYER_COLORS[colorIndex]);
    gameStore.setState({ preferredColor: PLAYER_COLORS[colorIndex] });
  }, [colorIndex]);

  useEffect(() => {
    localStorage.setItem('playerName', name);
  }, [name]);

  const handleCreatePrivate = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    socket.emit(EVENTS.CREATE_ROOM, { playerName: name, color: PLAYER_COLORS[colorIndex], settings: {} }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
      }
    });
  };

  const handlePlay = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    socket.emit('QUICK_JOIN', { playerName: name, color: PLAYER_COLORS[colorIndex] }, (res) => {
      if (res.success) {
        gameStore.setState({
          roomCode: res.roomCode,
          room: res.room,
          player: res.player,
          phase: 'lobby'
        });
      } else {
        setError(res.error);
      }
    });
  };

  const nextColor = () => setColorIndex((i) => (i + 1) % PLAYER_COLORS.length);
  const prevColor = () => setColorIndex((i) => (i - 1 + PLAYER_COLORS.length) % PLAYER_COLORS.length);

  return (
    <div className="min-h-screen bg-blue-700 text-white flex flex-col items-center justify-center p-4 font-mono select-none" style={{ backgroundImage: 'radial-gradient(#1e3a8a 2px, transparent 2px)', backgroundSize: '32px 32px' }}>
      <div className="bg-blue-900 border-4 border-blue-950 p-6 rounded-xl shadow-[8px_8px_0px_rgba(0,0,0,0.3)] w-full max-w-md">
        
        {/* Top Input Row */}
        <div className="flex gap-2 mb-6">
          <input 
            type="text" 
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-white border-2 border-slate-300 rounded px-3 py-2 text-black font-bold focus:outline-none focus:border-blue-500 shadow-[2px_2px_0px_rgba(0,0,0,0.2)]"
            placeholder="Player Name"
            maxLength={16}
          />
          <select className="bg-white border-2 border-slate-300 rounded px-3 py-2 text-black font-bold focus:outline-none shadow-[2px_2px_0px_rgba(0,0,0,0.2)]">
            <option>English</option>
          </select>
        </div>

        {error && <div className="text-red-300 text-center text-sm bg-red-900/50 p-2 rounded mb-4 font-bold border-2 border-red-800">{error}</div>}

        {/* Character Selector */}
        <div className="flex items-center justify-center gap-8 mb-8 bg-blue-800/50 p-6 rounded-lg border-2 border-blue-950/30">
          <button onClick={prevColor} className="text-4xl text-white hover:text-cyan-300 transition-transform hover:-translate-x-1 drop-shadow-md">
            {'<'}
          </button>
          <div className="relative">
            <PixelAvatar color={PLAYER_COLORS[colorIndex]} />
            <div className="absolute top-0 right-0 w-8 h-8 bg-black/20 rounded flex items-center justify-center border border-white/10" title="Color Preview">
              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: PLAYER_COLORS[colorIndex], boxShadow: 'inset -2px -2px 0px rgba(0,0,0,0.2)' }} />
            </div>
          </div>
          <button onClick={nextColor} className="text-4xl text-white hover:text-cyan-300 transition-transform hover:translate-x-1 drop-shadow-md">
            {'>'}
          </button>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4">
          <button 
            onClick={handlePlay}
            disabled={isJoining}
            className="w-full bg-[#65d336] hover:bg-[#52af29] active:translate-y-1 active:shadow-[0px_0px_0px_#3d871d] text-white text-2xl font-bold py-4 px-4 rounded transition-all shadow-[0px_6px_0px_#3d871d] border-2 border-[#3d871d] flex items-center justify-center"
          >
            {isJoining ? 'Finding Match...' : 'Play!'}
          </button>
          
          <button 
            onClick={handleCreatePrivate}
            className="w-full bg-[#3b82f6] hover:bg-[#2563eb] active:translate-y-1 active:shadow-[0px_0px_0px_#1d4ed8] text-white text-xl font-bold py-3 px-4 rounded transition-all shadow-[0px_4px_0px_#1d4ed8] border-2 border-[#1d4ed8]"
          >
            Create Private Room
          </button>
        </div>
        
      </div>
    </div>
  );
}
