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
    <div className="min-h-[100dvh] bg-black text-white flex flex-col font-sans bg-cover bg-center overflow-hidden relative" style={{ backgroundImage: "url('/BGimg.png')" }}>
      
      {/* Top Left Widget */}
      <div className="absolute top-6 left-6 flex items-center gap-4 bg-black/30 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-lg z-20">
        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
          <svg className="w-5 h-5 text-black" fill="currentColor" viewBox="0 0 20 20">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
          </svg>
        </div>
        <div>
          <div className="text-xs font-bold tracking-widest text-white">2 - 14 PLAYERS</div>
          <div className="text-[10px] text-slate-300 font-semibold tracking-wider">TEAM UP & PLAY</div>
        </div>
      </div>

      {/* Top Right Menu */}
      <div className="absolute top-6 right-6 flex flex-col gap-4 z-20">
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-lg">
            <svg className="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-slate-300">SETTINGS</span>
        </button>
        <button className="flex flex-col items-center gap-1 group">
          <div className="w-12 h-12 rounded-2xl bg-black/30 backdrop-blur-md border border-white/10 flex items-center justify-center group-hover:bg-white/10 transition-colors shadow-lg">
            <svg className="w-6 h-6 text-cyan-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <span className="text-[9px] font-bold tracking-wider text-slate-300">HOW TO PLAY</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-4 pt-24 pb-8 z-10">
        
        {/* Title */}
        <div className="text-center mb-8 relative">
          <h1 className="text-6xl md:text-8xl font-serif font-bold tracking-[0.1em] mb-2 text-[#fffef0] drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]" style={{ fontFamily: 'Georgia, serif' }}>
            LUMINA
          </h1>
          <div className="flex items-center justify-center gap-3 text-[10px] md:text-xs font-semibold tracking-[0.25em] text-[#e5d6a8] mt-4">
            <span>◆</span>
            <span>EXPLORE. COMPETE. ILLUMINATE.</span>
            <span>◆</span>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-[#0b1626]/70 backdrop-blur-xl border border-cyan-500/20 p-8 rounded-3xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-full max-w-xl relative">
          
          <div className="space-y-6">
            
            {/* Player Name Input */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                <span className="text-[10px] font-bold tracking-wider text-slate-300">PLAYER NAME</span>
              </div>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#050b14]/80 border border-cyan-900/40 rounded-xl px-4 py-4 text-white text-lg placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
                placeholder="Enter your name..."
                maxLength={20}
              />
            </div>

            {/* Color Selector */}
            <div className="pt-2">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                <span className="text-[10px] font-bold tracking-wider text-slate-300">SELECT COLOR</span>
              </div>
              <div className="flex flex-wrap gap-3">
                {PLAYER_COLORS.map((color, idx) => (
                  <button
                    key={color}
                    onClick={() => setColorIndex(idx)}
                    className={`w-10 h-10 rounded-full transition-all duration-200 ${
                      idx === colorIndex 
                        ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0b1626] scale-110 shadow-[0_0_15px_rgba(255,255,255,0.3)]' 
                        : 'opacity-60 hover:opacity-100 hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {error && <div className="text-red-300 text-sm bg-red-900/30 px-4 py-3 rounded-xl border border-red-500/30">{error}</div>}

            {/* Buttons */}
            <div className="space-y-3 pt-4">
              <button 
                onClick={handlePlay}
                disabled={isJoining}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-[#035848] to-[#047a61] hover:from-[#046e5a] hover:to-[#059676] border border-[#0de6b8]/40 rounded-xl p-4 flex items-center justify-between transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0de6b8]/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-[#0de6b8]/10 flex items-center justify-center border border-[#0de6b8]/30">
                    <svg className="w-5 h-5 text-[#0de6b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold tracking-wider text-white">{isJoining ? 'JOINING...' : 'PLAY'}</div>
                    <div className="text-xs text-[#0de6b8]/70">Jump into a game and play with others</div>
                  </div>
                </div>
                <svg className="w-6 h-6 text-[#0de6b8] group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
              
              <button 
                onClick={handleCreatePrivate}
                className="w-full relative overflow-hidden group bg-gradient-to-r from-[#2c144a] to-[#451f71] hover:from-[#3a1a61] hover:to-[#5a2894] border border-[#a25cf6]/40 rounded-xl p-4 flex items-center justify-between transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#a25cf6]/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <div className="flex items-center gap-4 relative z-10">
                  <div className="w-10 h-10 rounded-full bg-[#a25cf6]/10 flex items-center justify-center border border-[#a25cf6]/30">
                    <svg className="w-5 h-5 text-[#a25cf6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <div className="text-lg font-bold tracking-wider text-white">PRIVATE ROOM</div>
                    <div className="text-xs text-[#a25cf6]/70">Create or join a room with friends</div>
                  </div>
                </div>
                <svg className="w-6 h-6 text-[#a25cf6] group-hover:translate-x-1 transition-transform relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Feature Row */}
        <div className="mt-6 flex flex-col md:flex-row items-center gap-6 md:gap-12 bg-black/40 backdrop-blur-md px-8 py-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
            <div>
              <div className="text-xs font-bold text-white tracking-wider">FAIR PLAY</div>
              <div className="text-[10px] text-slate-400">No Pay to Win</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            <div>
              <div className="text-xs font-bold text-white tracking-wider">FAST GAMES</div>
              <div className="text-[10px] text-slate-400">5 Minute Matches</div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
            <div>
              <div className="text-xs font-bold text-white tracking-wider">PLAY ANYWHERE</div>
              <div className="text-[10px] text-slate-400">No Login Required</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>
            <div>
              <div className="text-xs font-bold text-white tracking-wider">MAGICAL WORLD</div>
              <div className="text-[10px] text-slate-400">Ever-Changing Maze</div>
            </div>
          </div>
        </div>

      </div>
      
      {/* Footer */}
      <div className="w-full flex justify-between items-end p-6 z-20">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 cursor-pointer">
          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>
          <span className="text-xs font-bold text-slate-300">ENGLISH</span>
          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </div>
        
        <div className="text-xs text-slate-500 font-semibold tracking-widest text-center flex-1">
          © 2024 LUMINA. All rights reserved.
        </div>

        <div className="w-[104px]"></div> {/* Spacer to balance the left side */}
      </div>

    </div>
  );
}
