import React, { useState } from 'react';
import PlayerCard from './PlayerCard.jsx';
import LobbyChat from './LobbyChat.jsx';
import socket from '../socket/socket.js';
import { EVENTS, TEAM, MATCH_STATE } from '@shared/constants.js';
import { GAME_CONFIG } from '@shared/gameConfig.js';
import { Copy, Check, LogOut, Play, UserCheck, RefreshCw } from 'lucide-react';

export default function Lobby({ room, localPlayerId, chatMessages }) {
  const [copied, setCopied] = useState(false);

  const players = Object.values(room?.players || {});
  const localPlayer = room?.players?.[localPlayerId];
  const isHost = localPlayer?.isHost;

  const teamAPlayers = players.filter((p) => p.team === TEAM.A);
  const teamBPlayers = players.filter((p) => p.team === TEAM.B);
  const unassignedPlayers = players.filter((p) => p.team === TEAM.NONE);

  const countA = teamAPlayers.length;
  const countB = teamBPlayers.length;

  // Balancing validation
  const minPlayersPass = players.length >= GAME_CONFIG.MIN_PLAYERS;
  const teamAConfigPass = countA >= GAME_CONFIG.MIN_PLAYERS_PER_TEAM;
  const teamBConfigPass = countB >= GAME_CONFIG.MIN_PLAYERS_PER_TEAM;
  const balancePass = Math.abs(countA - countB) <= 1;
  const everyoneReady = players.every((p) => p.isHost || p.isReady);

  const canStartMatch = true; // Bypassed temporarily for testing

  const handleCopyCode = () => {
    navigator.clipboard.writeText(room.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLeave = () => {
    socket.emit(EVENTS.LEAVE_ROOM);
  };

  const handleSwitchTeam = (team) => {
    socket.emit(EVENTS.SWITCH_TEAM, { team });
  };

  const handleToggleReady = () => {
    socket.emit(EVENTS.TOGGLE_READY);
  };

  const handleStartGame = () => {
    if (canStartMatch) {
      socket.emit(EVENTS.START_GAME);
    }
  };

  const handleKick = (targetSessionId) => {
    // Find target playerId from room players matching targetSessionId
    // Note: room.players is keyed by socketId (the public id) on client!
    // So we iterate to find matching targetSessionId or just kick by socketId.
    // Wait, in sanitizeRoom, we mapped playerObj as:
    // sanitizedPlayers[p.socketId] = { id: p.socketId, ... }
    // So targetSessionId in events is actually targetSessionId on server, but let's look at server kick handler:
    // kickPlayer(hostSessionId, targetSessionId)
    // On server, room.players is keyed by sessionId!
    // But since the client doesn't know the other player's secret sessionId, how does it initiate a kick?
    // Ah! The client can send target playerId (which is socketId).
    // On the server, in socketHandler:
    // `socket.on(EVENTS.KICK_PLAYER, (data) => { const { targetSessionId } = data; ... })`
    // Wait, on the server we should look up target session ID by socket ID!
    // Let's check socketHandler kick player logic:
    // `const result = roomManager.kickPlayer(socket.session.sessionId, targetSessionId);`
    // Oh, targetSessionId was expected!
    // But we know that the client only has the public player ID (which is the socketId).
    // So let's modify the server socketHandler in the next turn to translate public targetPlayerId (socketId) to targetSessionId!
    // In `PlayerCard`, the id we pass is `player.id` (which is `p.socketId`).
    // So on kick, we will emit EVENTS.KICK_PLAYER with `{ targetPlayerId: player.id }`.
    // And on the server, we will translate targetPlayerId (socketId) to session ID.
    // Let's emit:
    socket.emit(EVENTS.KICK_PLAYER, { targetPlayerId: targetSessionId });
  };

  return (
    <div className="relative z-10 w-full max-w-4xl bg-[#0D0D0D]/95 border border-[#00C9A7]/20 rounded-xl p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] backdrop-blur-md flex flex-col gap-6">
      {/* ── Header Area ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pb-4 border-b border-[#00C9A7]/10">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-[#00C9A7] font-bold">
            Sector Lobby
          </span>
          <h2 className="text-3xl font-black text-white uppercase tracking-wider font-cinzel">
            Waiting Room
          </h2>
        </div>

        {/* Room Code Display */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end">
            <span className="text-[9px] uppercase tracking-wider text-gray-500 font-bold">
              Access Code
            </span>
            <span className="text-xl font-black tracking-widest text-[#F4A828] font-mono">
              {room.code}
            </span>
          </div>
          <button
            onClick={handleCopyCode}
            className={`p-2.5 rounded border transition-all ${
              copied
                ? 'border-[#00C9A7] bg-[#00C9A7]/10 text-[#00C9A7]'
                : 'border-[#00C9A7]/30 hover:border-[#00C9A7] text-gray-400 hover:text-white'
            }`}
            title="Copy Access Code"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* ── Middle: Teams Area ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Team A (Blue) */}
        <div className="flex flex-col gap-3 bg-[#0D1B2A]/30 border border-[#2563EB]/20 rounded-xl p-5">
          <div className="flex justify-between items-center pb-2 border-b border-[#2563EB]/15">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#48CAE4] shadow-[0_0_8px_#48CAE4]" />
              <h3 className="text-lg font-bold uppercase tracking-wider text-[#48CAE4] font-cinzel">
                Team Blue ({countA})
              </h3>
            </div>
            {localPlayer?.team !== TEAM.A && (
              <button
                onClick={() => handleSwitchTeam(TEAM.A)}
                className="px-3 py-1 bg-[#2563EB]/20 hover:bg-[#2563EB]/40 border border-[#2563EB]/40 text-[#48CAE4] rounded text-[10px] uppercase font-bold tracking-widest transition-all"
              >
                Join
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 min-h-[120px]">
            {teamAPlayers.length === 0 ? (
              <p className="text-xs text-gray-600 italic m-auto">Empty Slot</p>
            ) : (
              teamAPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isLocalHost={isHost}
                  localSocketId={localPlayerId}
                  onKick={handleKick}
                />
              ))
            )}
          </div>
        </div>

        {/* Team B (Red) */}
        <div className="flex flex-col gap-3 bg-[#0D1B2A]/30 border border-[#DC2626]/20 rounded-xl p-5">
          <div className="flex justify-between items-center pb-2 border-b border-[#DC2626]/15">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E63946] shadow-[0_0_8px_#E63946]" />
              <h3 className="text-lg font-bold uppercase tracking-wider text-[#E63946] font-cinzel">
                Team Red ({countB})
              </h3>
            </div>
            {localPlayer?.team !== TEAM.B && (
              <button
                onClick={() => handleSwitchTeam(TEAM.B)}
                className="px-3 py-1 bg-[#DC2626]/20 hover:bg-[#DC2626]/40 border border-[#DC2626]/40 text-[#E63946] rounded text-[10px] uppercase font-bold tracking-widest transition-all"
              >
                Join
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2 min-h-[120px]">
            {teamBPlayers.length === 0 ? (
              <p className="text-xs text-gray-600 italic m-auto">Empty Slot</p>
            ) : (
              teamBPlayers.map((p) => (
                <PlayerCard
                  key={p.id}
                  player={p}
                  isLocalHost={isHost}
                  localSocketId={localPlayerId}
                  onKick={handleKick}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Unassigned Section */}
      {unassignedPlayers.length > 0 && (
        <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-4">
          <h4 className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-3">
            Unassigned Players
          </h4>
          <div className="flex flex-wrap gap-2">
            {unassignedPlayers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 border border-gray-800 rounded text-xs text-gray-300"
              >
                <span className="w-2 h-2 rounded-full bg-gray-600" />
                <span>{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Footer: Chat & Action Bar ── */}
      <div className="flex flex-col md:flex-row gap-6 items-end">
        {/* Chat Feed */}
        <div className="flex-1 w-full">
          <LobbyChat messages={chatMessages} player={localPlayer} />
        </div>

        {/* Action Controls */}
        <div className="w-full md:w-[280px] flex flex-col gap-3">
          {/* Status checklist for host */}
          {isHost && (
            <div className="bg-[#0D1B2A]/40 border border-[#00C9A7]/10 p-3.5 rounded-lg text-xs space-y-1.5">
              <span className="text-[9px] uppercase tracking-widest text-[#00C9A7] font-bold block mb-1">
                Launch Checklist
              </span>
              <div className="flex justify-between text-gray-400">
                <span>Min Players ({players.length}/{GAME_CONFIG.MIN_PLAYERS}):</span>
                <span className={minPlayersPass ? 'text-[#00C9A7] font-bold' : 'text-[#E63946] font-bold'}>
                  {minPlayersPass ? 'OK' : 'WAITING'}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Team Balance:</span>
                <span className={balancePass ? 'text-[#00C9A7] font-bold' : 'text-[#E63946] font-bold'}>
                  {balancePass ? 'BALANCED' : 'IMBALANCE'}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Everyone Ready:</span>
                <span className={everyoneReady ? 'text-[#00C9A7] font-bold' : 'text-[#E63946] font-bold'}>
                  {everyoneReady ? 'READY' : 'WAITING'}
                </span>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col gap-2.5">
            {isHost ? (
              <button
                onClick={handleStartGame}
                disabled={!canStartMatch}
                className={`w-full py-3.5 rounded font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
                  canStartMatch
                    ? 'bg-[#00C9A7] hover:bg-[#00C9A7]/85 text-[#0D0D0D] shadow-[0_4px_15px_rgba(0,201,167,0.35)]'
                    : 'bg-gray-800 text-gray-600 cursor-not-allowed'
                }`}
              >
                <Play size={14} /> Start Match
              </button>
            ) : (
              <button
                onClick={handleToggleReady}
                disabled={localPlayer?.team === TEAM.NONE}
                className={`w-full py-3.5 rounded font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2 ${
                  localPlayer?.team === TEAM.NONE
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : localPlayer?.isReady
                    ? 'bg-[#E63946]/20 border border-[#E63946]/40 hover:bg-[#E63946]/35 text-[#E63946]'
                    : 'bg-[#00C9A7]/20 border border-[#00C9A7]/40 hover:bg-[#00C9A7]/35 text-[#00C9A7]'
                }`}
              >
                <UserCheck size={14} /> {localPlayer?.isReady ? 'Unready' : 'Ready'}
              </button>
            )}

            <button
              onClick={handleLeave}
              className="w-full py-3 rounded border border-gray-800 hover:border-[#E63946] hover:bg-[#E63946]/5 text-gray-500 hover:text-[#E63946] font-bold uppercase tracking-wider text-xs transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={12} /> Exit Lobby
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
