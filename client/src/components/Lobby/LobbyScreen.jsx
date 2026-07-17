import React from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, MAZE_TYPE } from '../../constants/index.js';

export default function LobbyScreen() {
  const { room, roomCode, error } = useGameStore();

  const handleLeave = () => {
    socket.emit(EVENTS.LEAVE_ROOM, {});
    gameStore.reset();
  };

  if (!room) {
    return (
      <div className="min-h-[100dvh] bg-black text-white flex flex-col items-center justify-center p-4 font-sans bg-cover bg-center" style={{ backgroundImage: "url('/BGimg.png')" }}>
        <div className="bg-[#0b1626]/80 backdrop-blur-xl border border-red-500/30 p-10 rounded-[2rem] shadow-[0_0_50px_rgba(239,68,68,0.15)] text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-16 bg-red-500/20 blur-[40px] rounded-full pointer-events-none" />
          <h2 className="text-3xl font-serif font-bold tracking-widest mb-4 bg-gradient-to-b from-white to-red-200 bg-clip-text text-transparent">CONNECTION LOST</h2>
          <p className="text-sm text-red-200/70 mb-8 font-semibold tracking-wider">Room not found or you were disconnected.</p>
          <button
            onClick={handleLeave}
            className="px-8 py-3 bg-red-900/40 hover:bg-red-800/60 border border-red-500/50 rounded-xl text-red-100 font-bold tracking-widest text-sm transition-colors shadow-[0_0_15px_rgba(239,68,68,0.2)]"
          >
            RETURN TO MENU
          </button>
        </div>
      </div>
    );
  }

  const actualMyPlayer = room?.players?.[socket.id];
  const isHost = actualMyPlayer?.isHost;

  const players = Object.values(room?.players || {});
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const isTeamsBalanced = teamA.length === teamB.length && teamA.length > 0;

  const handleSwitchTeam = (team) => {
    socket.emit(EVENTS.SWITCH_TEAM, { team });
  };

  const handleChangeMazeType = (type) => {
    socket.emit(EVENTS.CHANGE_MAZE_TYPE, { type });
  };

  const handleStartGame = () => {
    socket.emit(EVENTS.START_GAME, {});
  };

  const handleKick = (targetPlayerId) => {
    socket.emit(EVENTS.KICK_PLAYER, { targetPlayerId });
  };

  const handleReady = () => {
    socket.emit(EVENTS.PLAYER_READY, {});
  };

  const TeamList = ({ teamId, teamPlayers, teamColor, teamGlow }) => (
    <div className={`flex-1 bg-[#0b1626]/70 backdrop-blur-xl border border-${teamColor}-500/30 p-6 rounded-3xl relative overflow-hidden flex flex-col min-h-[300px]`}>
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-${teamColor}-500/10 blur-[50px] rounded-full pointer-events-none`} />
      
      <div className="flex justify-between items-center mb-6 relative z-10 border-b border-white/5 pb-4">
        <h2 className={`text-2xl font-bold tracking-widest text-${teamColor}-400 drop-shadow-[0_0_10px_rgba(${teamGlow},0.5)]`}>
          TEAM {teamId}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400">{teamPlayers.length} / 7</span>
          {actualMyPlayer?.team !== teamId && teamPlayers.length < 7 && (
            <button
              onClick={() => handleSwitchTeam(teamId)}
              className={`text-[10px] font-bold tracking-wider bg-${teamColor}-900/30 hover:bg-${teamColor}-800/50 border border-${teamColor}-500/40 text-${teamColor}-200 px-3 py-1.5 rounded-lg transition-colors`}
            >
              JOIN
            </button>
          )}
        </div>
      </div>
      
      <div className="space-y-3 relative z-10 flex-1">
        {teamPlayers.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs font-semibold tracking-widest text-slate-500/50 uppercase">Empty</span>
          </div>
        )}
        {teamPlayers.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-black/40 border border-white/5 p-3 rounded-xl hover:bg-black/60 transition-colors">
            <div className="flex items-center gap-3">
              <div 
                className="w-4 h-4 rounded-full border border-white/20 shadow-[0_0_10px_rgba(255,255,255,0.2)]" 
                style={{ backgroundColor: p.color }}
              />
              <span className={`font-bold tracking-wide ${p.id === actualMyPlayer?.id ? 'text-white' : 'text-slate-300'}`}>
                {p.name}
              </span>
              {p.isHost && (
                <span className="text-[9px] font-bold tracking-widest bg-cyan-900/50 text-cyan-300 px-2 py-0.5 rounded-md border border-cyan-500/30">
                  HOST
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {p.isReady ? (
                <div className="flex items-center gap-1.5 text-green-400">
                  <svg className="w-3.5 h-3.5 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  <span className="text-[10px] font-bold tracking-widest drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">READY</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                  <span className="text-[10px] font-bold tracking-widest">WAITING</span>
                </div>
              )}
              {isHost && p.id !== actualMyPlayer?.id && (
                <button
                  onClick={() => handleKick(p.id)}
                  className="text-slate-500 hover:text-red-400 ml-1 transition-colors p-1"
                  title="Kick player"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-[100dvh] bg-black text-white flex flex-col font-sans bg-cover bg-center relative" style={{ backgroundImage: "url('/BGimg.png')" }}>
      
      {/* Top Header */}
      <div className="w-full flex justify-between items-start p-6 z-20">
        
        {/* Left: Server Status */}
        <div className="flex items-center gap-3 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg hidden md:flex">
          <div className="w-4 h-4 rounded-full border-2 border-cyan-400 flex items-center justify-center">
            <div className="w-1.5 h-1.5 bg-cyan-400 rounded-full animate-pulse" />
          </div>
          <div className="text-xs font-semibold tracking-widest text-slate-300">
            SERVER STATUS<br/><span className="text-cyan-400">ONLINE</span>
          </div>
        </div>

        {/* Center: Room Code */}
        <div className="flex flex-col items-center md:absolute md:left-1/2 md:-translate-x-1/2">
          <div className="text-[10px] font-bold tracking-[0.3em] text-[#d4af37] mb-1">
            ROOM CODE
          </div>
          <div className="text-4xl md:text-5xl font-serif font-bold tracking-[0.2em] bg-black/50 backdrop-blur-md px-8 py-2 rounded-2xl border border-cyan-500/30 text-white drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            {roomCode}
          </div>
        </div>

        {/* Right: Leave Button */}
        <button
          onClick={handleLeave}
          className="flex items-center gap-2 bg-red-900/30 hover:bg-red-800/50 backdrop-blur-md px-5 py-2.5 rounded-xl border border-red-500/30 text-red-200 transition-colors shadow-lg group ml-auto"
        >
          <svg className="w-4 h-4 group-hover:-translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
          <span className="text-[10px] font-bold tracking-widest hidden sm:inline">LEAVE MATCH</span>
        </button>

      </div>

      {/* Main Content */}
      <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-6 z-10 flex flex-col gap-6">
        
        {error && (
          <div className="bg-red-900/40 backdrop-blur-md border border-red-500/50 text-red-200 p-4 rounded-xl flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span className="text-sm font-semibold">{error}</span>
            </div>
            <button onClick={handleLeave} className="text-xs font-bold tracking-widest text-red-300 hover:text-white transition-colors">DISMISS</button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-6 flex-1">
          <TeamList teamId="A" teamPlayers={teamA} teamColor="cyan" teamGlow="6,182,212" />
          <div className="hidden md:flex flex-col items-center justify-center opacity-50">
            <div className="w-px h-24 bg-gradient-to-b from-transparent to-slate-500" />
            <div className="text-[10px] font-bold tracking-widest text-slate-400 my-4">VS</div>
            <div className="w-px h-24 bg-gradient-to-t from-transparent to-slate-500" />
          </div>
          <TeamList teamId="B" teamPlayers={teamB} teamColor="purple" teamGlow="168,85,247" />
        </div>

        {/* Bottom Controls */}
        <div className="flex flex-col sm:flex-row items-end justify-between gap-6 pt-4 border-t border-white/10">
          
          {/* Host Settings */}
          <div className="w-full sm:w-auto">
            {isHost ? (
              <div className="bg-black/40 backdrop-blur-md p-5 rounded-2xl border border-white/5 inline-flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /></svg>
                  <span className="text-[10px] font-bold tracking-widest text-[#d4af37]">HOST SETTINGS</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400 font-semibold tracking-wide">MAZE:</span>
                  <div className="flex gap-2 bg-black/60 p-1 rounded-lg border border-white/5">
                    {Object.values(MAZE_TYPE || { STANDARD: 'STANDARD', CAVE: 'CAVE', ARENA: 'ARENA' }).map(type => (
                      <button
                        key={type}
                        onClick={() => handleChangeMazeType(type)}
                        className={`px-3 py-1.5 rounded-md text-[10px] font-bold tracking-widest transition-all ${
                          room.settings?.mazeType === type 
                            ? 'bg-cyan-600 text-white shadow-[0_0_10px_rgba(6,182,212,0.4)]' 
                            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs font-semibold tracking-wider text-slate-500 bg-black/40 px-4 py-2 rounded-xl">
                Waiting for host to start...
              </div>
            )}
          </div>

          {/* Action Button */}
          <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-4">
            {isHost && (
              <button
                onClick={() => socket.emit('DEBUG_ADD_BOT')}
                className="w-full sm:w-auto px-5 py-3 rounded-xl font-bold tracking-widest text-[10px] bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 transition-all border border-purple-500/30"
              >
                + ADD BOT (DEV)
              </button>
            )}
          
            {isHost ? (
              <button 
                onClick={handleStartGame}
                disabled={!isTeamsBalanced}
                className={`w-full sm:w-[250px] relative overflow-hidden group rounded-2xl p-4 flex items-center justify-center transition-all border ${
                  isTeamsBalanced 
                    ? 'bg-gradient-to-r from-[#035848] to-[#047a61] hover:from-[#046e5a] hover:to-[#059676] border-[#0de6b8]/40 shadow-[0_0_30px_rgba(13,230,184,0.4)] cursor-pointer' 
                    : 'bg-slate-800/50 border-slate-600/30 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isTeamsBalanced && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#0de6b8]/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />}
                <div className="text-center relative z-10">
                  <span className={`text-lg font-bold tracking-widest block ${isTeamsBalanced ? 'text-white' : 'text-slate-500'}`}>
                    START GAME
                  </span>
                  {!isTeamsBalanced && <span className="text-[9px] tracking-widest uppercase mt-1 block">Teams Unbalanced</span>}
                </div>
              </button>
            ) : !actualMyPlayer?.isReady ? (
              <button 
                onClick={handleReady}
                className="w-full sm:w-[250px] relative overflow-hidden group bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 border border-blue-400/50 rounded-2xl p-4 flex items-center justify-center transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-400/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                <span className="text-lg font-bold tracking-widest text-white relative z-10 flex items-center gap-2">
                  MARK AS READY <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                </span>
              </button>
            ) : (
              <div className="w-full sm:w-[250px] bg-green-900/30 border border-green-500/30 rounded-2xl p-4 flex flex-col items-center justify-center shadow-[0_0_20px_rgba(74,222,128,0.1)]">
                <span className="text-green-400 font-bold tracking-widest flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg> YOU ARE READY
                </span>
                <span className="text-[10px] text-green-200/50 tracking-widest uppercase mt-1">Waiting for host</span>
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
