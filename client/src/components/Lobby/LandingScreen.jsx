import React, { useState, useEffect } from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, PLAYER_COLORS } from '../../constants/index.js';

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
    setIsJoining(true);
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
        setIsJoining(false);
      }
    });
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 font-sans bg-cover bg-center" style={{ backgroundImage: "url('/BGimg.png')" }}>
      
      {/* Top Left Header */}
      <div className="absolute top-6 left-6 flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
        <div className="w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
        </div>
        <div className="text-xs font-semibold tracking-widest text-slate-300">
          SERVER STATUS<br/><span className="text-cyan-400">ONLINE</span>
        </div>
      </div>

      {/* Main Glass Panel */}
      <div className="bg-[#0b1320]/80 backdrop-blur-xl border border-cyan-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(6,182,212,0.15)] w-full max-w-2xl relative overflow-hidden">
        
        {/* Subtle glow behind title */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/20 blur-[60px] rounded-full pointer-events-none" />

        <div className="text-center mb-10 relative z-10">
          <h1 className="text-5xl md:text-7xl font-serif font-bold tracking-widest mb-3 bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent drop-shadow-lg" style={{ fontFamily: 'Georgia, serif' }}>
            LUMINA
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs md:text-sm font-semibold tracking-[0.2em] text-[#d4af37]">
            <span>◆</span>
            <span>TWO TEAMS. ONE MAGICAL LIGHT. ESCAPE TOGETHER.</span>
            <span>◆</span>
          </div>
        </div>
        
        <div className="space-y-6 relative z-10">
          
          {/* Player Name Input */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-3 text-xs font-semibold tracking-widest text-[#d4af37]">
              <span className="text-[10px]">❖</span> PLAYER NAME <span className="text-[10px]">❖</span>
            </div>
            <div className="relative group">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-cyan-400 transition-colors" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                </svg>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#050b14] border border-cyan-900/50 rounded-xl pl-12 pr-4 py-4 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all shadow-inner"
                placeholder="Enter your name..."
                maxLength={20}
              />
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <div className="flex items-center justify-center gap-2 mb-3 text-xs font-semibold tracking-widest text-slate-400">
              <span className="text-[10px]">❖</span> SELECT COLOR <span className="text-[10px]">❖</span>
            </div>
            <div className="flex justify-center gap-3">
              {PLAYER_COLORS.map((color, idx) => (
                <button
                  key={color}
                  onClick={() => setColorIndex(idx)}
                  className={`w-8 h-8 rounded-full transition-all duration-300 ${
                    idx === colorIndex 
                      ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-[#0b1320] shadow-[0_0_15px_rgba(255,255,255,0.5)]' 
                      : 'opacity-50 hover:opacity-100 hover:scale-110'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          {error && <div className="text-red-300 text-center text-sm bg-red-900/40 p-3 rounded-lg border border-red-500/50">{error}</div>}

          {/* Action Buttons */}
          <div className="space-y-4 pt-4">
            {/* Play Button (Create Match styling) */}
            <button 
              onClick={handlePlay}
              disabled={isJoining}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-[#03446a] to-[#04619f] hover:from-[#045688] hover:to-[#0576c2] border border-cyan-400/50 rounded-xl p-4 flex items-center justify-between transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-cyan-900/50 flex items-center justify-center border border-cyan-500/30">
                  <svg className="w-5 h-5 text-cyan-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold tracking-wider text-white">{isJoining ? 'FINDING MATCH...' : 'QUICK MATCH'}</div>
                  <div className="text-xs text-cyan-200/70">Jump into an open game instantly</div>
                </div>
              </div>
              <svg className="w-6 h-6 text-cyan-400 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Create Private Room Button (Join Match styling) */}
            <button 
              onClick={handleCreatePrivate}
              className="w-full relative overflow-hidden group bg-gradient-to-r from-[#3c1053] to-[#5b187c] hover:from-[#4b1468] hover:to-[#711e9a] border border-purple-400/50 rounded-xl p-4 flex items-center justify-between transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-400/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-10 h-10 rounded-full bg-purple-900/50 flex items-center justify-center border border-purple-500/30">
                  <svg className="w-5 h-5 text-purple-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <div className="text-left">
                  <div className="text-lg font-bold tracking-wider text-white">PRIVATE MATCH</div>
                  <div className="text-xs text-purple-200/70">Host a game and invite your friends</div>
                </div>
              </div>
              <svg className="w-6 h-6 text-purple-400 group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div className="flex items-center justify-center gap-4 my-6">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-slate-600" />
            <div className="text-[10px] font-bold tracking-[0.3em] text-[#d4af37]">OR</div>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-slate-600" />
          </div>

          {/* Features Footer */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-700/50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-900/50 flex items-center justify-center border border-blue-500/30">
                <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wider">NO LOGIN</div>
                <div className="text-[10px] text-slate-400">Jump right in</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-900/50 flex items-center justify-center border border-yellow-500/30">
                <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wider">QUICK MATCHES</div>
                <div className="text-[10px] text-slate-400">5 minute games</div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center border border-purple-500/30">
                <svg className="w-4 h-4 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
              </div>
              <div>
                <div className="text-xs font-bold text-white tracking-wider">PLAY TOGETHER</div>
                <div className="text-[10px] text-slate-400">2 - 14 players</div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      {/* Bottom Footer Elements */}
      <div className="absolute bottom-6 left-6 right-6 flex justify-between items-center text-xs font-semibold tracking-wider text-slate-400">
        <button className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/60 transition-colors flex items-center gap-2">
          <span className="text-cyan-400">◆</span> NEWS & UPDATES
        </button>
        <div className="hidden sm:block">© 2024 Lumina. All rights reserved.</div>
        <button className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 hover:bg-black/60 transition-colors flex items-center gap-2">
          HOW TO PLAY <span className="text-cyan-400">›</span>
        </button>
      </div>

    </div>
  );
}
