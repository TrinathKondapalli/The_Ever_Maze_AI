import React from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { EVENTS } from '../../constants/index.js';

export default function LobbyScreen() {
  const { room, roomCode, error } = useGameStore();

  if (!room) return <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">Loading room...</div>;

  const myPlayer = room.players[socket.id] || Object.values(room.players).find(p => p.id === room.players[Object.keys(room.players)[0]]?.id); 
  // Wait, socket.id is removed in sanitizeRoomForBroadcast! 
  // The room.players object is keyed by socketId from the server.
  // Wait! In helpers.js, sanitizeRoomForBroadcast does:
  // for (const socketId in room.players) { safePlayers[socketId] = sanitizePlayer(room.players[socketId]); }
  // So the keys ARE the socketIds! 
  // Wait, if the keys are socketIds, then myPlayer can be accessed via room.players[socket.id].
  // Yes, because socket.id on the client matches the key. Let's just use room.players[socket.id].

  const actualMyPlayer = room.players[socket.id];
  const isHost = actualMyPlayer?.isHost;
  
  const players = Object.values(room.players);
  const teamA = players.filter(p => p.team === 'A');
  const teamB = players.filter(p => p.team === 'B');
  const allReady = players.length >= 2 && players.every(p => p.isReady);

  const handleReady = () => {
    socket.emit(EVENTS.PLAYER_READY, {});
  };

  const handleSwitchTeam = (team) => {
    socket.emit(EVENTS.SWITCH_TEAM, { team });
  };

  const handleStartGame = () => {
    socket.emit(EVENTS.START_GAME, {});
  };

  const handleLeave = () => {
    socket.emit(EVENTS.LEAVE_ROOM, {});
  };

  const handleKick = (targetPlayerId) => {
    socket.emit(EVENTS.KICK_PLAYER, { targetPlayerId });
  }

  const TeamList = ({ teamId, teamPlayers }) => (
    <div className="bg-slate-800 rounded-lg p-6 flex-1 border border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-cyan-400">Team {teamId}</h2>
        {actualMyPlayer?.team !== teamId && (
          <button 
            onClick={() => handleSwitchTeam(teamId)}
            className="text-sm bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded transition-colors"
          >
            Join
          </button>
        )}
      </div>
      <div className="space-y-3">
        {teamPlayers.length === 0 && <div className="text-slate-500 italic">Empty</div>}
        {teamPlayers.map(p => (
          <div key={p.id} className="flex justify-between items-center bg-slate-900 p-3 rounded">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-200">{p.name}</span>
              {p.isHost && <span className="text-xs bg-cyan-900 text-cyan-300 px-2 py-0.5 rounded-full">HOST</span>}
            </div>
            <div className="flex items-center gap-2">
              {p.isReady ? (
                <span className="text-green-400 font-bold">✓ Ready</span>
              ) : (
                <span className="text-slate-500">Waiting</span>
              )}
              {isHost && p.id !== actualMyPlayer?.id && (
                <button 
                  onClick={() => handleKick(p.id)}
                  className="text-xs text-red-400 hover:text-red-300 ml-2"
                  title="Kick player"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 text-white p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-cyan-400 mb-2">Room Code</h1>
            <div className="text-5xl font-mono tracking-widest text-white bg-slate-800 px-6 py-4 rounded-lg inline-block border border-slate-700">
              {roomCode}
            </div>
          </div>
          <button 
            onClick={handleLeave}
            className="bg-red-900/50 hover:bg-red-800 text-red-200 px-6 py-3 rounded-lg font-bold transition-colors border border-red-900"
          >
            Leave Room
          </button>
        </div>

        {error && <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">{error}</div>}

        <div className="flex flex-col md:flex-row gap-8">
          <TeamList teamId="A" teamPlayers={teamA} />
          <TeamList teamId="B" teamPlayers={teamB} />
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <button 
              onClick={handleReady}
              className={`px-8 py-4 rounded-lg font-bold text-lg transition-all ${
                actualMyPlayer?.isReady 
                  ? 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_15px_rgba(22,163,74,0.5)]' 
                  : 'bg-slate-600 hover:bg-slate-500 text-white'
              }`}
            >
              {actualMyPlayer?.isReady ? 'Ready!' : 'Click to Ready'}
            </button>
            <span className="text-slate-400">
              {players.filter(p => p.isReady).length} / {players.length} Ready
            </span>
          </div>
          
          {isHost && (
            <div className="flex gap-4">
              <button 
                onClick={() => socket.emit('DEBUG_ADD_BOT')}
                className="px-6 py-4 rounded-lg font-bold text-sm bg-purple-600 hover:bg-purple-500 text-white transition-all border border-purple-400"
              >
                + Add Bot (Dev)
              </button>
              <button 
                onClick={handleStartGame}
                disabled={!allReady}
                className={`px-10 py-4 rounded-lg font-bold text-xl transition-all ${
                  allReady 
                    ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-900 shadow-[0_0_20px_rgba(6,182,212,0.6)]' 
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                Start Game
              </button>
            </div>
          )}
          {!isHost && (
            <div className="text-slate-400 italic text-center">
              Waiting for host to start...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
