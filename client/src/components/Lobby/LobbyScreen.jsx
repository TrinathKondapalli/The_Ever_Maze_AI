import React from 'react';
import socket from '../../socket/socket.js';
import { useGameStore } from '../../hooks/useGameStore.js';
import { gameStore } from '../../store/gameStore.js';
import { EVENTS, PLAYER_COLORS, MAZE_TYPE } from '../../constants/index.js';


export default function LobbyScreen() {
  const { room, roomCode, error } = useGameStore();

  const handleLeave = () => {
    socket.emit(EVENTS.LEAVE_ROOM, {});
    // Force-reset the UI immediately regardless of server response
    gameStore.reset();
  };

  if (!room) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-xl text-slate-400">Room not found or you were disconnected.</p>
        <button
          onClick={handleLeave}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-lg font-bold transition-colors"
        >
          Back to Home
        </button>
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

  const handleChangeColor = (color) => {
    socket.emit(EVENTS.CHANGE_COLOR, { color });
  };

  const handleStartGame = () => {
    socket.emit(EVENTS.START_GAME, {});
  };

  const handleKick = (targetPlayerId) => {
    socket.emit(EVENTS.KICK_PLAYER, { targetPlayerId });
  };

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
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: p.color }}></div>
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

        {error && (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={handleLeave}
              className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded font-bold text-sm ml-4"
            >
              Back to Home
            </button>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-8">
          <TeamList teamId="A" teamPlayers={teamA} />
          <TeamList teamId="B" teamPlayers={teamB} />
        </div>

        {isHost && (
          <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col items-start gap-4">
            <h3 className="text-slate-400 font-bold text-sm uppercase">Game Settings (Host Only)</h3>
            <div className="flex flex-col gap-2">
              <label className="text-slate-300 text-sm font-semibold">Maze Type</label>
              <div className="flex gap-2">
                {Object.values(MAZE_TYPE || { STANDARD: 'STANDARD', CAVE: 'CAVE', ARENA: 'ARENA' }).map(type => (
                  <button
                    key={type}
                    onClick={() => handleChangeMazeType(type)}
                    className={`px-4 py-2 rounded font-bold text-sm transition-colors ${room.settings?.mazeType === type ? 'bg-cyan-600 text-white shadow-lg' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col items-start gap-4">
          <h3 className="text-slate-400 font-bold text-sm uppercase">Choose Your Color</h3>
          <div className="flex flex-wrap gap-2">
            {(PLAYER_COLORS || ['#06b6d4', '#f472b6', '#4ade80', '#facc15', '#f87171', '#c084fc', '#fb923c', '#ffffff']).map(color => (
              <button
                key={color}
                onClick={() => handleChangeColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${actualMyPlayer?.color === color ? 'border-white scale-110 shadow-[0_0_10px_rgba(255,255,255,0.5)]' : 'border-transparent opacity-70 hover:opacity-100 hover:scale-105'}`}
                style={{ backgroundColor: color }}
                aria-label={`Select color ${color}`}
              />
            ))}
          </div>
        </div>

        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-6">


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
                disabled={!isTeamsBalanced}
                className={`px-10 py-4 rounded-lg font-bold text-xl transition-all ${
                  isTeamsBalanced
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

      {/* Chat Box */}

    </div>
  );
}
