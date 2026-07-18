import React, { useState } from 'react';
import socket from '../../socket/socket.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, PLAYER_COLORS } from '../../constants/index.js';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function LandingScreen() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [colorIndex, setColorIndex] = useState(0);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState(null);

  const selectedColor = PLAYER_COLORS[colorIndex];

  const handleCreate = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    setError(null);
    socket.emit(EVENTS.CREATE_ROOM, { playerName: name, color: selectedColor, settings: {} }, (res) => {
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

  const handleJoin = () => {
    if (name.length < 2) return setError('Name must be at least 2 characters');
    if (roomCode.length !== 6) return setError('Room code must be 6 characters');
    setError(null);
    socket.emit(EVENTS.JOIN_ROOM, { roomCode, playerName: name, color: selectedColor }, (res) => {
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

  const nextColor = () => setColorIndex((prev) => (prev + 1) % PLAYER_COLORS.length);
  const prevColor = () => setColorIndex((prev) => (prev - 1 + PLAYER_COLORS.length) % PLAYER_COLORS.length);

  return (
    <div className="min-h-screen bg-[#020817] text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      
      {/* Background styling for Sci-Fi vibe */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 50% 50%, #06b6d4 0%, transparent 50%)'
      }} />

      <div className="z-10 bg-[#0f172a]/80 backdrop-blur-md p-8 rounded-xl shadow-[0_0_40px_rgba(6,182,212,0.15)] border border-[#1e293b] w-full max-w-md">
        
        <h1 className="text-4xl font-bold text-center mb-8 text-[#06b6d4] tracking-widest drop-shadow-[0_0_10px_rgba(6,182,212,0.8)]">
          LUMINA
        </h1>
        
        <div className="space-y-6">
          
          {/* Top Row: Name Input */}
          <div>
            <input 
              type="text" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#1e293b] border-2 border-[#334155] rounded px-4 py-3 text-white font-bold focus:outline-none focus:border-[#06b6d4] transition-colors shadow-inner"
              placeholder="Enter your name"
              maxLength={20}
            />
          </div>

          {/* Middle: Color Selector */}
          <div className="flex flex-col items-center justify-center py-4 bg-[#0b1121] rounded border border-[#1e293b] relative">
            <span className="absolute top-2 left-2 text-xs text-slate-500 uppercase tracking-widest">Avatar</span>
            
            <div className="flex items-center space-x-6 mt-4">
              <button onClick={prevColor} className="text-slate-400 hover:text-white transition-colors hover:scale-110">
                <ChevronLeft size={32} />
              </button>
              
              <div 
                className="w-20 h-20 rounded shadow-[0_0_15px_currentColor] transition-colors duration-300 border-2 border-white/20"
                style={{ backgroundColor: selectedColor, color: selectedColor }}
              />
              
              <button onClick={nextColor} className="text-slate-400 hover:text-white transition-colors hover:scale-110">
                <ChevronRight size={32} />
              </button>
            </div>
          </div>

          {error && <div className="text-red-400 text-sm bg-red-900/30 p-3 rounded border border-red-900/50 text-center">{error}</div>}

          {/* Bottom: Buttons */}
          {!isJoining ? (
            <div className="space-y-3 pt-4">
              <button 
                onClick={() => setIsJoining(true)}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-slate-900 font-extrabold text-xl py-4 px-4 rounded transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(74,222,128,0.3)] hover:shadow-[0_0_25px_rgba(74,222,128,0.6)]"
              >
                Play!
              </button>
              <button 
                onClick={handleCreate}
                className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold py-3 px-4 rounded transition-colors uppercase tracking-widest"
              >
                Create Private Room
              </button>
            </div>
          ) : (
            <div className="space-y-3 pt-4 animate-fadeIn">
              <div>
                <input 
                  type="text" 
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#1e293b] border-2 border-[#334155] rounded px-4 py-3 text-white font-bold focus:outline-none focus:border-[#06b6d4] uppercase tracking-widest text-center"
                  placeholder="6-LETTER CODE"
                  maxLength={6}
                />
              </div>
              <button 
                onClick={handleJoin}
                className="w-full bg-[#4ade80] hover:bg-[#22c55e] text-slate-900 font-extrabold text-xl py-4 px-4 rounded transition-colors uppercase tracking-widest shadow-[0_0_15px_rgba(74,222,128,0.3)]"
              >
                Join Room
              </button>
              <button 
                onClick={() => setIsJoining(false)}
                className="w-full bg-transparent border border-slate-600 hover:bg-slate-800 text-slate-400 font-bold py-2 px-4 rounded transition-colors uppercase text-sm"
              >
                Back
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
